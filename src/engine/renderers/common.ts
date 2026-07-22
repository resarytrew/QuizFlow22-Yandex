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

/**
 * Даёт сетке ответов роуминг-фокус с клавиатуры (стрелки/Home/End).
 * Не меняет поведение клика — только перемещает фокус между кнопками,
 * что делает одиночный/множественный выбор доступным без мыши.
 */
export function enableRovingFocus(grid: HTMLElement, selector: string): void {
  if (!grid) return;
  const getItems = () => Array.from(grid.querySelectorAll<HTMLElement>(selector));

  grid.addEventListener("keydown", (event) => {
    const arrowKeys = new Set([
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ]);
    if (!arrowKeys.has(event.key)) return;

    const items = getItems();
    if (items.length === 0) return;

    const current = document.activeElement as HTMLElement | null;
    const index = current ? items.indexOf(current) : -1;
    if (index < 0) return;

    event.preventDefault();
    const columns = gridColumnCount(items);
    let next = index;

    switch (event.key) {
      case "ArrowRight":
        next = Math.min(items.length - 1, index + 1);
        break;
      case "ArrowLeft":
        next = Math.max(0, index - 1);
        break;
      case "ArrowDown":
        next = Math.min(items.length - 1, index + columns);
        break;
      case "ArrowUp":
        next = Math.max(0, index - columns);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = items.length - 1;
        break;
      default:
        break;
    }

    items[next]?.focus();
  });
}

function gridColumnCount(items: HTMLElement[]): number {
  if (items.length < 2) return 1;
  const rowTop = items[0].offsetTop;
  let count = 0;
  for (const item of items) {
    if (item.offsetTop === rowTop) count += 1;
    else break;
  }
  return Math.max(1, count);
}
