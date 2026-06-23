/**
 * Подставляет данные квиза и скрипт движка в HTML-шаблон.
 *
 * ВАЖНО: все .replace() используют callback-форму (() => value),
 * а не строку напрямую. String.prototype.replace(pattern, string)
 * интерпретирует $1, $&, $`, $' как спецсимволы, что ломает
 * движок квиза содержащий такие последовательности.
 */

import { injectBeforeBodyClose } from "./htmlInject";

const DATA_PLACEHOLDER = "%%QUIZ_DATA_INJECTION%%";
const SCRIPT_PLACEHOLDER = "%%QUIZ_SCRIPT%%";
const DATA_RE = /%%QUIZ_DATA_INJECTION%%/g;
const SCRIPT_RE = /%%QUIZ_SCRIPT%%/g;

/**
 * Regex-форма, соответствующая обёртке `<script>%%QUIZ_SCRIPT%%</script>`
 * в шаблонах (default/ww2/economic/yandex). Capturing group — содержимое
 * между тегами (только плейсхолдер). В preview-режиме нам нужно
 * заменить ВСЁ это выражение на `<script type="module" src="..."></script>`,
 * иначе останется пустой inline `<script>`, блокируемый строгим CSP.
 */
const SCRIPT_WRAPPED_RE = /<script>\s*%%QUIZ_SCRIPT%%\s*<\/script>/g;
const INLINE_SCRIPT_RE = /<script([^>]*)>([\s\S]*?)<\/script>/gi;

/**
 * URL движка, отдаваемого Vite-middleware (см. vite-plugin-quiz-engine.ts).
 * Используется ТОЛЬКО для live preview (srcdoc iframe в редакторе): родительский
 * CSP запрещает inline-скрипты, поэтому движок грузится как external same-origin
 * module. Для standalone-экспорта (скачиваемый HTML) inline-движок остаётся
 * рабочим вариантом — его собственный CSP разрешает unsafe-inline.
 */
const PREVIEW_ENGINE_URL = "/assets/__quiz_engine.js";
const PREVIEW_TEMPLATE_RUNNER_URL = "/assets/__quiz_template_runner.js";
const EXTERNAL_SCRIPT_RE = /<script\b([^>]*?)\bsrc=["']https?:\/\/[^"']+["'][^>]*>\s*<\/script>/gi;

function encodeInlineScript(source: string): string {
  return JSON.stringify(source)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function externalizeInlineScripts(html: string): {
  html: string;
  count: number;
} {
  let count = 0;
  const result = html.replace(
    INLINE_SCRIPT_RE,
    (fullTag: string, attributes: string, source: string) => {
      if (
        /\bsrc\s*=/i.test(attributes) ||
        /\btype\s*=\s*["']application\/json["']/i.test(attributes) ||
        source.trim().length === 0
      ) {
        return fullTag;
      }

      count += 1;
      return [
        `<script type="application/json" data-quiz-inline-script>`,
        encodeInlineScript(source),
        `</script>`,
      ].join("");
    },
  );

  return { html: result, count };
}

function removeExternalScripts(html: string): string {
  return html.replace(EXTERNAL_SCRIPT_RE, "");
}

export interface RenderOptions {
  /**
   * Live preview: движок подключается как `<script type="module" src="...">`,
   * данные — как `<script type="application/json">`. Inline-скриптов нет,
   * совместимо со строгим CSP родительской страницы.
   *
   * Standalone export (default): движок встраивается inline (как `<script>`),
   * данные — как `var quizData = ...` или `<script type="application/json">`.
   * Self-contained файл, который открывается в браузере без сервера.
   */
  readonly preview?: boolean;
}

export function renderTemplate(
  templateHtml: string,
  quizDataJson: string,
  engineScript: string,
  options: RenderOptions = {},
): string {
  // ⚠️ Проверяем ДО замены — после replace плейсхолдеров уже нет
  const hasData = templateHtml.includes(DATA_PLACEHOLDER);
  const hasScript = templateHtml.includes(SCRIPT_PLACEHOLDER);

  let html = templateHtml;

  if (options.preview) {
    // ── LIVE PREVIEW (srcdoc iframe, строгий родительский CSP) ───────
    //
    // 1) Данные: `<script type="application/json" id="quiz-data">`.
    //    Не исполняется браузером, безопасно, не требует unsafe-inline.
    // 2) Движок: `<script type="module" src="/__quiz_engine.js">`.
    //    External same-origin module — разрешён `script-src 'self'`
    //    и в родительской CSP, и в iframe meta CSP.
    //
    // Callback-форма предотвращает интерпретацию $1, $&, $$, $` и т.д.
    if (hasData) {
      html = html.replace(DATA_RE, () => quizDataJson);
    } else {
      html = injectBeforeBodyClose(
        html,
        [
          `    <script id="quiz-data" type="application/json">`,
          `      ${quizDataJson}`,
          `    </script>`,
        ].join("\n"),
      );
    }

    html = removeExternalScripts(html);

    if (hasScript) {
      // Шаблон может содержать как просто `%%QUIZ_SCRIPT%%`, так и
      // обёртку `<script>%%QUIZ_SCRIPT%%</script>`. В первом случае
      // достаточно заменить плейсхолдер на module-тег; во втором —
      // нужно заменить ВСЮ обёртку, иначе останется пустой inline
      // `<script>...</script>`, который CSP родительской страницы
      // заблокирует (script-src-elem, about:srcdoc).
      const moduleTag = `<script type="module" src="${PREVIEW_ENGINE_URL}"></script>`;
      // Сначала заменяем обёрнутую форму (если есть), затем — оставшиеся
      // голые плейсхолдеры (если шаблон использует только `%%QUIZ_SCRIPT%%`).
      html = html.replace(SCRIPT_WRAPPED_RE, () => moduleTag);
      html = html.replace(SCRIPT_RE, () => moduleTag);
    } else {
      const externalized = externalizeInlineScripts(html);
      html = externalized.html;

      html = injectBeforeBodyClose(
        html,
        externalized.count > 0
          ? `    <script type="module" src="${PREVIEW_TEMPLATE_RUNNER_URL}"></script>`
          : `    <script type="module" src="${PREVIEW_ENGINE_URL}"></script>`,
      );
    }

    return html;
  }

  // ── STANDALONE EXPORT (скачиваемый HTML) ────────────────────────────
  //
  // Self-contained: движок и данные встроены inline. Собственный CSP
  // standalone-файла разрешает unsafe-inline, так что inline-скрипты
  // работают. Файл открывается оффлайн без сервера.
  //
  // ⚠️ ВАЖНО: сначала вставляем данные и/или скрипт ПЕРЕД </body>,
  // и только потом — заменяем плейсхолдер %%QUIZ_SCRIPT%%.
  // Иначе DOMPurify source (внутри движка) содержит '</body></html>'
  // в JS-строке, и injectBeforeBodyClose ниже найдёт ПЕРВЫЙ </body>
  // в DOMPurify-коде, а не в template.
  if (hasData) {
    html = html.replace(DATA_RE, () => quizDataJson);
  }

  if (!hasData) {
    html = injectBeforeBodyClose(
      html,
      [
        `    <script id="quiz-data" type="application/json">`,
        `      ${quizDataJson}`,
        `    </script>`,
      ].join("\n"),
    );
  }

  if (hasScript) {
    html = html.replace(SCRIPT_RE, () => engineScript);
  }

  if (!hasScript) {
    html = injectBeforeBodyClose(
      html,
      [`    <script>`, `      ${engineScript}`, `    </script>`].join("\n"),
    );
  }

  return html;
}
