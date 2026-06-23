export function createActionButton(
  text: string,
  handler: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn action-btn";
  button.textContent = text;
  button.addEventListener("click", handler);
  return button;
}
