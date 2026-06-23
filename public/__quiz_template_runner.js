const scriptNodes = document.querySelectorAll(
  'script[type="application/json"][data-quiz-inline-script]',
);

for (const scriptNode of scriptNodes) {
  try {
    const source = JSON.parse(scriptNode.textContent || '""');
    Function(source)();
  } catch (error) {
    console.error("[Поток] Failed to start template script", error);
  }
}
