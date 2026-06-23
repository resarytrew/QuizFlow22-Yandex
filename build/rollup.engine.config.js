import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/engine/index.ts",
  output: {
    file: ".generated/quizEngine.iife.js",
    format: "iife",
    name: "_quizEngine",
    sourcemap: true,
  },
  plugins: [
    typescript({
      tsconfig: "src/engine/tsconfig.engine.json",
    }),
    terser({
      compress: { drop_console: false },
      mangle: false,
    }),
  ],
};
