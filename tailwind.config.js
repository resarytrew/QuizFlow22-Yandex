/** @type {import('tailwindcss').Config} */
export default {
  // Сканируем разметку приложения. Строки с классами в .ts/.tsx тоже учитываются
  // (Tailwind ищет литералы классов в тексте файлов).
  content: [
    './index.html',
    './play.html',
    './index.tsx',
    './play.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}',
    './data/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
