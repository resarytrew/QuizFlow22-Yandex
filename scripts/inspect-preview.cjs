const fs = require("fs");
const path = require("path");

let code = fs.readFileSync(path.resolve(__dirname, ".gen.cjs"), "utf8");
code = code.replace(
  "var import_meta = {};",
  `var import_meta = { env: {
    VITE_SUPABASE_URL: "https://test.supabase.co",
    VITE_SUPABASE_ANON_KEY: "anon-test-key",
  } };`
);
code = code.replace(
  "var DOMPURIFY_SOURCE = ",
  "var DOMPURIFY_SOURCE = 'var DUMMY=1;'; var __DUMMY_DOMPURIFY = "
);
const tmpPath = path.resolve(__dirname, ".gen2.cjs");
fs.writeFileSync(tmpPath, code);
const g = require(tmpPath);
const html = g.generateQuizHtml(
  {
    nodes: [
      { id: "start-1", type: "startNode", position: { x: 0, y: 0 }, data: { label: "Старт" } },
      { id: "text-1", type: "textNode", position: { x: 0, y: 100 }, data: { title: "Привет", description: "Тест", buttonText: "Далее" } },
    ],
    edges: [],
    templateId: "default",
    quizId: null,
    currentQuizName: "Test",
  },
  { preview: true }
);
fs.writeFileSync(path.resolve(__dirname, ".preview.html"), html);
console.log("Length:", html.length);
const scripts = html.match(/<script[^>]*>/g) || [];
console.log("Script tags:", scripts.length);
scripts.forEach((s) => console.log(" ", s.substring(0, 250)));
