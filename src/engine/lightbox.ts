import { sanitizeAssetUrl } from "./sanitize";

let escapeHandlerInstalled = false;

function getLightbox(): { modal: HTMLElement; image: HTMLImageElement } | null {
  const modal = document.getElementById("image-modal");
  const image = document.getElementById("modal-img-src");
  if (!(modal instanceof HTMLElement) || !(image instanceof HTMLImageElement)) {
    return null;
  }

  if (modal.dataset.quizLightboxReady !== "true") {
    modal.dataset.quizLightboxReady = "true";
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeImageLightbox();
    });
    image.addEventListener("click", (event) => event.stopPropagation());
  }

  if (!escapeHandlerInstalled) {
    escapeHandlerInstalled = true;
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeImageLightbox();
    });
  }

  return { modal, image };
}

export function openImageLightbox(url: unknown, alt = ""): void {
  const safeUrl = sanitizeAssetUrl(url);
  const lightbox = getLightbox();
  if (!safeUrl || !lightbox) return;

  lightbox.image.src = safeUrl;
  lightbox.image.alt = alt;
  lightbox.modal.classList.add("open");
  lightbox.modal.style.display = "flex";
  lightbox.modal.setAttribute("aria-hidden", "false");
}

export function closeImageLightbox(): void {
  const lightbox = getLightbox();
  if (!lightbox) return;

  lightbox.modal.classList.remove("open");
  lightbox.modal.style.display = "none";
  lightbox.modal.setAttribute("aria-hidden", "true");
}

export function makeImageZoomable(
  image: HTMLImageElement,
  url: unknown,
  alt = "",
): void {
  const safeUrl = sanitizeAssetUrl(url);
  if (!safeUrl) return;

  image.classList.add("quiz-zoomable-image");
  image.tabIndex = 0;
  image.setAttribute("role", "button");
  image.setAttribute(
    "aria-label",
    alt ? `Увеличить изображение: ${alt}` : "Увеличить изображение",
  );
  image.style.cursor = "zoom-in";

  const open = (event: Event) => {
    event.stopPropagation();
    openImageLightbox(safeUrl, alt);
  };
  image.addEventListener("click", open);
  image.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open(event);
    }
  });
}
