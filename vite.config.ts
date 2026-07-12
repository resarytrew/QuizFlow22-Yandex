import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { quizEnginePlugin } from './vite-plugin-quiz-engine';
import { replaceInlineScriptCspMarker } from './utils/viteCsp';

function reactRefreshCspPlugin(): Plugin {
  return {
    name: 'potok-react-refresh-csp',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return replaceInlineScriptCspMarker(
          html,
          '__VITE_REACT_REFRESH_CSP__',
        );
      },
    },
  };
}

function localAiProxyPlugin(env: Record<string, string>): Plugin {
  const openRouterKey = env.OPENROUTER_API_KEY || env.OPEN_ROUTES_API_KEY || '';
  const allowedModels = (env.AI_PROXY_ALLOWED_MODELS ||
    'openai/gpt-4o-mini,openai/gpt-4o,google/gemini-flash-1.5,google/gemini-3-flash-preview,anthropic/claude-3-haiku')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  const defaultModel = env.AI_PROXY_DEFAULT_MODEL || allowedModels[0] || 'openai/gpt-4o-mini';
  const maxTokens = Number(env.AI_PROXY_MAX_TOKENS || '16000');

  return {
    name: 'potok-local-ai-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/ai-proxy', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        if (!openRouterKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'OPENROUTER_API_KEY is not configured in .env' }));
          return;
        }

        try {
          const rawBody = await readRequestBody(req);
          const requestBody = JSON.parse(rawBody || '{}');
          const prompt = requestBody.prompt;

          if (typeof prompt !== 'string' || prompt.trim().length === 0) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'prompt is required' }));
            return;
          }

          const requestedModel = typeof requestBody.model === 'string' ? requestBody.model : '';
          const model = allowedModels.includes(requestedModel) ? requestedModel : defaultModel;
          const wantsJson = Boolean(requestBody.expectJson) || requestBody.type === 'json';
          const upstreamBody: Record<string, unknown> = {
            model,
            messages: [
              {
                role: 'system',
                content: wantsJson
                  ? 'You are an assistant for building quizzes. Return only valid JSON, without Markdown fences or explanations.'
                  : 'You are an assistant for building quizzes. Be concise and practical.',
              },
              { role: 'user', content: prompt },
            ],
            max_tokens: maxTokens,
            stream: false,
          };

          if (typeof requestBody.temperature === 'number' && Number.isFinite(requestBody.temperature)) {
            upstreamBody.temperature = Math.max(0, Math.min(2, requestBody.temperature));
          }

          const upstreamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': env.AI_PROXY_REFERER || env.VITE_SITE_URL || 'http://127.0.0.1:3000',
              'X-Title': env.AI_PROXY_TITLE || 'Potok',
            },
            body: JSON.stringify(upstreamBody),
          });

          if (!upstreamResponse.ok) {
            const errorText = await upstreamResponse.text();
            console.error('[local-ai-proxy] OpenRouter error:', upstreamResponse.status, errorText);
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'AI service error' }));
            return;
          }

          const data = await upstreamResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
          res.statusCode = 200;
          res.end(JSON.stringify({
            result: data.choices?.[0]?.message?.content || '',
            used: 1,
            limit: 9999,
            model,
          }));
        } catch (error) {
          console.error('[local-ai-proxy] error:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

function readRequestBody(req: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/',
      server: {
        port: 3000,
        // host intentionally omitted: do NOT bind 0.0.0.0 by default in
        // production builds. Pass --host 0.0.0.0 explicitly only when
        // running behind a trusted reverse proxy in a private network.
        // Allowing LAN-wide binding by default exposes the dev server
        // (with HMR websocket) to anyone on the same network.
      },
      plugins: [react(), reactRefreshCspPlugin(), localAiProxyPlugin(env), quizEnginePlugin()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
        // Не вставлять inline-полифилл modulePreload, чтобы CSP мог запретить
        // inline-скрипты (script-src без 'unsafe-inline'). Современные браузеры
        // поддерживают modulepreload нативно.
        modulePreload: { polyfill: false },
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            play: path.resolve(__dirname, 'play.html'),
          },
          output: {
            // Split heavy vendor bundles so the main bundle stays small.
            // First-paint critical code is unchanged; only the cache
            // granularity improves. Long-tail deps land in their own
            // chunks that can be loaded in parallel.
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-flow': [
                'reactflow',
                'dagre',
              ],
              'vendor-supabase': [
                '@supabase/supabase-js',
              ],
              'vendor-utils': [
                'clsx',
                'canvas-confetti',
                'zustand',
              ],
            },
          },
        },
      },
    };
});
