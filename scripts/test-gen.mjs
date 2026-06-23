import * as esbuild from "esbuild";
import * as path from "node:path";
import * as fs from "node:fs";

const out = await esbuild.build({
  entryPoints: [path.resolve("services/quizGenerator/index.ts")],
  bundle: true,
  format: "cjs",
  platform: "node",
  write: false,
  target: "es2020",
  loader: { ".css": "empty" },
  plugins: [
    {
      name: "empty-css",
      setup(build) {
        build.onResolve({ filter: /\.css\?inline$/ }, () => ({ path: "empty.css", namespace: "empty" }));
        build.onResolve({ filter: /\.css\?raw$/ }, () => ({ path: "empty.css", namespace: "empty" }));
        build.onResolve({ filter: /\.css$/ }, () => ({ path: "empty.css", namespace: "empty" }));
        build.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export default '';", loader: "js" }));
      },
    },
  ],
  define: { "process.env.NODE_ENV": '"development"' },
  logLevel: "silent",
});

fs.writeFileSync("scripts/.gen.cjs", out.outputFiles[0].text);
console.log("Built", out.outputFiles[0].text.length, "bytes");
