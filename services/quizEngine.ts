import bundledQuizEngine from "../.generated/quizEngine.iife.js?raw";

/**
 * Single-source quiz runtime.
 *
 * The implementation lives in `src/engine` and is bundled by
 * `npm run build:engine`. Standalone HTML embeds this IIFE as text.
 */
export const quizEngineScript = bundledQuizEngine;
