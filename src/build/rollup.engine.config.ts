// build/rollup.engine.config.ts
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/engine/index.ts",
  output: {
    file: ".generated/quizEngine.iife.js",
    format: "iife", // Самоисполняющаяся функция
    name: "_quizEngine", // Не нужен, но Rollup требует
    sourcemap: true, // Для отладки
  },
  plugins: [
    typescript({
      tsconfig: "src/engine/tsconfig.engine.json",
    }),
    terser({
      // Минификация для production
      compress: { drop_console: false },
    }),
  ],
};
