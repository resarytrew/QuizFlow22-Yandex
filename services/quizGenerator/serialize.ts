/**
 * @module quizGenerator/serialize
 *
 * Безопасная сериализация данных для встраивания в HTML.
 *
 * Обычный JSON.stringify() внутри <script> опасен:
 * - `</script>` в строке закрывает тег
 * - `<!--` открывает HTML-комментарий
 * - U+2028 / U+2029 разрывают JS-строку в старых движках
 *
 * @see https://html.spec.whatwg.org/multipage/scripting.html#restrictions-for-contents-of-script-elements
 */

/**
 * Сериализует значение в JSON, безопасный для inline-вставки
 * внутри `<script>` или `<script type="application/json">`.
 *
 * @throws {Error} Если значение не сериализуемо (circular refs и т.д.)
 */
export function serializeForHtmlScript(value: unknown): string {
  const json = JSON.stringify(value);

  if (json === undefined) {
    throw new Error(
      "[quizGenerator/serialize] JSON.stringify returned undefined — value is not serializable",
    );
  }

  return json
    .replace(/</g, "\\u003c")    // Предотвращает </script>, <!--
    .replace(/>/g, "\\u003e")    // Симметрично
    .replace(/&/g, "\\u0026")    // Предотвращает &amp; double-encoding
    .replace(/\u2028/g, "\\u2028") // Line separator
    .replace(/\u2029/g, "\\u2029"); // Paragraph separator
}

/**
 * Сериализует значение для вставки в `<script type="application/json">`.
 * Контент такого тега не исполняется браузером, но `</script>` всё равно
 * ломает HTML-парсер, поэтому экранирование необходимо.
 */
export function serializeForJsonBlock(value: unknown): string {
  return serializeForHtmlScript(value);
}