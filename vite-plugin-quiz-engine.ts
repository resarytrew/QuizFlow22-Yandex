import type { Plugin, ResolvedConfig } from "vite";
import * as esbuild from "esbuild";
import * as path from "node:path";
import * as fs from "node:fs";

/**
 * Vite plugin: serves the quiz engine as a static, same-origin script.
 *
 * Why this exists
 * ---------------
 * The LivePreview component embeds the generated HTML in a `srcdoc` iframe
 * (`sandbox="allow-scripts allow-same-origin"`). The parent page's CSP
 * restricts inline scripts (`script-src 'self'` — no `unsafe-inline`).
 * Even though the iframe has its own CSP `<meta>` allowing `unsafe-inline`,
 * Chromium intersects it with the parent's CSP, and inline scripts in the
 * iframe get blocked. The user sees the template render but the engine
 * never boots.
 *
 * Fix: serve the engine as an external file. The iframe loads it as
 * `<script type="module" src="/__quiz_engine.js">` — `'self'` is allowed
 * by both the parent's CSP and the iframe's own meta. No inline script
 * needs `unsafe-inline`.
 *
 * The plugin bundles the same `src/engine/index.ts` entry that Rollup
 * uses for standalone HTML. Preview therefore has no second engine
 * implementation and does not need `new Function`.
 */
const ENGINE_URLS = ["/__quiz_engine.js", "/assets/__quiz_engine.js"] as const;
const ENGINE_OUTPUT_FILES = ["__quiz_engine.js", "assets/__quiz_engine.js"] as const;
const ENGINE_ENTRY = path.resolve(process.cwd(), "src", "engine", "index.ts");

export function quizEnginePlugin(): Plugin {
  let resolvedConfig: ResolvedConfig | null = null;

  async function getEngineCode(): Promise<string> {
    const result = await esbuild.build({
      entryPoints: [ENGINE_ENTRY],
      bundle: true,
      format: "esm",
      write: false,
      target: "es2020",
      loader: { ".js": "js", ".ts": "ts" },
      define: {
        "process.env.NODE_ENV": JSON.stringify(
          resolvedConfig?.mode === "production" ? "production" : "development",
        ),
      },
      // Vite-specific `?raw` import suffix → esbuild native `text` loader.
      // `services/dompurify-bundle.ts` does
      //   import dompurifySource from 'dompurify/dist/purify.min.js?raw';
      // expecting a string. esbuild treats the `?raw` path as a normal
      // UMD module and resolves it to the live DOMPurify function,
      // breaking engine init. The plugin below rewrites the path
      // (stripping `?raw`) and tells esbuild to use the `text` loader.
      plugins: [
        {
          name: "potok-raw-import",
          setup(build) {
            build.onResolve(
              { filter: /\?raw$/, namespace: "file" },
              async (args) => {
                const stripped = args.path.replace(/\?raw$/, "");
                const result = await build.resolve(stripped, {
                  resolveDir: args.resolveDir,
                  kind: args.kind,
                });
                if (result.errors.length > 0) {
                  return { errors: result.errors };
                }
                return { path: result.path, namespace: "raw-file" };
              },
            );
            build.onLoad(
              { filter: /.*/, namespace: "raw-file" },
              (args) => {
                const contents = fs.readFileSync(args.path, "utf8");
                return {
                  contents,
                  loader: "text",
                  resolveDir: path.dirname(args.path),
                };
              },
            );
          },
        },
      ],
      logLevel: "silent",
    });

    const code = result.outputFiles?.[0]?.text;
    if (!code) throw new Error("esbuild produced no output for quizEngine");

    return code;
  }

  return {
    name: "potok-quiz-engine",
    configResolved(config) {
      resolvedConfig = config;
    },
    async generateBundle() {
      try {
        const code = await getEngineCode();
        for (const fileName of ENGINE_OUTPUT_FILES) {
          this.emitFile({
            type: "asset",
            fileName,
            source: code,
          });
        }
      } catch (error) {
        this.error(
          `[potok-quiz-engine] failed to emit production preview engine: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const pathname = req.url.split("?")[0];
        if (!ENGINE_URLS.some((url) => pathname.endsWith(url))) return next();
        try {
          const code = await getEngineCode();
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache");
          res.end(code);
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          res.end(`/* quiz-engine load failed: ${(e as Error).message} */`);
        }
      });
    },
  };
}
