const screenQuizTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Экранная викторина</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Rubik+Mono+One&family=Russo+One&family=Nunito:wght@800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --sq-bg: #9a4bdb;
      --sq-bg-image: none;
      --sq-accent: #ffc928;
      --sq-accent-2: #7c5ce7;
      --sq-panel: #f2eef5;
      --sq-answer: #f0eeee;
      --sq-ink: #050305;
      --sq-correct: #15bf00;
      --sq-border: 8px;
      --sq-radius: 54px;
      --sq-decor: 1;
      --sq-duration: 30s;
      --sq-motion-scale: 1;
    }

    * { box-sizing: border-box; }

    html,
    body {
      width: 100%;
      min-height: 100%;
      margin: 0;
      overflow: hidden;
      background: var(--sq-bg);
      color: var(--sq-ink);
      font-family: "Nunito", system-ui, sans-serif;
    }

    body {
      display: grid;
      place-items: center;
      background-image:
        radial-gradient(circle at 10% 12%, rgba(255,255,255,0.2), transparent 14rem),
        radial-gradient(circle at 88% 18%, rgba(255, 207, 40, 0.36), transparent 18rem),
        var(--sq-bg-image);
      background-size: cover;
      background-position: center;
    }

    .sq-shell {
      width: 100vw;
      height: 100dvh;
      display: grid;
      place-items: center;
      position: relative;
      isolation: isolate;
      background:
        linear-gradient(90deg, rgba(87, 24, 143, 0.62), rgba(255, 146, 192, 0.12) 37%, rgba(255, 188, 62, 0.12) 66%, rgba(93, 23, 136, 0.58)),
        var(--sq-bg-image);
      background-size: cover;
      background-position: center;
    }

    .sq-shell::before,
    .sq-shell::after {
      content: "";
      position: absolute;
      inset: -8%;
      z-index: -2;
      pointer-events: none;
      opacity: calc(0.78 * var(--sq-decor));
      transform: translate3d(0,0,0);
    }

    .sq-shell::before {
      background:
        radial-gradient(circle at 72% -1%, transparent 0 4.2rem, rgba(255, 212, 51, 0.92) 4.28rem 7.4rem, transparent 7.52rem),
        radial-gradient(circle at 98% 7%, #7d20c7 0 7.1rem, transparent 7.22rem),
        radial-gradient(circle at -2% 7%, #7f28bb 0 7.5rem, transparent 7.62rem),
        radial-gradient(circle at 97% 36%, #f04c9a 0 4.8rem, transparent 4.94rem),
        linear-gradient(105deg, transparent 0 41%, rgba(41, 37, 47, 0.68) 41.2% 43.4%, transparent 43.6%),
        linear-gradient(140deg, transparent 0 35%, rgba(255, 218, 121, 0.48) 35.2% 58%, transparent 58.2%),
        radial-gradient(circle at 38% 78%, rgba(255, 182, 86, 0.45) 0 12rem, transparent 12.2rem);
      animation: sqDrift calc(24s / var(--sq-motion-scale)) ease-in-out infinite alternate;
    }

    .sq-shell::after {
      background-image:
        radial-gradient(circle, rgba(255,255,255,0.82) 0 0.24rem, transparent 0.3rem),
        repeating-linear-gradient(135deg, transparent 0 1.25rem, rgba(5,3,5,0.16) 1.32rem 1.48rem, transparent 1.56rem 2.55rem),
        repeating-linear-gradient(90deg, transparent 0 2rem, rgba(255,255,255,0.16) 2.04rem 2.18rem);
      background-size: 3rem 3rem, 10rem 10rem, 4rem 4rem;
      mask-image: radial-gradient(circle at 14% 82%, black 0 16rem, transparent 20rem), radial-gradient(circle at 92% 15%, black 0 15rem, transparent 19rem), radial-gradient(circle at 98% 64%, black 0 12rem, transparent 15rem);
      animation: sqFloat calc(16s / var(--sq-motion-scale)) ease-in-out infinite alternate;
    }

    .sq-stage {
      width: 100vw;
      height: 100dvh;
      aspect-ratio: auto;
      position: relative;
      overflow: visible;
      padding: 0;
      opacity: 0;
      transform: scale(0.975) translateY(12px);
      animation: sqStageIn 760ms cubic-bezier(.16,1,.3,1) forwards;
    }

    .sq-frame {
      position: absolute;
      inset: 5.25% 4.1% 4.8%;
      border: var(--sq-border) solid var(--sq-ink);
      border-radius: calc(var(--sq-radius) * 1.35);
      background: rgba(222, 204, 240, 0.55);
      box-shadow: 0 10px 0 rgba(5,3,5,0.28);
      pointer-events: none;
    }

    .sq-frame::before,
    .sq-frame::after {
      content: "";
      position: absolute;
      width: clamp(2rem, 3.2vw, 4rem);
      aspect-ratio: 1;
      border: calc(var(--sq-border) * 0.9) solid var(--sq-ink);
      border-radius: 999px;
      pointer-events: none;
    }

    .sq-frame::before {
      left: -1.9%;
      top: -2.1%;
      background: #7c1618;
    }

    .sq-frame::after {
      right: 5.6%;
      top: 12%;
      background: #5db94e;
      box-shadow: -82vw 77vh 0 -0.08rem #3bc0c7;
    }

    .sq-shell[data-preset="none"] {
      background: var(--sq-bg-image), var(--sq-bg);
      background-size: cover;
      background-position: center;
    }

    .sq-shell[data-preset="none"]::before,
    .sq-shell[data-preset="none"]::after {
      display: none;
    }

    .sq-badge {
      position: absolute;
      top: 2.15%;
      left: 50%;
      min-width: 13.2%;
      max-width: 32%;
      transform: translateX(-50%);
      border: calc(var(--sq-border) * 0.72) solid var(--sq-ink);
      background: var(--sq-accent);
      padding: 0.72% 1.3% 0.64%;
      text-align: center;
      font-family: "Rubik Mono One", "Russo One", sans-serif;
      font-size: clamp(0.82rem, 1.38vw, 1.7rem);
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 9px 0 rgba(5,3,5,0.22);
      z-index: 8;
    }

    .sq-scene {
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 1.6%;
    }

    .sq-scene::before,
    .sq-scene::after {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 20;
      pointer-events: none;
      opacity: 0;
      border-radius: calc(var(--sq-radius) * 1.05);
    }

    .sq-scene[data-answer-count="4"] {
      grid-template-rows: minmax(0, 1fr) minmax(0, 8.8%);
      gap: 0.7%;
    }

    .sq-content {
      min-height: 0;
      display: grid;
      align-content: stretch;
      gap: 2.4%;
      padding: 4.1% 5.2% 0;
    }

    .sq-content.media-right,
    .sq-content.media-left {
      grid-template-columns: minmax(0, 1.95fr) minmax(360px, 1fr);
      align-items: start;
      gap: 4.35%;
      padding: 6.55% 10.8% 0 10.7%;
    }

    .sq-content.media-left {
      grid-template-columns: minmax(360px, 1fr) minmax(0, 1.95fr);
      padding: 6.55% 10.7% 0 10.8%;
    }

    .sq-content.media-top {
      grid-template-rows: minmax(15rem, 42%) minmax(0, 1fr);
      align-content: stretch;
      padding: 4.35% 5.95% 0;
    }

    .sq-content.hero-media {
      align-content: center;
      justify-items: center;
    }

    .sq-content.story-scene {
      place-items: center;
      align-content: center;
      padding: 7.4% 10.2% 2.2%;
    }

    .sq-story-card {
      position: relative;
      width: min(100%, 78rem);
      min-height: clamp(25rem, 58dvh, 40rem);
      display: grid;
      grid-template-columns: minmax(0, 1.18fr) minmax(17rem, 0.82fr);
      gap: clamp(1.4rem, 3vw, 3.5rem);
      align-items: stretch;
      border: var(--sq-border) solid var(--sq-ink);
      border-radius: calc(var(--sq-radius) * 0.9);
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--sq-panel) 88%, #fff) 0%, var(--sq-panel) 100%);
      box-shadow: 0 14px 0 rgba(5,3,5,0.18), 0 28px 80px rgba(5,3,5,0.22);
      overflow: hidden;
      isolation: isolate;
      animation: sqPopIn 620ms cubic-bezier(.18,1.42,.32,1) both;
    }

    .sq-story-card::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: -2;
      opacity: 0.72;
      background:
        radial-gradient(circle at 16% 18%, color-mix(in srgb, var(--sq-accent) 38%, transparent) 0 11rem, transparent 11.4rem),
        radial-gradient(circle at 88% 18%, color-mix(in srgb, var(--sq-accent-2) 42%, transparent) 0 9rem, transparent 9.4rem),
        repeating-linear-gradient(0deg, rgba(5,3,5,0.045) 0 2px, transparent 2px 18px);
    }

    .sq-story-card::after {
      content: "";
      position: absolute;
      inset: clamp(0.65rem, 1vw, 1.15rem);
      border: calc(var(--sq-border) * 0.36) dashed color-mix(in srgb, var(--sq-ink) 44%, transparent);
      border-radius: calc(var(--sq-radius) * 0.66);
      pointer-events: none;
    }

    .sq-story-copy {
      min-width: 0;
      display: grid;
      align-content: center;
      gap: clamp(1rem, 2dvh, 1.7rem);
      padding: clamp(2rem, 4vw, 4.7rem);
      z-index: 1;
    }

    .sq-story-kicker {
      width: fit-content;
      display: inline-grid;
      place-items: center;
      border: calc(var(--sq-border) * 0.5) solid var(--sq-ink);
      border-radius: 999px;
      background: var(--sq-accent);
      padding: 0.55rem 1.1rem 0.48rem;
      font-family: "Rubik Mono One", "Russo One", sans-serif;
      font-size: clamp(0.78rem, 1.15vw, 1.22rem);
      line-height: 1;
      text-transform: uppercase;
      box-shadow: 0 6px 0 rgba(5,3,5,0.16);
    }

    .sq-story-title {
      margin: 0;
      max-width: 14ch;
      font-family: "Russo One", "Nunito", sans-serif;
      font-size: clamp(2.15rem, 4.45vw, 6.1rem);
      line-height: 0.98;
      letter-spacing: 0;
      text-transform: uppercase;
      text-wrap: balance;
    }

    .sq-story-body {
      margin: 0;
      max-width: 62ch;
      font-family: "Nunito", system-ui, sans-serif;
      font-size: clamp(1.18rem, 1.55vw, 2rem);
      line-height: 1.24;
      font-weight: 900;
      white-space: pre-line;
    }

    .sq-story-points {
      display: grid;
      gap: 0.62rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .sq-story-point {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: 0.75rem;
      font-size: clamp(1rem, 1.25vw, 1.55rem);
      line-height: 1.16;
      font-weight: 1000;
      text-transform: uppercase;
    }

    .sq-story-point::before {
      content: "";
      width: clamp(0.75rem, 1.05vw, 1.1rem);
      aspect-ratio: 1;
      border: calc(var(--sq-border) * 0.32) solid var(--sq-ink);
      border-radius: 999px;
      background: var(--sq-accent-2);
      box-shadow: 0 3px 0 rgba(5,3,5,0.18);
    }

    .sq-story-visual {
      position: relative;
      min-width: 0;
      min-height: 0;
      display: grid;
      place-items: center;
      padding: clamp(1.2rem, 2.2vw, 2.4rem);
      background:
        linear-gradient(160deg, color-mix(in srgb, var(--sq-accent) 22%, #fff) 0%, color-mix(in srgb, var(--sq-accent-2) 22%, #fff) 100%);
      border-left: var(--sq-border) solid var(--sq-ink);
      overflow: hidden;
    }

    .sq-story-visual img {
      width: 100%;
      height: 100%;
      max-height: 31rem;
      object-fit: cover;
      object-position: center;
      border: calc(var(--sq-border) * 0.58) solid var(--sq-ink);
      border-radius: calc(var(--sq-radius) * 0.5);
      box-shadow: 0 10px 0 rgba(5,3,5,0.16);
      background: #fff;
    }

    .sq-story-emblem {
      position: relative;
      width: min(78%, 19rem);
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      border: var(--sq-border) solid var(--sq-ink);
      border-radius: 999px;
      background:
        radial-gradient(circle at 50% 50%, #fff 0 38%, transparent 39%),
        conic-gradient(from -18deg, var(--sq-accent), #fff1a8, var(--sq-accent-2), var(--sq-accent));
      box-shadow: 0 12px 0 rgba(5,3,5,0.18);
      font-family: "Rubik Mono One", "Russo One", sans-serif;
      font-size: clamp(4rem, 8vw, 9.5rem);
      line-height: 1;
      color: var(--sq-ink);
    }

    .sq-story-emblem::after {
      content: "";
      position: absolute;
      width: 54%;
      aspect-ratio: 1;
      border: calc(var(--sq-border) * 0.34) dashed rgba(5,3,5,0.45);
      border-radius: 999px;
      animation: sqStorySpin 12s linear infinite;
    }

    .sq-feedback-card {
      grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--sq-correct) 18%, var(--sq-panel)) 0%, var(--sq-panel) 62%, color-mix(in srgb, var(--sq-accent) 18%, var(--sq-panel)) 100%);
    }

    .sq-feedback-card .sq-story-visual {
      border-left: 0;
      border-right: var(--sq-border) solid var(--sq-ink);
    }

    .sq-feedback-card .sq-story-kicker {
      background: var(--sq-correct);
    }

    .sq-feedback-card .sq-story-title {
      max-width: 16ch;
      font-size: clamp(1.85rem, 3.65vw, 4.85rem);
    }

    .sq-feedback-mark {
      position: relative;
      width: min(72%, 16rem);
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      border: var(--sq-border) solid var(--sq-ink);
      border-radius: 50% 50% 50% 18%;
      background: var(--sq-correct);
      transform: rotate(-5deg);
      box-shadow: 0 14px 0 rgba(5,3,5,0.2), 0 0 0 clamp(0.55rem, 1vw, 1rem) rgba(255,255,255,0.65);
      font-family: "Rubik Mono One", "Russo One", sans-serif;
      font-size: clamp(4.4rem, 8.5vw, 10rem);
    }

    .sq-feedback-mark::before {
      content: "✓";
      transform: rotate(5deg) translateY(-2%);
    }

    .sq-feedback-note {
      align-self: end;
      justify-self: stretch;
      border-top: calc(var(--sq-border) * 0.46) solid var(--sq-ink);
      padding: clamp(1.1rem, 2vw, 2rem);
      font-family: "Russo One", "Nunito", sans-serif;
      font-size: clamp(1rem, 1.38vw, 1.75rem);
      line-height: 1.14;
      text-align: center;
      text-transform: uppercase;
      background: color-mix(in srgb, var(--sq-accent) 72%, #fff);
    }

    .sq-story-card {
      width: min(100%, 84rem);
      min-height: clamp(25rem, 57dvh, 38.5rem);
      grid-template-columns: clamp(6.8rem, 8.2vw, 9.6rem) minmax(0, 1.08fr) minmax(18rem, 0.72fr);
      gap: 0;
      border-radius: calc(var(--sq-radius) * 0.66);
      background:
        linear-gradient(90deg, color-mix(in srgb, var(--sq-ink) 7%, transparent) 0 1px, transparent 1px 100%),
        repeating-linear-gradient(0deg, rgba(5,3,5,0.045) 0 2px, transparent 2px 18px),
        linear-gradient(135deg, color-mix(in srgb, var(--sq-panel) 94%, #fff) 0%, color-mix(in srgb, var(--sq-accent) 12%, var(--sq-panel)) 100%);
      background-size: 2.4rem 100%, auto, auto;
      box-shadow: 0 14px 0 rgba(5,3,5,0.2), 0 28px 72px rgba(5,3,5,0.24);
      transform: rotate(-0.24deg);
    }

    .sq-story-card::before {
      opacity: 0.88;
      background:
        radial-gradient(circle at 12% 12%, color-mix(in srgb, var(--sq-accent) 44%, transparent) 0 8.5rem, transparent 8.8rem),
        radial-gradient(circle at 82% 16%, color-mix(in srgb, var(--sq-accent-2) 36%, transparent) 0 8rem, transparent 8.4rem),
        linear-gradient(124deg, transparent 0 48%, rgba(255,255,255,0.52) 48.2% 55%, transparent 55.2% 100%);
    }

    .sq-story-card::after {
      inset: clamp(0.72rem, 1.1vw, 1.25rem);
      border: calc(var(--sq-border) * 0.34) solid color-mix(in srgb, var(--sq-ink) 62%, transparent);
      border-radius: calc(var(--sq-radius) * 0.43);
    }

    .sq-info-rail {
      position: relative;
      z-index: 1;
      display: grid;
      align-content: space-between;
      justify-items: center;
      padding: clamp(1.1rem, 2vw, 2rem) 0;
      border-right: var(--sq-border) solid var(--sq-ink);
      background:
        linear-gradient(180deg, var(--sq-accent) 0%, color-mix(in srgb, var(--sq-accent) 76%, #fff) 100%);
      overflow: hidden;
    }

    .sq-info-rail::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        repeating-linear-gradient(135deg, rgba(5,3,5,0.12) 0 0.55rem, transparent 0.55rem 1.15rem);
      opacity: 0.35;
    }

    .sq-info-rail-label,
    .sq-info-rail-code {
      position: relative;
      z-index: 1;
      font-family: "Rubik Mono One", "Russo One", sans-serif;
      line-height: 1;
      text-transform: uppercase;
    }

    .sq-info-rail-label {
      border: calc(var(--sq-border) * 0.32) solid var(--sq-ink);
      border-radius: 999px;
      background: #fff;
      padding: 0.45rem 0.56rem;
      font-size: clamp(0.68rem, 0.82vw, 0.95rem);
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      box-shadow: 0 4px 0 rgba(5,3,5,0.16);
    }

    .sq-info-rail-code {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: clamp(2.1rem, 3.4vw, 4.3rem);
      letter-spacing: 0;
      opacity: 0.95;
    }

    .sq-story-copy {
      padding: clamp(2rem, 3.5vw, 4.25rem);
      gap: clamp(0.78rem, 1.65dvh, 1.35rem);
    }

    .sq-story-meta {
      width: fit-content;
      border-left: calc(var(--sq-border) * 0.55) solid var(--sq-ink);
      padding: 0.18rem 0 0.12rem 0.7rem;
      font-family: "Nunito", system-ui, sans-serif;
      font-size: clamp(0.82rem, 1vw, 1.1rem);
      font-weight: 1000;
      line-height: 1;
      text-transform: uppercase;
      opacity: 0.78;
    }

    .sq-story-kicker {
      border-radius: calc(var(--sq-radius) * 0.22);
      transform: skewX(-6deg);
    }

    .sq-story-kicker > span {
      display: inline-block;
      transform: skewX(6deg);
    }

    .sq-story-title {
      max-width: 18ch;
      font-size: clamp(2rem, 3.45vw, 4.95rem);
      line-height: 0.98;
    }

    .sq-story-body {
      max-width: 58ch;
      border-top: calc(var(--sq-border) * 0.32) solid var(--sq-ink);
      padding-top: clamp(0.9rem, 1.7dvh, 1.4rem);
      font-size: clamp(1.12rem, 1.42vw, 1.82rem);
      line-height: 1.23;
    }

    .sq-story-points {
      counter-reset: sqStoryPoint;
      gap: clamp(0.48rem, 0.9dvh, 0.82rem);
    }

    .sq-story-point {
      counter-increment: sqStoryPoint;
      min-height: clamp(3.1rem, 6.8dvh, 4.7rem);
      grid-template-columns: clamp(3.15rem, 4.4vw, 4.7rem) minmax(0, 1fr);
      gap: 0.85rem;
      border: calc(var(--sq-border) * 0.42) solid var(--sq-ink);
      border-radius: calc(var(--sq-radius) * 0.28);
      background: rgba(255,255,255,0.72);
      padding: 0.46rem clamp(0.78rem, 1.2vw, 1.15rem) 0.42rem 0;
      box-shadow: 0 5px 0 rgba(5,3,5,0.14);
      font-size: clamp(0.95rem, 1.12vw, 1.42rem);
    }

    .sq-story-point::before {
      content: counter(sqStoryPoint, decimal-leading-zero);
      width: auto;
      height: 100%;
      aspect-ratio: auto;
      display: grid;
      place-items: center;
      align-self: stretch;
      border: 0;
      border-right: calc(var(--sq-border) * 0.42) solid var(--sq-ink);
      border-radius: calc(var(--sq-radius) * 0.22) 0 0 calc(var(--sq-radius) * 0.22);
      background: var(--sq-accent);
      font-family: "Rubik Mono One", "Russo One", sans-serif;
      font-size: clamp(0.88rem, 1.08vw, 1.22rem);
      box-shadow: none;
    }

    .sq-story-visual {
      border-left: var(--sq-border) solid var(--sq-ink);
      background:
        radial-gradient(circle at 25% 20%, rgba(255,255,255,0.72) 0 4.4rem, transparent 4.7rem),
        linear-gradient(154deg, color-mix(in srgb, var(--sq-accent-2) 36%, #fff) 0%, color-mix(in srgb, var(--sq-accent) 34%, #fff) 100%);
    }

    .sq-story-visual::before {
      content: "";
      position: absolute;
      inset: clamp(0.7rem, 1vw, 1.05rem);
      border: calc(var(--sq-border) * 0.28) dashed color-mix(in srgb, var(--sq-ink) 42%, transparent);
      border-radius: calc(var(--sq-radius) * 0.28);
      pointer-events: none;
    }

    .sq-story-visual img {
      max-height: clamp(17rem, 43dvh, 29rem);
      border-radius: calc(var(--sq-radius) * 0.34);
      transform: rotate(1.1deg);
    }

    .sq-story-emblem {
      width: min(76%, 17rem);
      border-radius: calc(var(--sq-radius) * 0.48);
      background:
        linear-gradient(135deg, #fff 0 44%, color-mix(in srgb, var(--sq-accent) 58%, #fff) 44.3% 100%);
      transform: rotate(4deg);
      box-shadow: 0 12px 0 rgba(5,3,5,0.2), 0 0 0 clamp(0.5rem, 0.9vw, 0.85rem) rgba(255,255,255,0.68);
    }

    .sq-story-emblem::after {
      border-radius: calc(var(--sq-radius) * 0.26);
      animation-duration: 16s;
    }

    .sq-feedback-card {
      grid-template-columns: minmax(15rem, 0.55fr) minmax(0, 1.15fr);
      transform: rotate(0.18deg);
      background:
        linear-gradient(90deg, color-mix(in srgb, var(--sq-correct) 22%, var(--sq-panel)) 0%, color-mix(in srgb, var(--sq-panel) 96%, #fff) 48%, color-mix(in srgb, var(--sq-accent) 16%, var(--sq-panel)) 100%);
    }

    .sq-feedback-card .sq-story-copy {
      padding-inline: clamp(2.2rem, 4vw, 5.1rem);
    }

    .sq-feedback-card .sq-story-visual {
      border-left: 0;
      border-right: var(--sq-border) solid var(--sq-ink);
    }

    .sq-feedback-verdict {
      align-content: center;
      gap: clamp(1rem, 2dvh, 1.7rem);
      padding: clamp(1.6rem, 2.8vw, 3.3rem);
    }

    .sq-feedback-verdict::after {
      content: "";
      position: absolute;
      inset: 9% 12%;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(255,255,255,0.68) 0 37%, transparent 38% 100%);
      z-index: -1;
    }

    .sq-feedback-ribbon {
      justify-self: center;
      border: calc(var(--sq-border) * 0.42) solid var(--sq-ink);
      border-radius: calc(var(--sq-radius) * 0.22);
      background: #fff;
      padding: 0.52rem 0.9rem 0.46rem;
      font-family: "Rubik Mono One", "Russo One", sans-serif;
      font-size: clamp(0.75rem, 0.95vw, 1.08rem);
      line-height: 1;
      text-transform: uppercase;
      transform: rotate(-2deg);
      box-shadow: 0 5px 0 rgba(5,3,5,0.16);
    }

    .sq-feedback-mark {
      width: min(78%, 15rem);
      border-radius: calc(var(--sq-radius) * 0.5);
      background:
        linear-gradient(135deg, #fff 0 36%, var(--sq-correct) 36.4% 100%);
      transform: rotate(-4deg);
    }

    .sq-feedback-mark::before {
      content: "✓";
    }

    .sq-feedback-note {
      align-self: auto;
      border: calc(var(--sq-border) * 0.38) solid var(--sq-ink);
      border-radius: calc(var(--sq-radius) * 0.24);
      padding: clamp(0.85rem, 1.35vw, 1.35rem);
      background: color-mix(in srgb, var(--sq-accent) 86%, #fff);
      box-shadow: 0 6px 0 rgba(5,3,5,0.15);
    }

    .sq-feedback-copy .sq-story-kicker {
      background: var(--sq-correct);
    }

    .sq-feedback-copy .sq-story-title {
      max-width: 18ch;
      font-size: clamp(1.95rem, 3.55vw, 4.7rem);
    }

    .sq-info-card,
    .sq-feedback-card {
      width: min(100%, 82rem);
      min-height: clamp(24rem, 55dvh, 37rem);
      grid-template-columns: 1fr;
      place-items: center;
      gap: 0;
      overflow: hidden;
      border-radius: calc(var(--sq-radius) * 0.72);
      background:
        radial-gradient(circle at 12% 18%, color-mix(in srgb, var(--sq-accent) 44%, transparent) 0 9rem, transparent 9.35rem),
        radial-gradient(circle at 92% 78%, color-mix(in srgb, var(--sq-accent-2) 34%, transparent) 0 10rem, transparent 10.4rem),
        linear-gradient(128deg, color-mix(in srgb, var(--sq-panel) 96%, #fff) 0%, color-mix(in srgb, var(--sq-panel) 88%, var(--sq-accent)) 100%);
      background-size: auto;
      box-shadow: 0 14px 0 rgba(5,3,5,0.2), 0 30px 76px rgba(5,3,5,0.26);
      transform: rotate(-0.18deg);
    }

    .sq-feedback-card {
      background:
        radial-gradient(circle at 14% 18%, color-mix(in srgb, var(--sq-correct) 38%, transparent) 0 9.5rem, transparent 9.9rem),
        radial-gradient(circle at 92% 74%, color-mix(in srgb, var(--sq-accent) 32%, transparent) 0 10rem, transparent 10.4rem),
        linear-gradient(128deg, color-mix(in srgb, var(--sq-panel) 96%, #fff) 0%, color-mix(in srgb, var(--sq-correct) 14%, var(--sq-panel)) 100%);
      transform: rotate(0.14deg);
    }

    .sq-info-card::before,
    .sq-feedback-card::before {
      z-index: -2;
      opacity: 1;
      background:
        linear-gradient(114deg, transparent 0 52%, rgba(255,255,255,0.54) 52.2% 60%, transparent 60.2% 100%),
        repeating-linear-gradient(0deg, rgba(5,3,5,0.04) 0 2px, transparent 2px 17px);
    }

    .sq-info-card::after,
    .sq-feedback-card::after {
      inset: clamp(0.82rem, 1.18vw, 1.32rem);
      border: calc(var(--sq-border) * 0.34) solid color-mix(in srgb, var(--sq-ink) 56%, transparent);
      border-radius: calc(var(--sq-radius) * 0.48);
    }

    .sq-info-rail,
    .sq-story-kicker,
    .sq-story-meta,
    .sq-feedback-ribbon,
    .sq-feedback-note {
      display: none !important;
    }

    .sq-story-main,
    .sq-feedback-card .sq-story-main {
      position: relative;
      width: min(100%, 66rem);
      min-height: clamp(18rem, 39dvh, 27rem);
      display: grid;
      align-content: center;
      justify-items: start;
      gap: clamp(1.1rem, 2dvh, 1.75rem);
      padding: clamp(2.2rem, 4.2vw, 5.2rem) clamp(2.4rem, 5vw, 6rem);
      z-index: 1;
    }

    .sq-info-card .sq-story-main {
      margin-left: clamp(-1.8rem, -2vw, -0.8rem);
    }

    .sq-feedback-card .sq-story-main {
      padding-left: clamp(4.2rem, 7vw, 8.2rem);
    }

    .sq-story-title {
      max-width: 22ch;
      font-size: clamp(2.45rem, 4.2vw, 5.85rem);
      line-height: 0.96;
      text-align: left;
      text-wrap: balance;
    }

    .sq-feedback-card .sq-story-title {
      max-width: 18ch;
      font-size: clamp(2.35rem, 3.9vw, 5.35rem);
    }

    .sq-story-body {
      max-width: 56ch;
      border-top: 0;
      padding-top: 0;
      font-size: clamp(1.25rem, 1.55vw, 2rem);
      line-height: 1.25;
      font-weight: 1000;
      text-wrap: pretty;
    }

    .sq-story-points {
      width: min(100%, 58rem);
      gap: clamp(0.78rem, 1.18dvh, 1.1rem);
    }

    .sq-story-point {
      min-height: 0;
      grid-template-columns: clamp(1rem, 1.25vw, 1.4rem) minmax(0, 1fr);
      gap: clamp(0.72rem, 1vw, 1.05rem);
      border: 0;
      border-radius: 0;
      background: transparent;
      padding: 0;
      box-shadow: none;
      font-size: clamp(1.18rem, 1.45vw, 1.9rem);
      line-height: 1.18;
    }

    .sq-story-point::before {
      content: "";
      width: clamp(0.74rem, 0.9vw, 1rem);
      height: clamp(0.74rem, 0.9vw, 1rem);
      align-self: start;
      margin-top: 0.22em;
      border: calc(var(--sq-border) * 0.28) solid var(--sq-ink);
      border-radius: 0.2rem;
      background: var(--sq-accent);
      transform: rotate(45deg);
    }

    .sq-feedback-card .sq-story-point::before {
      background: var(--sq-correct);
    }

    .sq-feedback-mark {
      position: absolute;
      left: clamp(0.4rem, 1.2vw, 1.3rem);
      top: 50%;
      width: clamp(3.7rem, 6.3vw, 7.6rem);
      border-radius: 999px;
      background: var(--sq-correct);
      transform: translateY(-50%) rotate(-5deg);
      box-shadow: 0 8px 0 rgba(5,3,5,0.18), 0 0 0 clamp(0.35rem, 0.66vw, 0.62rem) rgba(255,255,255,0.74);
      font-size: clamp(2rem, 4vw, 4.8rem);
    }

    .sq-feedback-mark::before {
      content: "✓";
      transform: rotate(5deg) translateY(-2%);
    }

    .sq-story-atmosphere {
      position: absolute;
      inset: auto clamp(1.3rem, 2.4vw, 2.4rem) clamp(1.1rem, 2vw, 2rem) auto;
      width: clamp(9rem, 18vw, 18rem);
      height: clamp(7rem, 20dvh, 14rem);
      min-height: 0;
      padding: 0;
      border: 0;
      border-left: 0;
      opacity: 0.28;
      pointer-events: none;
      transform: rotate(4deg);
      mix-blend-mode: multiply;
      background: transparent;
    }

    .sq-story-atmosphere::before {
      display: none;
    }

    .sq-story-atmosphere img {
      width: 100%;
      height: 100%;
      max-height: none;
      border: calc(var(--sq-border) * 0.4) solid var(--sq-ink);
      border-radius: calc(var(--sq-radius) * 0.3);
      object-fit: cover;
      box-shadow: 0 8px 0 rgba(5,3,5,0.14);
      transform: none;
    }

    .sq-info-card,
    .sq-feedback-card {
      width: min(100%, 80rem);
      min-height: clamp(23rem, 52dvh, 35.5rem);
      place-items: center;
      background:
        radial-gradient(circle at 14% 18%, color-mix(in srgb, var(--sq-accent) 36%, transparent) 0 8.6rem, transparent 8.95rem),
        radial-gradient(circle at 86% 78%, color-mix(in srgb, var(--sq-accent-2) 22%, transparent) 0 12rem, transparent 12.4rem),
        linear-gradient(128deg, color-mix(in srgb, var(--sq-panel) 98%, #fff) 0%, color-mix(in srgb, var(--sq-panel) 90%, var(--sq-accent)) 100%);
    }

    .sq-info-card.has-media,
    .sq-feedback-card.has-media {
      grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.62fr);
      place-items: stretch;
    }

    .sq-info-card::before,
    .sq-feedback-card::before {
      background:
        radial-gradient(ellipse at 32% 42%, rgba(255,255,255,0.58) 0 28%, transparent 29% 100%),
        linear-gradient(118deg, transparent 0 53%, rgba(255,255,255,0.5) 53.2% 60%, transparent 60.2% 100%),
        repeating-linear-gradient(0deg, rgba(5,3,5,0.034) 0 2px, transparent 2px 18px);
    }

    .sq-story-main,
    .sq-feedback-card .sq-story-main {
      width: min(100%, 64rem);
      min-height: clamp(17rem, 36dvh, 25rem);
      padding: clamp(2.35rem, 4.4vw, 5.4rem) clamp(2.6rem, 5.4vw, 6.4rem);
      justify-items: start;
    }

    .sq-feedback-card .sq-story-main {
      padding-left: clamp(2.6rem, 5.4vw, 6.4rem);
    }

    .sq-info-card.has-media .sq-story-main,
    .sq-feedback-card.has-media .sq-story-main {
      width: auto;
      padding-right: clamp(1.7rem, 3vw, 3.4rem);
    }

    .sq-feedback-mark {
      display: none !important;
    }

    .sq-story-body {
      max-width: 60ch;
      font-size: clamp(1.35rem, 1.85vw, 2.35rem);
      line-height: 1.18;
      font-family: "Russo One", "Nunito", sans-serif;
      text-transform: uppercase;
    }

    .sq-story-points {
      width: min(100%, 60rem);
      gap: clamp(0.9rem, 1.45dvh, 1.35rem);
    }

    .sq-story-point {
      grid-template-columns: clamp(0.9rem, 1.05vw, 1.18rem) minmax(0, 1fr);
      font-size: clamp(1.22rem, 1.58vw, 2.04rem);
      line-height: 1.14;
      text-wrap: balance;
    }

    .sq-story-point::before {
      border-radius: 999px;
      transform: none;
      background:
        radial-gradient(circle at center, #fff 0 34%, transparent 35%),
        var(--sq-accent);
    }

    .sq-story-media {
      position: relative;
      z-index: 1;
      align-self: stretch;
      justify-self: stretch;
      display: grid;
      min-width: 0;
      min-height: 0;
      margin: clamp(1.2rem, 2.1vw, 2.2rem) clamp(1.2rem, 2.1vw, 2.2rem) clamp(1.2rem, 2.1vw, 2.2rem) 0;
      border: calc(var(--sq-border) * 0.72) solid var(--sq-ink);
      border-radius: calc(var(--sq-radius) * 0.46);
      background:
        linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.28)),
        color-mix(in srgb, var(--sq-panel) 84%, #fff);
      box-shadow: 0 10px 0 rgba(5,3,5,0.17), 0 24px 42px rgba(5,3,5,0.16);
      overflow: hidden;
      transform: rotate(0.7deg);
    }

    .sq-story-media::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.26), transparent 42%),
        repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 7px);
      mix-blend-mode: screen;
    }

    .sq-story-media img,
    .sq-story-media iframe {
      width: 100%;
      height: 100%;
      min-height: clamp(16rem, 35dvh, 27rem);
      display: block;
      border: 0;
      object-fit: cover;
      background: #fff;
    }

    .sq-story-media.is-video {
      aspect-ratio: 16 / 9;
      align-self: center;
    }

    .sq-story-media.is-video iframe {
      min-height: clamp(14rem, 30dvh, 22rem);
    }

    .sq-content.image-grid {
      grid-template-rows: clamp(6.2rem, 13.2dvh, 9.1rem) minmax(0, 1fr);
      align-content: stretch;
      gap: clamp(0.75rem, 1.55dvh, 1.15rem);
      padding: 6.25% 5.25% 1.8dvh;
      overflow: hidden;
    }

    .sq-content.image-grid .sq-question-wrap {
      display: block;
      min-height: 0;
      min-width: 0;
    }

    .sq-content.image-grid .sq-question-card {
      width: 100%;
      height: 100%;
      min-height: 0;
      padding-block: clamp(0.5rem, 1.05dvh, 0.9rem);
      border-radius: calc(var(--sq-radius) * 0.82);
    }

    .sq-question-wrap {
      display: grid;
      grid-template-rows: minmax(8.2rem, var(--sq-question-row, 33.8%)) minmax(0, 1fr);
      align-content: stretch;
      gap: clamp(2.2rem, 4dvh, 2.8rem);
      min-width: 0;
      min-height: 0;
    }

    .sq-content[data-answer-count="4"] .sq-question-wrap {
      --sq-question-row: 31%;
      gap: clamp(0.85rem, 1.55dvh, 1.18rem);
    }

    .sq-content.question-only .sq-question-wrap {
      grid-template-rows: minmax(0, 0.92fr) minmax(0, 1.08fr);
    }

    .sq-content.question-only[data-answer-count="2"] .sq-question-wrap {
      grid-template-rows: minmax(0, 0.95fr) minmax(0, 0.82fr);
      gap: clamp(1.5rem, 3dvh, 2.25rem);
    }

    .sq-content.question-only[data-answer-count="2"] .sq-answers {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-content: stretch;
      align-items: stretch;
    }

    .sq-content.question-only[data-answer-count="2"] .sq-option {
      min-height: clamp(6.8rem, 17dvh, 10.5rem);
      grid-template-columns: minmax(5.5rem, 27%) minmax(0, 1fr);
    }

    .sq-content[data-answer-count="0"] .sq-question-wrap {
      grid-template-rows: minmax(0, 1fr);
      align-items: center;
    }

    .sq-question-card,
    .sq-answer-reveal {
      position: relative;
      min-height: 0;
      max-height: 100%;
      display: grid;
      place-items: center;
      border: var(--sq-border) solid var(--sq-ink);
      border-radius: var(--sq-radius);
      background: var(--sq-panel);
      padding: clamp(1rem, 2.1vw, 2.7rem) clamp(1.2rem, 3.2vw, 4.2rem);
      text-align: center;
      box-shadow: 0 10px 0 rgba(5,3,5,0.14);
      transform-origin: center;
      animation: sqPopIn 620ms cubic-bezier(.18,1.42,.32,1) both;
      overflow: hidden;
    }

    .sq-content.media-right .sq-question-card,
    .sq-content.media-left .sq-question-card {
      min-height: clamp(9.6rem, 13.2vw, 15.4rem);
      align-self: stretch;
    }

    .sq-content[data-answer-count="4"].media-right .sq-question-card,
    .sq-content[data-answer-count="4"].media-left .sq-question-card {
      min-height: clamp(8.5rem, 11.25vw, 13rem);
      padding-block: clamp(0.7rem, 1.35vw, 1.65rem);
    }

    .sq-answer-reveal {
      background: var(--sq-correct);
      min-height: 28%;
    }

    .sq-question-card::before,
    .sq-question-card::after,
    .sq-answer-reveal::before,
    .sq-answer-reveal::after,
    .sq-media-card::after,
    .sq-choice-card::after {
      content: "";
      position: absolute;
      width: clamp(1.35rem, 2.5vw, 3rem);
      aspect-ratio: 1;
      border: calc(var(--sq-border) * 0.74) solid var(--sq-ink);
      border-radius: 999px;
      background: var(--sq-accent-2);
      pointer-events: none;
    }

    .sq-question-card::before,
    .sq-answer-reveal::before { left: 1.6%; bottom: -8%; }
    .sq-question-card::after,
    .sq-answer-reveal::after { right: 2.2%; top: -10%; background: #ffd1eb; }
    .sq-media-card::after,
    .sq-choice-card::after { left: -4%; bottom: -5%; }

    .sq-title {
      margin: 0;
      font-family: "Russo One", "Nunito", sans-serif;
      font-size: clamp(1.5rem, calc(2.66vw * var(--sq-title-scale, 1)), 4.25rem);
      line-height: 1.16;
      letter-spacing: 0;
      text-transform: uppercase;
      text-wrap: balance;
      color: var(--sq-ink);
    }

    .sq-question-card[data-long="true"] .sq-title {
      font-size: clamp(1.05rem, calc(2vw * var(--sq-title-scale, 1)), 3rem);
      line-height: 1.13;
    }

    .sq-question-card[data-very-long="true"] {
      padding-block: clamp(0.55rem, 1.05vw, 1.25rem);
    }

    .sq-question-card[data-very-long="true"] .sq-title {
      font-size: clamp(1rem, calc(2.05vw * var(--sq-title-scale, 1)), 3rem);
      line-height: 1.1;
    }

    .sq-desc {
      margin: 1.4rem auto 0;
      max-width: 72ch;
      font-size: clamp(0.95rem, 1.35vw, 1.6rem);
      line-height: 1.25;
      font-weight: 900;
    }

    .sq-media-card {
      position: relative;
      min-height: 0;
      align-self: start;
      justify-self: stretch;
      margin: 0;
      border: var(--sq-border) solid var(--sq-ink);
      border-radius: calc(var(--sq-radius) * 0.62);
      background: #f4f2ec;
      padding: 1.5%;
      overflow: visible;
      box-shadow: 0 10px 0 rgba(5,3,5,0.14);
      animation: sqSlideIn 760ms cubic-bezier(.16,1,.3,1) 120ms both;
    }

    .sq-media-card img,
    .sq-choice-card img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      object-position: center top;
      border-radius: calc(var(--sq-radius) * 0.42);
    }

    .sq-media-card img {
      max-height: 100%;
      aspect-ratio: 4 / 5;
    }

    .sq-content.media-right .sq-media-card,
    .sq-content.media-left .sq-media-card,
    .sq-content.media-top .sq-media-card {
      height: 93.5%;
      max-height: 93.5%;
    }

    .sq-scene[data-answer-count="4"] .sq-content.media-right .sq-media-card,
    .sq-scene[data-answer-count="4"] .sq-content.media-left .sq-media-card {
      height: 86%;
      max-height: 86%;
    }

    .sq-content.media-right .sq-media-card {
      transform: translateX(0);
    }

    .sq-content.media-left .sq-media-card {
      transform: translateX(0);
    }

    .sq-content.media-right .sq-media-card img,
    .sq-content.media-left .sq-media-card img,
    .sq-content.media-top .sq-media-card img {
      aspect-ratio: auto;
    }

    .sq-answers {
      min-height: 0;
      display: grid;
      align-content: start;
      gap: clamp(0.75rem, 2.1dvh, 1.45rem);
      overflow: hidden;
    }

    .sq-option {
      position: relative;
      min-height: clamp(5rem, 12.8dvh, 8.25rem);
      display: grid;
      grid-template-columns: minmax(7.3rem, 18.8%) minmax(0, 1fr);
      align-items: stretch;
      border: var(--sq-border) solid var(--sq-ink);
      border-radius: calc(var(--sq-radius) * 0.72);
      background: var(--sq-answer);
      overflow: hidden;
      box-shadow: 0 7px 0 rgba(5,3,5,0.16);
      cursor: default;
      pointer-events: none;
      transform: translateY(18px);
      opacity: 0;
      animation: sqAnswerIn 520ms cubic-bezier(.18,1.2,.32,1) forwards;
    }

    .sq-option:nth-child(1) { animation-delay: 110ms; }
    .sq-option:nth-child(2) { animation-delay: 180ms; }
    .sq-option:nth-child(3) { animation-delay: 250ms; }
    .sq-option:nth-child(4) { animation-delay: 320ms; }

    .sq-option.selected {
      background: color-mix(in srgb, var(--sq-accent) 42%, var(--sq-answer));
    }

    .sq-option.correct,
    .sq-choice-card.correct {
      background: var(--sq-correct);
      color: var(--sq-ink);
      opacity: 1;
      animation:
        sqCorrect 980ms cubic-bezier(.18,1.42,.32,1) both,
        sqCorrectPulse 1700ms ease-in-out 1020ms infinite;
      box-shadow: 0 9px 0 rgba(5,3,5,0.2), 0 0 0 clamp(0.18rem, 0.35vw, 0.42rem) rgba(255,255,255,0.76), 0 0 34px rgba(24,201,0,0.48);
    }

    .sq-option.correct::after {
      content: "✓";
      position: absolute;
      top: clamp(0.5rem, 0.95vw, 0.9rem);
      right: clamp(0.55rem, 1vw, 1rem);
      width: clamp(2.05rem, 3.25vw, 3.75rem);
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      border: calc(var(--sq-border) * 0.4) solid var(--sq-ink);
      border-radius: 999px;
      background: #fff;
      color: var(--sq-ink);
      font-family: "Rubik Mono One", "Russo One", sans-serif;
      font-size: clamp(0.92rem, 1.75vw, 2rem);
      line-height: 1;
      box-shadow: 0 5px 0 rgba(5,3,5,0.18), 0 0 0 clamp(0.16rem, 0.28vw, 0.36rem) rgba(255,255,255,0.72);
      transform: rotate(-8deg);
      animation: sqRevealPop 920ms cubic-bezier(.18,1.42,.32,1) both;
      pointer-events: none;
    }

    .sq-option.correct .sq-letter {
      background:
        radial-gradient(circle at 50% 50%, rgba(255,255,255,0.88) 0 28%, transparent 29%),
        var(--sq-correct);
    }

    .sq-option.wrong,
    .sq-choice-card.wrong {
      filter: grayscale(0.6) brightness(0.88);
      opacity: 0.62;
      animation: sqWrongDim 460ms ease-out both;
    }

    .sq-option.auto-reveal .sq-letter,
    .sq-choice-card.auto-reveal .sq-choice-title {
      animation: sqRevealPop 900ms cubic-bezier(.18,1.42,.32,1) both;
    }

    .sq-scene[data-correct-count="multi"] .sq-option.correct,
    .sq-scene[data-correct-count="multi"] .sq-choice-card.correct {
      animation:
        sqMultiCorrect 1120ms cubic-bezier(.18,1.42,.32,1) both,
        sqCorrectPulse 1700ms ease-in-out 1020ms infinite;
      animation-delay: calc(var(--sq-reveal-order, 0) * 135ms), calc(1020ms + var(--sq-reveal-order, 0) * 135ms);
    }

    .sq-scene[data-correct-count="multi"] .sq-option.correct .sq-letter {
      background:
        radial-gradient(circle at 50% 50%, rgba(255,255,255,0.88) 0 28%, transparent 29%),
        var(--sq-correct);
    }

    .sq-choice-card.correct::before {
      content: "✓";
      position: absolute;
      top: clamp(0.45rem, 0.9vw, 0.82rem);
      right: clamp(0.45rem, 0.9vw, 0.82rem);
      z-index: 3;
      width: clamp(2.2rem, 3.5vw, 4rem);
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      border: calc(var(--sq-border) * 0.42) solid var(--sq-ink);
      border-radius: 999px;
      background: var(--sq-correct);
      font-family: "Rubik Mono One", "Russo One", sans-serif;
      font-size: clamp(1rem, 1.9vw, 2.2rem);
      line-height: 1;
      box-shadow: 0 5px 0 rgba(5,3,5,0.18), 0 0 0 clamp(0.18rem, 0.32vw, 0.38rem) rgba(255,255,255,0.76);
      transform: rotate(-8deg);
      animation: sqRevealPop 920ms cubic-bezier(.18,1.42,.32,1) both;
      animation-delay: calc(var(--sq-reveal-order, 0) * 135ms);
    }

    .sq-letter {
      display: grid;
      place-items: center;
      background: var(--sq-accent);
      border-right: var(--sq-border) solid var(--sq-ink);
      font-family: "Rubik Mono One", "Russo One", sans-serif;
      font-size: clamp(2.1rem, 4.05vw, 5.2rem);
      line-height: 1;
    }

    .sq-option-text {
      display: grid;
      place-items: center;
      padding: 0.5rem 1rem;
      font-family: "Russo One", "Nunito", sans-serif;
      font-size: clamp(1.28rem, calc(2.08vw * var(--sq-answer-scale, 1)), 2.9rem);
      line-height: 1.1;
      text-align: center;
      text-transform: uppercase;
      text-wrap: balance;
    }

    .sq-content[data-answer-count="4"] .sq-option {
      min-height: clamp(3.35rem, 9.2dvh, 5.85rem);
      border-radius: calc(var(--sq-radius) * 0.62);
    }

    .sq-content[data-answer-count="4"] .sq-option-text {
      font-size: clamp(0.95rem, calc(1.52vw * var(--sq-answer-scale, 1)), 2.08rem);
    }

    .sq-content[data-answer-count="4"] .sq-letter {
      font-size: clamp(1.7rem, 3.45vw, 4.45rem);
    }

    .sq-image-grid {
      min-height: 0;
      display: grid;
      grid-template-columns: repeat(var(--sq-grid-count, 4), minmax(0, 1fr));
      gap: clamp(0.9rem, 2.1vw, 2.5rem);
      align-items: stretch;
      overflow: hidden;
    }

    .sq-choice-card {
      position: relative;
      display: grid;
      grid-template-rows: minmax(0, 1fr) clamp(3.6rem, 7.4dvh, 5.55rem);
      gap: clamp(0.35rem, 0.95dvh, 0.7rem);
      min-height: 0;
      border: var(--sq-border) solid var(--sq-ink);
      border-radius: calc(var(--sq-radius) * 0.52);
      background: #f4f2ec;
      padding: clamp(0.35rem, 0.7vw, 0.85rem);
      box-shadow: 0 8px 0 rgba(5,3,5,0.15);
      overflow: hidden;
      cursor: default;
      pointer-events: none;
      transform: translateY(24px);
      opacity: 0;
      animation: sqAnswerIn 560ms cubic-bezier(.18,1.2,.32,1) forwards;
    }

    .sq-choice-card:nth-child(2) { animation-delay: 90ms; }
    .sq-choice-card:nth-child(3) { animation-delay: 160ms; }
    .sq-choice-card:nth-child(4) { animation-delay: 230ms; }

    .sq-choice-card img { aspect-ratio: 3 / 4; min-height: 0; }

    .sq-choice-title {
      display: grid;
      place-items: center;
      min-width: 0;
      padding: 0 0.35rem;
      font-family: "Rubik Mono One", "Russo One", sans-serif;
      font-size: clamp(1.05rem, 2.05vw, 2.65rem);
      line-height: 1.05;
      text-align: center;
      text-transform: uppercase;
      text-wrap: balance;
      overflow: hidden;
    }

    .sq-content.image-grid + .sq-footer {
      min-height: 8.2%;
      padding-bottom: 1.2%;
      transform: translateY(-1.1dvh);
    }

    .sq-scene[data-answer-count="4"] .sq-content.image-grid + .sq-footer {
      transform: translateY(-1.1dvh);
    }

    .sq-content.image-grid + .sq-footer .sq-timer {
      width: min(42rem, 36%);
      height: clamp(1.8rem, 3vw, 3.35rem);
    }

    .sq-footer {
      display: grid;
      place-items: center;
      min-height: 10%;
      padding-bottom: 2.05%;
    }

    .sq-scene[data-answer-count="4"] .sq-footer {
      min-height: 0;
      padding-bottom: 0.75%;
      transform: translateY(-4dvh);
    }

    .sq-timer {
      position: relative;
      width: min(42rem, 40%);
      height: clamp(2.1rem, 3.65vw, 4.2rem);
      border: var(--sq-border) solid var(--sq-ink);
      border-radius: 999px;
      background: #d9d9d9;
      box-shadow: 0 8px 0 rgba(5,3,5,0.14);
      overflow: visible;
    }

    .sq-scene[data-answer-count="4"] .sq-timer {
      height: clamp(1.85rem, 3.15vw, 3.55rem);
    }

    .sq-timer-fill {
      position: absolute;
      inset: 0.42rem;
      width: calc(100% - 0.84rem);
      border-radius: 999px;
      background: var(--sq-accent);
      transform-origin: left center;
      animation: sqTimerFill var(--sq-duration) linear forwards;
    }

    .sq-clock {
      position: absolute;
      top: 50%;
      left: 50%;
      width: clamp(3.1rem, 5.25vw, 5.95rem);
      aspect-ratio: 1;
      transform: translate(-50%, -50%);
      border-radius: 999px;
      border: calc(var(--sq-border) * 0.56) solid #b66e13;
      background:
        radial-gradient(circle at center, #fff8ee 0 48%, transparent 49%),
        conic-gradient(from -40deg, #efaa2d, #ffd778, #b66e13, #efaa2d);
      box-shadow: 0 5px 0 rgba(5,3,5,0.18);
      animation: sqClock var(--sq-duration) linear forwards;
    }

    .sq-clock::before,
    .sq-clock::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: 4px;
      height: 29%;
      background: #2a1111;
      border-radius: 999px;
      transform-origin: 50% 90%;
    }

    .sq-clock::before { transform: translate(-50%, -90%) rotate(42deg); }
    .sq-clock::after { height: 22%; transform: translate(-50%, -90%) rotate(-62deg); }

    .sq-next {
      justify-self: center;
      min-height: clamp(3.6rem, 5vw, 5.6rem);
      border: var(--sq-border) solid var(--sq-ink);
      border-radius: 999px;
      background: var(--sq-accent);
      color: var(--sq-ink);
      padding: 0 2.2rem;
      font-family: "Rubik Mono One", "Russo One", sans-serif;
      font-size: clamp(1rem, 2vw, 2.3rem);
      cursor: default;
      pointer-events: none;
      box-shadow: 0 8px 0 rgba(5,3,5,0.16);
    }

    .sq-next:active { transform: translateY(4px); box-shadow: 0 4px 0 rgba(5,3,5,0.16); }

    .sq-scene.is-leaving .sq-content {
      animation: sqSceneOut var(--sq-transition-duration) cubic-bezier(.7,0,.3,1) both;
    }

    .sq-scene.is-leaving .sq-footer {
      animation: sqFooterOut var(--sq-transition-duration) cubic-bezier(.7,0,.3,1) both;
    }

    .sq-scene.is-entering .sq-content {
      animation: sqSwipeSceneIn var(--sq-transition-duration) cubic-bezier(.16,1,.3,1) both;
    }

    .sq-shell[data-transition="swipe-reveal"] .sq-scene.is-leaving::after,
    .sq-shell[data-transition="swipe-reveal"] .sq-scene.is-entering::after {
      opacity: 1;
      background: linear-gradient(90deg, color-mix(in srgb, var(--sq-accent) 92%, #fff), var(--sq-accent));
      box-shadow: -22px 0 0 rgba(5,3,5,0.18);
    }

    .sq-shell[data-transition="swipe-reveal"] .sq-scene.is-leaving::after {
      animation: sqSwipeCurtainCover var(--sq-transition-duration) cubic-bezier(.7,0,.3,1) both;
    }

    .sq-shell[data-transition="swipe-reveal"] .sq-scene.is-entering::after {
      animation: sqSwipeCurtainReveal var(--sq-transition-duration) cubic-bezier(.16,1,.3,1) both;
    }

    .sq-shell[data-transition="pixel-dissolve"] .sq-scene.is-leaving .sq-content,
    .sq-shell[data-transition="pixel-dissolve"] .sq-scene.is-leaving .sq-footer {
      animation: sqPixelOut var(--sq-transition-duration) steps(5, end) both;
    }

    .sq-shell[data-transition="pixel-dissolve"] .sq-scene.is-entering .sq-content {
      animation: sqPixelIn var(--sq-transition-duration) steps(5, end) both;
    }

    .sq-shell[data-transition="pixel-dissolve"] .sq-scene.is-leaving::before,
    .sq-shell[data-transition="pixel-dissolve"] .sq-scene.is-entering::before {
      opacity: 1;
      background:
        repeating-conic-gradient(from 45deg, rgba(255,255,255,0.72) 0 25%, rgba(5,3,5,0.18) 0 50%) 0 0 / 22px 22px,
        color-mix(in srgb, var(--sq-accent) 28%, transparent);
      mix-blend-mode: screen;
      animation: sqPixelMask var(--sq-transition-duration) steps(6, end) both;
    }

    .sq-shell[data-transition="zoom-in-reveal"] .sq-scene.is-leaving .sq-content,
    .sq-shell[data-transition="zoom-in-reveal"] .sq-scene.is-leaving .sq-footer {
      animation: sqZoomOut var(--sq-transition-duration) cubic-bezier(.7,0,.3,1) both;
    }

    .sq-shell[data-transition="zoom-in-reveal"] .sq-scene.is-entering .sq-content {
      animation: sqZoomIn var(--sq-transition-duration) cubic-bezier(.16,1,.3,1) both;
    }

    .sq-shell[data-transition="glitch-cut"] .sq-scene.is-leaving .sq-content,
    .sq-shell[data-transition="glitch-cut"] .sq-scene.is-leaving .sq-footer {
      animation: sqGlitchOut var(--sq-transition-duration) steps(3, end) both;
    }

    .sq-shell[data-transition="glitch-cut"] .sq-scene.is-entering .sq-content {
      animation: sqGlitchIn var(--sq-transition-duration) steps(3, end) both;
    }

    .sq-shell[data-transition="glitch-cut"] .sq-scene.is-leaving::before,
    .sq-shell[data-transition="glitch-cut"] .sq-scene.is-leaving::after,
    .sq-shell[data-transition="glitch-cut"] .sq-scene.is-entering::before,
    .sq-shell[data-transition="glitch-cut"] .sq-scene.is-entering::after {
      opacity: 1;
      mix-blend-mode: screen;
    }

    .sq-shell[data-transition="glitch-cut"] .sq-scene::before {
      background: repeating-linear-gradient(0deg, rgba(0,255,255,0.36) 0 3px, transparent 3px 13px);
      animation: sqGlitchScan var(--sq-transition-duration) steps(4, end) both;
    }

    .sq-shell[data-transition="glitch-cut"] .sq-scene::after {
      background: repeating-linear-gradient(90deg, transparent 0 18px, rgba(255,0,112,0.32) 18px 22px, transparent 22px 42px);
      animation: sqGlitchShift var(--sq-transition-duration) steps(4, end) both;
    }

    @keyframes sqStageIn {
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    @keyframes sqPopIn {
      0% { opacity: 0; transform: translateY(22px) scale(0.94); }
      70% { opacity: 1; transform: translateY(-4px) scale(1.012); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes sqSlideIn {
      from { opacity: 0; transform: translateX(34px) rotate(1.4deg); }
      to { opacity: 1; transform: translateX(0) rotate(0); }
    }

    @keyframes sqAnswerIn {
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes sqCorrect {
      0%, 100% { transform: scale(1); }
      34% { transform: scale(1.035) rotate(-0.25deg); }
      62% { transform: scale(0.992) rotate(0.18deg); }
    }

    @keyframes sqRevealPop {
      0% { transform: scale(1); }
      45% { transform: scale(1.12); }
      100% { transform: scale(1); }
    }

    @keyframes sqMultiCorrect {
      0% { opacity: 0.72; transform: translateY(12px) scale(0.96) rotate(-1.2deg); filter: saturate(0.9); }
      58% { opacity: 1; transform: translateY(-8px) scale(1.035) rotate(0.7deg); filter: saturate(1.35); }
      100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); filter: none; }
    }

    @keyframes sqCorrectPulse {
      0%, 100% { box-shadow: 0 9px 0 rgba(5,3,5,0.2), 0 0 0 clamp(0.18rem, 0.35vw, 0.42rem) rgba(255,255,255,0.76), 0 0 28px rgba(24,201,0,0.42); }
      50% { box-shadow: 0 9px 0 rgba(5,3,5,0.2), 0 0 0 clamp(0.34rem, 0.58vw, 0.68rem) rgba(255,255,255,0.86), 0 0 52px rgba(24,201,0,0.68); }
    }

    @keyframes sqWrongDim {
      from { opacity: 1; filter: grayscale(0) brightness(1); }
      to { opacity: 0.62; filter: grayscale(0.6) brightness(0.88); }
    }

    @keyframes sqSceneOut {
      to { opacity: 0; transform: translateY(-22px) scale(0.985); filter: blur(4px); }
    }

    @keyframes sqFooterOut {
      to { opacity: 0; transform: translateY(24px) scale(0.98); }
    }

    @keyframes sqSwipeSceneIn {
      from { opacity: 0; transform: translateX(2.2%) scale(0.992); filter: blur(2px); }
      to { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
    }

    @keyframes sqSwipeCurtainCover {
      from { transform: translateX(104%); }
      to { transform: translateX(0); }
    }

    @keyframes sqSwipeCurtainReveal {
      from { transform: translateX(0); }
      to { transform: translateX(-104%); }
    }

    @keyframes sqPixelOut {
      0% { opacity: 1; transform: scale(1); filter: none; }
      55% { opacity: 0.72; transform: scale(1.012); filter: contrast(1.35) saturate(1.5); }
      100% { opacity: 0; transform: scale(0.985); filter: contrast(2) blur(5px); }
    }

    @keyframes sqPixelIn {
      0% { opacity: 0; transform: scale(1.025); filter: contrast(2) blur(5px); }
      58% { opacity: 0.78; transform: scale(0.992); filter: contrast(1.35) saturate(1.4); }
      100% { opacity: 1; transform: scale(1); filter: none; }
    }

    @keyframes sqPixelMask {
      0% { clip-path: inset(0 0 0 0); transform: scale(1.02); }
      52% { clip-path: inset(10% 8% 12% 7%); transform: scale(1); }
      100% { clip-path: inset(50% 50% 50% 50%); transform: scale(0.98); }
    }

    @keyframes sqZoomOut {
      to { opacity: 0; transform: scale(1.12); filter: blur(5px) saturate(1.25); }
    }

    @keyframes sqZoomIn {
      from { opacity: 0; transform: scale(0.82); filter: blur(6px) saturate(1.25); }
      to { opacity: 1; transform: scale(1); filter: blur(0) saturate(1); }
    }

    @keyframes sqGlitchOut {
      0% { opacity: 1; transform: translate(0,0); clip-path: inset(0); }
      28% { opacity: 0.9; transform: translate(-12px, 4px) skewX(-4deg); clip-path: inset(8% 0 64% 0); }
      52% { opacity: 0.72; transform: translate(14px, -3px) skewX(5deg); clip-path: inset(48% 0 20% 0); }
      100% { opacity: 0; transform: translate(0,0) scale(0.99); clip-path: inset(0); }
    }

    @keyframes sqGlitchIn {
      0% { opacity: 0; transform: translate(12px,-3px) skewX(5deg); clip-path: inset(58% 0 18% 0); }
      45% { opacity: 0.78; transform: translate(-10px, 4px) skewX(-4deg); clip-path: inset(12% 0 62% 0); }
      100% { opacity: 1; transform: translate(0,0); clip-path: inset(0); }
    }

    @keyframes sqGlitchScan {
      0% { transform: translateY(-8%); opacity: 0; }
      22%, 70% { opacity: 1; }
      100% { transform: translateY(8%); opacity: 0; }
    }

    @keyframes sqGlitchShift {
      0% { transform: translateX(-2%); opacity: 0; }
      30% { opacity: 1; }
      100% { transform: translateX(2%); opacity: 0; }
    }

    @keyframes sqStorySpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes sqTimerFill {
      from { transform: scaleX(0); }
      to { transform: scaleX(1); }
    }

    @keyframes sqClock {
      from { left: 2%; }
      to { left: 98%; }
    }

    @keyframes sqDrift {
      from { transform: translate3d(-1%, -0.4%, 0) rotate(-0.4deg); }
      to { transform: translate3d(1.2%, 0.7%, 0) rotate(0.5deg); }
    }

    @keyframes sqFloat {
      from { transform: translate3d(0, 0, 0); }
      to { transform: translate3d(1.8%, -1.2%, 0); }
    }

    @media (max-aspect-ratio: 4 / 3) {
      .sq-stage { width: 100vw; height: 100dvh; aspect-ratio: auto; padding: 2.8%; }
      .sq-content.media-right,
      .sq-content.media-left,
      .sq-content.media-top { grid-template-columns: 1fr; grid-template-rows: none; }
      .sq-media-card { display: none; }
      .sq-content.story-scene { padding: 9% 5% 3%; }
      .sq-story-card,
      .sq-feedback-card { grid-template-columns: 1fr; min-height: 0; }
      .sq-info-rail {
        min-height: 4.5rem;
        grid-auto-flow: column;
        align-content: center;
        align-items: center;
        justify-content: space-between;
        padding: 0.7rem 1.1rem;
        border-right: 0;
        border-bottom: var(--sq-border) solid var(--sq-ink);
      }
      .sq-info-rail-label,
      .sq-info-rail-code {
        writing-mode: horizontal-tb;
        transform: none;
      }
      .sq-info-rail-code {
        font-size: clamp(1.4rem, 8vw, 2.8rem);
      }
      .sq-story-visual,
      .sq-feedback-card .sq-story-visual { min-height: 12rem; border-left: 0; border-right: 0; border-top: var(--sq-border) solid var(--sq-ink); }
      .sq-feedback-card .sq-story-visual { order: 2; }
      .sq-info-card.has-media,
      .sq-feedback-card.has-media { grid-template-columns: 1fr; }
      .sq-info-card.has-media .sq-story-main,
      .sq-feedback-card.has-media .sq-story-main { padding-right: clamp(2rem, 6vw, 4rem); }
      .sq-story-media {
        margin: 0 clamp(1.2rem, 4vw, 2rem) clamp(1.2rem, 4vw, 2rem);
        min-height: clamp(13rem, 32dvh, 19rem);
        transform: none;
      }
      .sq-story-media img,
      .sq-story-media iframe {
        min-height: clamp(13rem, 32dvh, 19rem);
      }
      .sq-image-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .sq-content.question-only[data-answer-count="2"] .sq-answers { grid-template-columns: 1fr; }
      .sq-content.question-only[data-answer-count="2"] .sq-option { min-height: clamp(4.9rem, 10.8dvh, 7rem); }
      .sq-timer { width: 72%; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
      }
    }
  </style>
</head>
<body>
  <div id="screen-quiz-root" class="sq-shell">
    <main class="sq-stage" aria-live="polite">
      <div class="sq-frame"></div>
      <div id="sq-badge" class="sq-badge">Вопрос</div>
      <section id="sq-scene" class="sq-scene"></section>
    </main>
  </div>

  <script id="quiz-data" type="application/json">%%QUIZ_DATA_INJECTION%%</script>
  <script>
    (function () {
      var quizData = null;
      var dataNode = document.getElementById("quiz-data");
      try {
        quizData = dataNode ? JSON.parse(dataNode.textContent || "{}") : (window.quizData || {});
      } catch (error) {
        quizData = window.quizData || {};
      }

      var root = document.getElementById("screen-quiz-root");
      var scene = document.getElementById("sq-scene");
      var badge = document.getElementById("sq-badge");
      if (!root || !scene || !quizData) return;

      var nodes = Array.isArray(quizData.nodes) ? quizData.nodes : [];
      var edges = Array.isArray(quizData.edges) ? quizData.edges : [];
      var settings = ((quizData.designSettings || {}).screenQuiz || {});
      var state = {
        currentId: resolveStartNodeId(),
        index: 0,
        locked: false,
        revealTimerId: null,
        transitionTimerId: null,
        token: 0
      };

      renderCurrent();

      function resolveStartNodeId() {
        if (quizData.startNodeId && isVisibleNodeId(quizData.startNodeId)) return quizData.startNodeId;
        var start = nodes.find(function (node) { return node.type === "startNode"; });
        if (start) {
          var firstEdge = edges.find(function (edge) { return edge.source === start.id; });
          if (firstEdge && isVisibleNodeId(firstEdge.target)) return firstEdge.target;
        }
        var firstVisible = nodes.find(function (node) { return !isUtility(node); });
        return firstVisible ? firstVisible.id : (nodes[0] && nodes[0].id);
      }

      function isUtility(node) {
        return ["startNode", "scoreNode", "variableNode", "conditionNode", "formulaNode", "goToNode", "progressionNode", "achievementNode"].indexOf(node && node.type) >= 0;
      }

      function isVisibleNodeId(id) {
        var node = nodes.find(function (item) { return item.id === id; });
        return Boolean(node && !isUtility(node));
      }

      function getVisibleNodes() {
        return nodes.filter(function (node) { return !isUtility(node); });
      }

      function getNode(id) {
        var node = nodes.find(function (item) { return item.id === id; });
        if (node && !isUtility(node)) return node;
        return getVisibleNodes()[0] || nodes[0];
      }

      function getVisibleIndex(node) {
        var visible = getVisibleNodes();
        var index = visible.findIndex(function (item) { return item.id === node.id; });
        return index >= 0 ? index + 1 : state.index + 1;
      }

      function renderCurrent() {
        clearPlaybackTimers();
        var node = getNode(state.currentId);
        if (!node) {
          renderEmpty();
          return;
        }
        state.currentId = node.id;
        state.index = getVisibleIndex(node);
        var data = node.data || {};
        var answers = normalizeAnswers(data);
        var hasAnswerImages = answers.some(function (answer) { return Boolean(answer.imageUrl); });
        var hasNodeMedia = Boolean(data.imageUrl || data.mediaUrl);
        var isInfo = node.type === "infoNode";
        var isFeedback = node.type === "feedbackNode";
        var isResult = node.type === "resultNode";
        var isStory = isInfo || isFeedback;
        var activeSettings = mergeSettings(settings, data.screenQuiz || {});
        var layout = resolveLayout(activeSettings.layout, answers, hasAnswerImages, hasNodeMedia, isResult, isStory);

        applySettings(activeSettings);
        badge.textContent = labelFor(node, state.index);
        scene.replaceChildren();
        scene.className = "sq-scene is-entering";
        window.setTimeout(function () { scene.classList.remove("is-entering"); }, getTransitionMs(activeSettings));

        var content = el("div", "sq-content " + layout);
        content.setAttribute("data-answer-count", String(Math.min(answers.length, 4)));
        scene.setAttribute("data-answer-count", String(Math.min(answers.length, 4)));
        scene.removeAttribute("data-correct-count");
        var questionWrap = el("div", "sq-question-wrap");
        var title = data.question || data.title || data.label || data.message || data.description || "Вопрос";

        if (isInfo) {
          content.appendChild(renderInfoScene(data));
        } else if (isFeedback) {
          content.appendChild(renderFeedbackScene(data));
        } else if (isResult) {
          questionWrap.appendChild(renderReveal(data));
        } else if (layout !== "image-grid" && layout !== "hero-media") {
          questionWrap.appendChild(renderQuestion(title, data.description || data.text || ""));
        }

        if (isStory) {
          // Story scenes render their own premium composition.
        } else if (layout === "image-grid") {
          questionWrap.appendChild(renderQuestion(title, data.description || ""));
          content.appendChild(questionWrap);
          content.appendChild(renderImageGrid(answers));
        } else if (layout === "hero-media") {
          content.appendChild(renderMediaCard(data.imageUrl || data.mediaUrl || "", data.title || data.label || ""));
          if (title) content.appendChild(renderQuestion(title, data.description || ""));
          content.appendChild(renderNextButton(data.buttonText || "Дальше"));
        } else {
          if (answers.length > 0) questionWrap.appendChild(renderAnswers(answers, node));
          else if (!isResult) questionWrap.appendChild(renderNextButton(data.buttonText || "Дальше"));
          var mediaCard = hasNodeMedia && isMediaLayout(layout)
            ? renderMediaCard(data.imageUrl || data.mediaUrl || "", data.title || data.label || "")
            : null;
          if (mediaCard && (layout === "media-left" || layout === "media-top")) {
            content.appendChild(mediaCard);
            content.appendChild(questionWrap);
          } else {
            content.appendChild(questionWrap);
            if (mediaCard) content.appendChild(mediaCard);
          }
        }

        scene.appendChild(content);
        scene.appendChild(renderFooter(activeSettings));
        requestAnimationFrame(fitQuestionTitles);
        window.setTimeout(fitQuestionTitles, 180);
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(fitQuestionTitles).catch(function () {});
        }
        scheduleAutoAdvance(node, answers, activeSettings);
      }

      function resolveLayout(configured, answers, hasAnswerImages, hasNodeMedia, isResult, isStory) {
        if (isStory) return "story-scene";
        if (configured && configured !== "auto") return configured;
        if (isResult) return "question-only";
        if (hasAnswerImages) return "image-grid";
        if (hasNodeMedia && answers.length > 0) return "media-right";
        if (hasNodeMedia) return "hero-media";
        return "question-only";
      }

      function isMediaLayout(layout) {
        return layout === "media-right" || layout === "media-left" || layout === "media-top";
      }

      function labelFor(node, index) {
        var data = node.data || {};
        if (node.type === "resultNode") return "Ответ";
        var title = cleanBadgeText(data.nodeTitle || data.headerTitle || data.title);
        if (title) return title;
        var label = cleanBadgeText(data.label);
        if (label && !isDefaultBadgeLabel(label)) return label;
        if (node.type === "infoNode") return "Информация";
        if (node.type === "feedbackNode") return "Фидбэк";
        return "Вопрос " + index;
      }

      function cleanBadgeText(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
      }

      function isDefaultBadgeLabel(value) {
        return /^(start|старт|новый вопрос|множественный выбор|вопрос)$/i.test(String(value || "").trim());
      }

      function renderQuestion(title, description) {
        var card = el("article", "sq-question-card");
        var h = el("h1", "sq-title", title);
        var normalizedTitle = String(title || "");
        card.setAttribute("data-long", normalizedTitle.length > 58 ? "true" : "false");
        card.setAttribute("data-very-long", normalizedTitle.length > 132 ? "true" : "false");
        h.style.setProperty("--sq-title-scale", titleScale(normalizedTitle));
        card.appendChild(h);
        if (description) card.appendChild(el("p", "sq-desc", description));
        return card;
      }

      function renderReveal(data) {
        var card = el("article", "sq-answer-reveal");
        var text = data.title || data.message || data.description || "Ответ";
        card.appendChild(el("h1", "sq-title", text));
        if (data.description && data.description !== text) card.appendChild(el("p", "sq-desc", data.description));
        return card;
      }

      function renderInfoScene(data) {
        var card = el("article", "sq-story-card sq-info-card");
        var copy = el("div", "sq-story-copy sq-story-main");
        var body = data.description || data.text || data.message || data.title || "Перед началом викторины внимательно изучите правила и настройтесь на игру.";
        appendStoryBody(copy, body);
        card.appendChild(copy);
        if (hasStoryMedia(data)) {
          card.classList.add("has-media");
          card.appendChild(renderStoryMedia(data, data.title || data.label || "Информация"));
        }
        return card;
      }

      function renderFeedbackScene(data) {
        var card = el("article", "sq-story-card sq-feedback-card");
        var copy = el("div", "sq-story-copy sq-feedback-copy sq-story-main");
        var body = data.message || data.explanation || data.description || data.text || data.title || "Посмотрите объяснение и переходите к следующему экрану.";
        appendStoryBody(copy, body);
        card.appendChild(copy);
        if (hasStoryMedia(data)) {
          card.classList.add("has-media");
          card.appendChild(renderStoryMedia(data, data.title || "Фидбэк"));
        }
        return card;
      }

      function appendStoryBody(container, text) {
        var lines = String(text || "").split(/\\n+/).map(function (line) {
          return line.replace(/^[-•*]\\s*/, "").trim();
        }).filter(Boolean);
        if (lines.length >= 2 && lines.length <= 5) {
          var list = el("ul", "sq-story-points");
          lines.forEach(function (line) {
            list.appendChild(el("li", "sq-story-point", line));
          });
          container.appendChild(list);
          return;
        }
        container.appendChild(el("p", "sq-story-body", text));
      }

      function renderStoryVisual(data, fallbackText, alt) {
        var visual = el("div", "sq-story-visual");
        var url = safeUrl(data.imageUrl || data.mediaUrl);
        if (url) visual.appendChild(renderStoryImage(url, data.title || alt || ""));
        else visual.appendChild(el("div", "sq-story-emblem", fallbackText));
        return visual;
      }

      function renderStoryImage(url, alt) {
        var img = document.createElement("img");
        img.alt = alt || "";
        img.src = safeUrl(url) || placeholderImage(0);
        img.addEventListener("error", function () {
          if (img.src !== placeholderImage(0)) img.src = placeholderImage(0);
        }, { once: true });
        return img;
      }

      function hasStoryMedia(data) {
        return Boolean(safeUrl(data.imageUrl || data.mediaUrl || data.videoUrl || ""));
      }

      function renderStoryMedia(data, alt) {
        var media = el("figure", "sq-story-media");
        var videoUrl = safeUrl(data.videoUrl || "");
        var rutubeId = getRutubeId(videoUrl);
        if (rutubeId) {
          var iframe = document.createElement("iframe");
          iframe.src = "https://rutube.ru/play/embed/" + rutubeId;
          iframe.title = alt || "Видео";
          iframe.loading = "lazy";
          iframe.allow = "clipboard-write; autoplay; encrypted-media; fullscreen";
          iframe.setAttribute("allowfullscreen", "true");
          media.classList.add("is-video");
          media.appendChild(iframe);
          return media;
        }
        media.appendChild(renderStoryImage(data.imageUrl || data.mediaUrl || "", alt || ""));
        return media;
      }

      function getRutubeId(url) {
        var match = String(url || "").match(/^https?:\\/\\/(?:www\\.)?rutube\\.ru\\/(?:video|play\\/embed)\\/([a-zA-Z0-9]+)/);
        return match ? match[1] : "";
      }

      function renderAnswers(answers, node) {
        var list = el("div", "sq-answers");
        answers.forEach(function (answer, index) {
          var button = el("div", "sq-option");
          var answerText = answer.text || "";
          var rawLetter = String(answer.letter || String.fromCharCode(65 + index));
          var displayLetter = /[.)]$/.test(rawLetter) ? rawLetter : rawLetter + ".";
          button.setAttribute("role", "presentation");
          button.setAttribute("data-answer-id", answer.id);
          button.appendChild(el("span", "sq-letter", displayLetter));
          button.appendChild(el("span", "sq-option-text", answer.text || ("Ответ " + (index + 1))));
          var optionText = button.lastElementChild;
          if (optionText) optionText.style.setProperty("--sq-answer-scale", answerScale(String(answerText)));
          list.appendChild(button);
        });
        return list;
      }

      function titleScale(text) {
        var length = String(text || "").length;
        if (length > 220) return "0.72";
        if (length > 180) return "0.78";
        if (length > 140) return "0.84";
        if (length > 105) return "0.9";
        if (length > 78) return "0.96";
        if (length > 60) return "0.98";
        return "1";
      }

      function fitQuestionTitles() {
        var titles = scene.querySelectorAll(".sq-question-card .sq-title");
        Array.from(titles).forEach(function (title) {
          var card = title.closest(".sq-question-card");
          if (!card) return;
          title.style.fontSize = "";
          var size = Number.parseFloat(window.getComputedStyle(title).fontSize) || 32;
          var minSize = Math.max(20, Math.min(30, window.innerWidth * 0.0125));
          var attempts = 0;
          while (attempts < 18 && size > minSize && isOverflowingQuestion(card, title)) {
            size = Math.max(minSize, size * 0.94);
            title.style.fontSize = size.toFixed(2) + "px";
            attempts += 1;
          }
        });
      }

      function isOverflowingQuestion(card, title) {
        var cardRect = card.getBoundingClientRect();
        var titleRect = title.getBoundingClientRect();
        var cardStyle = window.getComputedStyle(card);
        var paddingY = (Number.parseFloat(cardStyle.paddingTop) || 0) + (Number.parseFloat(cardStyle.paddingBottom) || 0);
        var availableHeight = cardRect.height - paddingY - 4;
        return title.scrollWidth > title.clientWidth + 2 || titleRect.height > availableHeight;
      }

      function answerScale(text) {
        var length = String(text || "").length;
        if (length > 62) return "0.72";
        if (length > 42) return "0.82";
        return "1";
      }

      function renderImageGrid(answers) {
        var grid = el("div", "sq-image-grid");
        grid.style.setProperty("--sq-grid-count", String(Math.min(Math.max(answers.length, 2), 4)));
        answers.forEach(function (answer, index) {
          var card = el("div", "sq-choice-card");
          card.setAttribute("role", "presentation");
          card.setAttribute("data-answer-id", answer.id);
          var img = document.createElement("img");
          img.alt = answer.text || "";
          img.src = safeUrl(answer.imageUrl) || placeholderImage(index);
          card.appendChild(img);
          card.appendChild(el("div", "sq-choice-title", answer.text || String.fromCharCode(65 + index)));
          grid.appendChild(card);
        });
        return grid;
      }

      function renderMediaCard(url, alt) {
        var card = el("figure", "sq-media-card");
        var img = document.createElement("img");
        img.alt = alt || "";
        img.src = safeUrl(url) || placeholderImage(0);
        img.addEventListener("error", function () {
          if (img.src !== placeholderImage(0)) img.src = placeholderImage(0);
        }, { once: true });
        card.appendChild(img);
        return card;
      }

      function renderNextButton(text) {
        var button = el("div", "sq-next", text);
        button.setAttribute("role", "presentation");
        return button;
      }

      function renderFooter(config) {
        var footer = el("footer", "sq-footer");
        if (config.showTimer === false) return footer;
        var timer = el("div", "sq-timer");
        var fill = el("div", "sq-timer-fill");
        var clock = el("div", "sq-clock");
        timer.appendChild(fill);
        timer.appendChild(clock);
        footer.appendChild(timer);
        return footer;
      }

      function renderEmpty() {
        scene.replaceChildren(renderQuestion("Добавьте вопрос", "Экранная викторина покажет ваши вопросы в формате 16:9."));
      }

      function isCorrect(answer, node) {
        var data = (node && node.data) || {};
        if (Array.isArray(data.correctOptions)) return data.correctOptions.indexOf(answer.id) >= 0;
        if (typeof data.correctAnswer === "string") return data.correctAnswer === answer.id || data.correctAnswer === answer.text;
        var answers = normalizeAnswers(data);
        if (answers.some(function (item) { return item.isCorrect === true; })) return answer.isCorrect === true;
        if (typeof answer.isCorrect === "boolean") return answer.isCorrect;
        return null;
      }

      function scheduleAutoAdvance(node, answers, config) {
        var token = state.token;
        var duration = getTimerMs(config);
        state.revealTimerId = window.setTimeout(function () {
          if (token !== state.token) return;
          var handle = answers.length > 0 ? revealCorrectAnswer(node, answers) : undefined;
          var correctCount = answers.filter(function (answer) { return isCorrect(answer, node) === true; }).length;
          var delay = answers.length > 0 ? Math.min(1900, 1180 + Math.max(0, correctCount - 1) * 180) : 120;
          transitionToNext(handle, delay, token, config);
        }, duration);
      }

      function clearPlaybackTimers() {
        if (state.revealTimerId) window.clearTimeout(state.revealTimerId);
        if (state.transitionTimerId) window.clearTimeout(state.transitionTimerId);
        state.revealTimerId = null;
        state.transitionTimerId = null;
        state.locked = false;
        state.token += 1;
      }

      function revealCorrectAnswer(node, answers) {
        var correctAnswers = answers.filter(function (answer) { return isCorrect(answer, node) === true; });
        var correctIds = correctAnswers.map(function (answer) { return answer.id; });
        var hasCorrectAnswer = correctIds.length > 0;
        scene.setAttribute("data-correct-count", correctIds.length > 1 ? "multi" : String(correctIds.length));
        Array.from(scene.querySelectorAll("[data-answer-id]")).forEach(function (element) {
          if (!(element instanceof HTMLElement)) return;
          var answerId = element.getAttribute("data-answer-id") || "";
          var isRight = correctIds.indexOf(answerId) >= 0;
          element.classList.remove("selected");
          if (hasCorrectAnswer && isRight) {
            element.style.setProperty("--sq-reveal-order", String(Math.max(0, correctIds.indexOf(answerId))));
            element.classList.add("correct", "auto-reveal");
          } else if (hasCorrectAnswer) {
            element.style.removeProperty("--sq-reveal-order");
            element.classList.add("wrong");
          }
        });
        return hasCorrectAnswer ? correctAnswers[0].id : undefined;
      }

      function transitionToNext(handle, delay, token, config) {
        state.transitionTimerId = window.setTimeout(function () {
          if (token !== state.token || state.locked) return;
          state.locked = true;
          scene.classList.add("is-leaving");
          var transitionMs = getTransitionMs(config);
          state.transitionTimerId = window.setTimeout(function () {
            if (token !== state.token) return;
            state.locked = false;
            goNext(handle, true);
          }, transitionMs);
        }, delay);
      }

      function getTimerMs(config) {
        return clamp(config.timerSeconds, 5, 180, 30) * 1000;
      }

      function getTransitionMs(config) {
        var effect = normalizeTransitionEffect(config.transitionEffect);
        if (config.motion === "off") return 1;
        if (effect === "glitch-cut") return 280;
        if (effect === "pixel-dissolve") return 380;
        return 340;
      }

      function goNext(handle, force) {
        if (state.locked && !force) return;
        var current = getNode(state.currentId);
        if (!current) return;
        var linkedNextId = getLinkedVisibleNodeId(current.id, handle);
        if (linkedNextId) {
          state.currentId = linkedNextId;
          renderCurrent();
          return;
        }
        var next = getNextVisibleNode(current.id);
        if (next) {
          state.currentId = next.id;
          renderCurrent();
        }
      }

      function getLinkedVisibleNodeId(sourceId, handle) {
        var outgoing = edges.filter(function (edge) { return edge.source === sourceId; });
        var preferred = outgoing.find(function (item) { return handle && item.sourceHandle === handle; });
        var candidates = preferred ? [preferred] : outgoing;
        for (var i = 0; i < candidates.length; i += 1) {
          var targetId = candidates[i] && candidates[i].target;
          if (isVisibleNodeId(targetId)) return targetId;
        }
        return null;
      }

      function getNextVisibleNode(currentId) {
        var visible = getVisibleNodes();
        var index = visible.findIndex(function (node) { return node.id === currentId; });
        var next = visible[index + 1] || visible[0];
        return next || null;
      }

      function normalizeAnswers(data) {
        var raw = Array.isArray(data.answers) ? data.answers : Array.isArray(data.options) ? data.options : [];
        return raw.map(function (answer, index) {
          if (typeof answer === "string") return { id: "a" + index, text: answer };
          return {
            id: String(answer.id || answer.value || ("a" + index)),
            text: String(answer.text || answer.label || answer.title || answer.value || ("Ответ " + (index + 1))),
            imageUrl: answer.imageUrl || answer.image || answer.mediaUrl || "",
            isCorrect: answer.isCorrect,
            letter: answer.letter
          };
        });
      }

      function mergeSettings(base, override) {
        var merged = {};
        Object.keys(base || {}).forEach(function (key) {
          merged[key] = base[key];
        });
        Object.keys(override || {}).forEach(function (key) {
          var value = override[key];
          if (value !== undefined && value !== null && value !== "") {
            merged[key] = value;
          }
        });
        return merged;
      }

      function applySettings(config) {
        var preset = config.backgroundPreset || "pop";
        var palette = palettes()[preset] || palettes().pop;
        var transitionEffect = normalizeTransitionEffect(config.transitionEffect);
        root.setAttribute("data-preset", preset);
        root.setAttribute("data-transition", transitionEffect);
        setVar("--sq-bg", config.backgroundColor || palette.bg);
        setVar("--sq-accent", config.accentColor || palette.accent);
        setVar("--sq-accent-2", config.secondaryColor || palette.secondary);
        setVar("--sq-panel", config.panelColor || palette.panel);
        setVar("--sq-answer", config.answerColor || palette.answer);
        setVar("--sq-ink", config.inkColor || palette.ink);
        setVar("--sq-correct", config.correctColor || palette.correct);
        setVar("--sq-border", clamp(config.borderWidth, 4, 18, 10) + "px");
        setVar("--sq-radius", clamp(config.radius, 24, 80, 54) + "px");
        setVar("--sq-decor", String(clamp(config.decorIntensity, 0, 1.4, 1)));
        setVar("--sq-duration", String(clamp(config.timerSeconds, 5, 180, 30)) + "s");
        setVar("--sq-transition-duration", String(getTransitionMs(config)) + "ms");
        setVar("--sq-motion-scale", motionScale(config.motion));
        var image = safeUrl(config.backgroundImageUrl);
        setVar("--sq-bg-image", image ? "url('" + image + "')" : palette.image);
      }

      function normalizeTransitionEffect(value) {
        var allowed = ["swipe-reveal", "pixel-dissolve", "zoom-in-reveal", "glitch-cut"];
        return allowed.indexOf(value) >= 0 ? value : "swipe-reveal";
      }

      function palettes() {
        return {
          none: {
            bg: "#9a4bdb", accent: "#ffc928", secondary: "#7c5ce7", panel: "#f1eef6", answer: "#eeeeec", ink: "#050305", correct: "#18c900",
            image: "none"
          },
          pop: {
            bg: "#9a4bdb", accent: "#ffc928", secondary: "#7c5ce7", panel: "#f1eef6", answer: "#eeeeec", ink: "#050305", correct: "#18c900",
            image: "linear-gradient(135deg, #8d2cc0 0%, #f781b5 45%, #ffd452 100%)"
          },
          candy: {
            bg: "#c916b8", accent: "#ffc12b", secondary: "#8a60ff", panel: "#ded1f2", answer: "#eeeeec", ink: "#050305", correct: "#18c900",
            image: "linear-gradient(135deg, #9120b7 0%, #fb6fc3 46%, #89d9ff 100%)"
          },
          aqua: {
            bg: "#5ed7d1", accent: "#ffd238", secondary: "#6554d9", panel: "#c8f3ed", answer: "#f2eee6", ink: "#050305", correct: "#16bf00",
            image: "linear-gradient(135deg, #63d8d0 0%, #ffd079 48%, #f57335 100%)"
          },
          yellow: {
            bg: "#ffd027", accent: "#2a0d3f", secondary: "#ffffff", panel: "#ffe779", answer: "#2a0d3f", ink: "#09050e", correct: "#16bf00",
            image: "radial-gradient(circle at 12% 18%, #ffe779 0 10rem, transparent 10.2rem), radial-gradient(circle at 86% 72%, #efb800 0 12rem, transparent 12.2rem), #ffd027"
          },
          travel: {
            bg: "#968870", accent: "#f2c39e", secondary: "#eeb7dc", panel: "#f5f1e8", answer: "#f5f1e8", ink: "#050305", correct: "#18c900",
            image: "radial-gradient(circle at 26% 50%, #f5f1e8 0 36%, transparent 36.4%), repeating-linear-gradient(0deg, rgba(110,70,28,0.1) 0 2px, transparent 2px 18px), #968870"
          }
        };
      }

      function setVar(name, value) {
        document.documentElement.style.setProperty(name, value);
      }

      function clamp(value, min, max, fallback) {
        var number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.max(min, Math.min(max, number));
      }

      function motionScale(value) {
        if (value === "calm") return "0.55";
        if (value === "show") return "1.35";
        return "1";
      }

      function safeUrl(value) {
        if (typeof value !== "string") return "";
        var raw = value.trim();
        if (!raw || /[\\n\\r"'<>]/.test(raw) || /^javascript:/i.test(raw)) return "";
        return raw;
      }

      function placeholderImage(index) {
        var colors = ["9a4bdb", "ffc928", "5ed7d1", "ef4d98"];
        return "https://placehold.co/900x1100/" + colors[index % colors.length] + "/050305?text=QUIZ";
      }

      function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = String(text);
        return node;
      }
    })();
  </script>
</body>
</html>
`;

export default screenQuizTemplate;
