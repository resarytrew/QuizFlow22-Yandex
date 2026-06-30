const defaultTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Интерактивный квиз</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,650&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #f6f3ee;
            --bg-image: none;
            --overlay-color: rgba(246, 243, 238, 0);
            --overlay-opacity: 0;

            --font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            --display-family: 'Newsreader', Georgia, serif;
            --heading-color: #1d1a16;
            --body-text-color: #615d54;
            --muted-text: #8a8478;

            --surface: rgba(255, 255, 252, 0.92);
            --surface-solid: #fffefa;
            --surface-muted: #f1eee7;
            --surface-raised: #ffffff;
            --border: rgba(39, 35, 28, 0.11);
            --border-strong: rgba(39, 35, 28, 0.18);
            --focus-ring: rgba(47, 93, 80, 0.22);
            --shadow-soft: 0 10px 28px rgba(56, 47, 35, 0.07);
            --shadow-control: 0 8px 20px rgba(47, 93, 80, 0.1);
            --shadow-contact: 0 1px 1px rgba(56, 47, 35, 0.035), 0 10px 24px rgba(56, 47, 35, 0.07);
            --bezel-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.82), inset 0 -1px 0 rgba(39, 35, 28, 0.035);

            --motion-quick: 160ms;
            --motion-base: 260ms;
            --motion-slow: 560ms;
            --ease-standard: cubic-bezier(0.22, 1, 0.36, 1);
            --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
            --ease-press: cubic-bezier(0.34, 1.56, 0.64, 1);

            --accent: #2f5d50;
            --accent-hover: #25493f;
            --accent-soft: #e3eee8;
            --accent-ink: #ffffff;
            --success: #27745d;
            --danger: #b24b44;
            --warning: #b9852b;

            --btn-bg: var(--accent);
            --btn-text: var(--accent-ink);
            --btn-hover-bg: var(--accent-hover);
            --btn-hover-text: #ffffff;
            --btn-radius: 18px;

            --card-bg: #fffefa;
            --card-text: #24211c;
            --card-hover-bg: #f7f4ed;
            --card-hover-text: #171512;
            --card-selected-bg: #e5f0ea;
            --card-selected-text: #183b32;
            --card-radius: 28px;
            --answer-radius: 18px;
            --content-width: 920px;
            --card-padding: 32px;
            --surface-opacity: 0.94;
            --heading-weight: 650;
            --body-weight: 450;
            --heading-scale: 1;
            --body-scale: 1;
            --body-line-height: 1.55;
            --letter-spacing: 0px;
            --btn-height: 54px;
            --btn-weight: 800;
            --answer-border: var(--border);
            --answer-selected-border: rgba(47, 93, 80, 0.42);
            --answer-gap: 12px;
            --progress-color: var(--accent);
            --progress-track: rgba(29, 26, 22, 0.1);
        }

        *, *::before, *::after {
            box-sizing: border-box;
        }

        html {
            min-height: 100%;
            width: 100%;
            background: var(--bg-color);
            overflow-x: hidden;
        }

        body {
            min-height: 100dvh;
            width: 100%;
            margin: 0;
            font-family: var(--font-family);
            color: var(--body-text-color);
            background-color: var(--bg-color);
            background-image:
                var(--bg-image),
                radial-gradient(circle at 18% 0%, rgba(47, 93, 80, 0.04), transparent 34rem),
                radial-gradient(circle at 90% 18%, rgba(185, 133, 43, 0.04), transparent 30rem);
            background-position: center;
            background-size: var(--bg-size, cover);
            background-attachment: fixed;
            position: relative;
            isolation: isolate;
            line-height: 1.55;
            font-size: calc(16px * var(--body-scale, 1));
            font-weight: var(--body-weight, 450);
            letter-spacing: var(--letter-spacing, 0px);
            line-height: var(--body-line-height, 1.55);
            text-rendering: geometricPrecision;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
        }

        body::before {
            content: "";
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            background: var(--overlay-color);
            opacity: var(--overlay-opacity);
        }

        body::after {
            content: "";
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            background: repeating-linear-gradient(90deg, rgba(29, 26, 22, 0.018) 0, rgba(29, 26, 22, 0.018) 1px, transparent 1px, transparent 7px);
            opacity: 0.06;
        }

        button, input, textarea, select {
            font: inherit;
        }

        button {
            -webkit-tap-highlight-color: transparent;
        }

        .hidden {
            display: none !important;
        }

        .quiz-shell {
            width: 100%;
            min-height: 100dvh;
            padding: 18px;
            position: relative;
            z-index: 1;
            overflow-x: hidden;
        }

        .quiz-topbar {
            position: sticky;
            top: 18px;
            z-index: 40;
            width: 100%;
            max-width: 1180px;
            margin: 0 auto;
            border: 1px solid var(--border);
            border-radius: 24px;
            background: rgba(255, 254, 250, 0.86);
            backdrop-filter: blur(18px);
            box-shadow: 0 10px 30px rgba(39, 35, 28, 0.07);
            opacity: 0;
            transform: translateY(-8px);
            animation: shellIn var(--motion-slow) var(--ease-spring) 20ms forwards;
        }

        .topbar-inner {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto auto;
            align-items: center;
            gap: 18px;
            padding: 12px 16px;
        }

        .brand-lockup {
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        #header-logo {
            width: 38px;
            height: 38px;
            flex: 0 0 auto;
            display: grid;
            place-items: center;
            border-radius: 14px;
            background: #1d1a16;
            color: #fffefa;
            font-size: 0.88rem;
            font-weight: 800;
            letter-spacing: 0;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18);
        }

        .brand-copy {
            min-width: 0;
            display: grid;
            gap: 1px;
        }

        .brand-kicker {
            color: var(--muted-text);
            font-size: 0.68rem;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        #header-title {
            overflow: hidden;
            color: var(--heading-color);
            font-size: 0.96rem;
            font-weight: 800;
            white-space: nowrap;
            text-overflow: ellipsis;
        }

        .timer-pill {
            min-width: 104px;
            min-height: 40px;
            display: inline-grid;
            place-items: center;
            border: 1px solid rgba(185, 133, 43, 0.32);
            border-radius: 999px;
            background: #fff8eb;
            color: #91621d;
            font-variant-numeric: tabular-nums;
            font-size: 1rem;
            font-weight: 800;
        }

        .timer-pill.is-urgent,
        .timer-pill.text-red-600 {
            border-color: rgba(178, 75, 68, 0.34);
            background: #fff0ef;
            color: var(--danger);
        }

        .top-progress {
            min-width: 92px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            color: var(--muted-text);
            font-size: 0.78rem;
            font-weight: 800;
        }

        .top-progress-track {
            width: 44px;
            height: 6px;
            overflow: hidden;
            border-radius: 999px;
            background: var(--progress-track);
        }

        .top-progress-fill {
            width: 0%;
            height: 100%;
            border-radius: inherit;
            background: var(--progress-color);
            transition: width 520ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .quiz-main {
            width: min(calc(var(--content-width, 920px) + 260px), 100%);
            min-width: 0;
            margin: 0 auto;
            padding: 34px 0 48px;
        }

        .quiz-layout {
            min-width: 0;
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(260px, 318px);
            align-items: start;
            gap: 22px;
        }

        .quiz-stage {
            min-width: 0;
            position: relative;
        }

        .quiz-stage::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: calc(var(--card-radius) + 10px);
            background: rgba(255, 254, 250, 0.08);
            box-shadow: none;
            pointer-events: none;
            z-index: 0;
        }

        #quiz-view {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            min-height: clamp(460px, 66dvh, 780px);
            border: 1px solid var(--border);
            border-radius: var(--card-radius);
            background:
                linear-gradient(180deg, rgba(255, 254, 250, 0.94), rgba(255, 253, 248, 0.86)),
                var(--surface-solid);
            box-shadow: var(--shadow-soft), var(--bezel-highlight);
            padding: clamp(22px, 4vw, var(--card-padding, 58px));
            position: relative;
            overflow: hidden;
            z-index: 1;
            transition: box-shadow var(--motion-base) var(--ease-standard), border-color var(--motion-base) var(--ease-standard);
            opacity: 0;
            transform: translateY(14px);
            animation: shellIn var(--motion-slow) var(--ease-spring) 80ms forwards;
        }

        #quiz-view::before {
            content: "";
            position: absolute;
            inset: 14px;
            border: 1px solid rgba(39, 35, 28, 0.06);
            border-radius: calc(var(--card-radius) - 10px);
            pointer-events: none;
        }

        #quiz-view::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background:
                linear-gradient(135deg, rgba(255,255,255,0.34), transparent 32%),
                linear-gradient(315deg, rgba(47, 93, 80, 0.045), transparent 38%);
            opacity: 0.68;
            pointer-events: none;
        }

        .node-frame {
            min-width: 0;
            min-height: calc(clamp(460px, 66dvh, 780px) - clamp(48px, 8.6vw, 116px));
            display: flex;
            flex-direction: column;
            justify-content: center;
            position: relative;
            z-index: 1;
        }

        .node-frame[data-node-type="questionNode"],
        .node-frame[data-node-type="multipleChoiceNode"],
        .node-frame[data-node-type="matchingNode"],
        .node-frame[data-node-type="timelineNode"],
        .node-frame[data-node-type="textInputNode"],
        .node-frame[data-node-type="collectInfoNode"],
        .node-frame[data-node-type="allocatorNode"] {
            justify-content: flex-start;
        }

        .node-title {
            max-width: 780px;
            margin: 0 0 16px;
            color: var(--heading-color);
            font-family: var(--display-family);
            font-size: calc(clamp(2rem, 4.2vw, 4.35rem) * var(--heading-scale, 1));
            font-weight: var(--heading-weight, 650);
            line-height: 0.96;
            letter-spacing: 0;
            overflow-wrap: anywhere;
            text-wrap: balance;
            opacity: 0;
            transform: translateY(14px);
            animation: copyIn var(--motion-slow) var(--ease-spring) 40ms forwards;
        }

        .node-desc {
            max-width: 720px;
            margin: 0 0 clamp(24px, 3.2vw, 42px);
            color: var(--body-text-color);
            font-size: clamp(1rem, 1.45vw, 1.24rem);
            overflow-wrap: anywhere;
            text-wrap: pretty;
            opacity: 0;
            transform: translateY(12px);
            animation: copyIn var(--motion-slow) var(--ease-spring) 100ms forwards;
        }

        .node-desc :first-child,
        .node-title :first-child {
            margin-top: 0;
        }

        .node-desc :last-child,
        .node-title :last-child {
            margin-bottom: 0;
        }

        .node-controls {
            width: 100%;
            display: grid;
            gap: 14px;
            position: relative;
        }

        .node-controls > *:not(.option):not(.video-lock-overlay) {
            opacity: 0;
            transform: translateY(12px) scale(0.992);
            animation: controlIn var(--motion-slow) var(--ease-spring) forwards;
            animation-delay: calc(var(--control-index, 0) * 62ms + 150ms);
        }

        .md-content strong,
        .md-content b {
            color: var(--accent);
            font-weight: 800;
        }

        .md-content em {
            color: var(--warning);
        }

        .md-content u {
            text-decoration: none;
            box-shadow: inset 0 -0.34em 0 rgba(47, 93, 80, 0.16);
        }

        .md-content a {
            color: var(--accent);
            text-underline-offset: 0.22em;
        }

        .btn {
            min-height: var(--btn-height, 54px);
            width: fit-content;
            position: relative;
            overflow: hidden;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            border: 0;
            border-radius: var(--btn-radius);
            padding: 0 24px;
            background: var(--btn-bg);
            color: var(--btn-text);
            box-shadow: var(--shadow-control);
            cursor: pointer;
            font-size: 0.98rem;
            font-weight: var(--btn-weight, 800);
            line-height: 1;
            transition:
                transform var(--motion-base) var(--ease-spring),
                background-color var(--motion-base) var(--ease-standard),
                color var(--motion-base) var(--ease-standard),
                box-shadow var(--motion-base) var(--ease-standard),
                opacity var(--motion-base) var(--ease-standard);
        }

        .btn::after {
            content: "";
            position: absolute;
            inset: 1px;
            border-radius: calc(var(--btn-radius) - 1px);
            background: linear-gradient(135deg, rgba(255,255,255,0.22), transparent 48%);
            opacity: 0.9;
            pointer-events: none;
        }

        .btn:hover {
            transform: translateY(-2px);
            background: var(--btn-hover-bg);
            color: var(--btn-hover-text);
            box-shadow: 0 18px 42px rgba(47, 93, 80, 0.18);
        }

        .btn:active {
            transform: translateY(1px) scale(0.985);
        }

        .btn:focus-visible,
        .option:focus-visible,
        .match-item:focus-visible,
        .timeline-controls button:focus-visible,
        .text-field:focus-visible,
        .range-field:focus-visible {
            outline: 0;
            box-shadow: 0 0 0 5px var(--focus-ring);
        }

        .btn:disabled,
        .option:disabled,
        .timeline-controls button:disabled {
            cursor: not-allowed;
            opacity: 0.54;
            transform: none;
            box-shadow: none;
        }

        .action-btn {
            margin-top: 10px;
        }

        .option {
            width: 100%;
            min-height: 76px;
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: center;
            gap: var(--answer-gap, 16px);
            padding: 17px 18px;
            border: 1px solid var(--answer-border);
            border-radius: var(--answer-radius);
            background: var(--card-bg);
            color: var(--card-text);
            cursor: pointer;
            text-align: left;
            box-shadow: var(--bezel-highlight);
            opacity: 0;
            transform: translateY(12px) scale(0.992);
            animation: controlIn var(--motion-slow) var(--ease-spring) forwards;
            animation-delay: calc(var(--control-index, 0) * 62ms + 120ms);
            transition:
                transform var(--motion-base) var(--ease-spring),
                border-color var(--motion-base) var(--ease-standard),
                background-color var(--motion-base) var(--ease-standard),
                color var(--motion-base) var(--ease-standard),
                box-shadow var(--motion-base) var(--ease-standard),
                opacity var(--motion-base) var(--ease-standard);
        }

        .option::before {
            content: "";
            position: absolute;
            inset: -1px;
            border-radius: inherit;
            background: radial-gradient(circle at 22% 18%, rgba(47, 93, 80, 0.12), transparent 34%);
            opacity: 0;
            transform: scale(0.96);
            transition: opacity var(--motion-base) var(--ease-standard), transform var(--motion-base) var(--ease-spring);
            pointer-events: none;
        }

        .option::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            box-shadow: inset 0 0 0 0 rgba(47, 93, 80, 0);
            transition: box-shadow var(--motion-base) var(--ease-standard);
            pointer-events: none;
        }

        .option:hover {
            transform: translateY(-3px) scale(1.003);
            border-color: var(--border-strong);
            background: var(--card-hover-bg);
            color: var(--card-hover-text);
            box-shadow: var(--shadow-contact), var(--bezel-highlight);
        }

        .option:hover::before {
            opacity: 1;
            transform: scale(1);
        }

        .option:active {
            transform: translateY(0) scale(0.992);
        }

        .option.selected,
        .option[aria-pressed="true"] {
            border-color: var(--answer-selected-border);
            background: var(--card-selected-bg);
            color: var(--card-selected-text);
            box-shadow: 0 18px 38px rgba(47, 93, 80, 0.12);
        }

        .option.selected::after,
        .option[aria-pressed="true"]::after {
            box-shadow: inset 0 0 0 2px rgba(47, 93, 80, 0.22);
        }

        .option.confirm-flash {
            opacity: 1;
            animation: selectionPulse 520ms var(--ease-press);
        }

        .option-marker,
        .badge {
            position: relative;
            z-index: 1;
            width: 36px;
            height: 36px;
            display: grid;
            place-items: center;
            border-radius: 13px;
            background: var(--surface-muted);
            color: var(--muted-text);
            font-size: 0.78rem;
            font-weight: 900;
            transition: inherit;
        }

        .option.selected .option-marker,
        .option[aria-pressed="true"] .option-marker,
        .option.selected .badge,
        .option[aria-pressed="true"] .badge {
            background: var(--accent);
            color: var(--accent-ink);
        }

        .option-copy {
            position: relative;
            z-index: 1;
            min-width: 0;
            color: inherit;
            font-size: clamp(1rem, 1.35vw, 1.12rem);
            font-weight: 700;
            line-height: 1.35;
            overflow-wrap: anywhere;
        }

        .match-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
        }

        .match-col {
            display: grid;
            gap: 12px;
        }

        .match-item {
            min-height: 92px;
            position: relative;
            overflow: hidden;
            display: grid;
            place-items: center;
            gap: 10px;
            padding: 16px;
            border: 1px solid var(--border);
            border-radius: var(--answer-radius);
            background: var(--card-bg);
            color: var(--card-text);
            cursor: pointer;
            text-align: center;
            font-size: 1rem;
            font-weight: 800;
            box-shadow: var(--bezel-highlight);
            transition:
                transform var(--motion-base) var(--ease-spring),
                border-color var(--motion-base) var(--ease-standard),
                background-color var(--motion-base) var(--ease-standard),
                box-shadow var(--motion-base) var(--ease-standard),
                opacity var(--motion-base) var(--ease-standard);
        }

        .match-item::before {
            content: "";
            position: absolute;
            inset: -1px;
            border-radius: inherit;
            background: radial-gradient(circle at 50% 0%, rgba(47, 93, 80, 0.11), transparent 44%);
            opacity: 0;
            transition: opacity var(--motion-base) var(--ease-standard);
            pointer-events: none;
        }

        .match-item:hover {
            transform: translateY(-3px) scale(1.003);
            border-color: var(--border-strong);
            box-shadow: var(--shadow-contact), var(--bezel-highlight);
        }

        .match-item:hover::before {
            opacity: 1;
        }

        .match-item:active {
            transform: translateY(0) scale(0.992);
        }

        .match-item.selected {
            border-color: rgba(47, 93, 80, 0.42);
            background: var(--card-selected-bg);
            color: var(--card-selected-text);
        }

        .match-item.matched {
            border-color: rgba(39, 116, 93, 0.35);
            background: #edf7f1;
            color: #255b49;
            opacity: 0.72;
            pointer-events: none;
            animation: matchedLock 460ms var(--ease-press);
        }

        .match-item-image,
        .match-img {
            max-width: 100%;
            max-height: 124px;
            object-fit: contain;
            border-radius: 12px;
        }

        .timeline-container {
            display: grid;
            gap: 12px;
        }

        .timeline-item {
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: center;
            gap: 14px;
            padding: 14px;
            border: 1px solid var(--border);
            border-radius: var(--answer-radius);
            background: var(--card-bg);
            color: var(--card-text);
            box-shadow: var(--bezel-highlight);
            transition: border-color var(--motion-base) var(--ease-standard), box-shadow var(--motion-base) var(--ease-standard), transform var(--motion-base) var(--ease-spring);
        }

        .timeline-item:hover {
            transform: translateY(-2px);
            border-color: var(--border-strong);
            box-shadow: var(--shadow-contact), var(--bezel-highlight);
        }

        .timeline-controls {
            display: grid;
            gap: 5px;
        }

        .timeline-controls button {
            width: 34px;
            height: 30px;
            display: grid;
            place-items: center;
            border: 1px solid var(--border);
            border-radius: 10px;
            background: var(--surface-muted);
            color: var(--heading-color);
            cursor: pointer;
            font-size: 0.76rem;
            font-weight: 900;
            line-height: 1;
            transition: background-color var(--motion-base) var(--ease-standard), color var(--motion-base) var(--ease-standard), transform var(--motion-base) var(--ease-spring);
        }

        .timeline-controls button:hover {
            transform: translateY(-1px);
            background: var(--accent);
            color: var(--accent-ink);
        }

        .timeline-content {
            min-width: 0;
            color: var(--card-text);
            font-size: 1rem;
            font-weight: 800;
            overflow-wrap: anywhere;
        }

        .field {
            display: grid;
            gap: 8px;
        }

        .field-label,
        .allocator-label {
            color: var(--heading-color);
            font-size: 0.86rem;
            font-weight: 850;
        }

        .text-field,
        input[type="text"],
        input[type="email"],
        input[type="number"],
        input[type="tel"],
        input[type="date"] {
            width: 100%;
            min-height: 56px;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: rgba(255,255,252,0.88);
            color: var(--heading-color);
            padding: 0 16px;
            font-size: 1rem;
            font-weight: 650;
            transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
        }

        .text-field::placeholder {
            color: var(--muted-text);
            font-weight: 500;
        }

        .text-field:focus,
        input[type="text"]:focus,
        input[type="email"]:focus,
        input[type="number"]:focus,
        input[type="tel"]:focus,
        input[type="date"]:focus {
            outline: 0;
            border-color: rgba(47, 93, 80, 0.44);
            background: #ffffff;
            box-shadow: 0 0 0 5px var(--focus-ring);
        }

        .allocator-summary {
            display: inline-flex;
            width: fit-content;
            align-items: center;
            border: 1px solid rgba(47, 93, 80, 0.18);
            border-radius: 999px;
            background: var(--accent-soft);
            color: var(--accent);
            padding: 8px 12px;
            font-size: 0.84rem;
            font-weight: 900;
        }

        .allocator-row {
            display: grid;
            gap: 10px;
            padding: 14px;
            border: 1px solid var(--border);
            border-radius: var(--answer-radius);
            background: var(--card-bg);
            box-shadow: var(--bezel-highlight);
            transition: transform var(--motion-base) var(--ease-spring), border-color var(--motion-base) var(--ease-standard), box-shadow var(--motion-base) var(--ease-standard);
        }

        .allocator-row:hover {
            transform: translateY(-2px);
            border-color: var(--border-strong);
            box-shadow: var(--shadow-contact), var(--bezel-highlight);
        }

        .allocator-row-header {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            color: var(--heading-color);
        }

        .allocator-value {
            color: var(--accent);
            font-variant-numeric: tabular-nums;
            font-weight: 900;
        }

        .range-field,
        input[type="range"] {
            width: 100%;
            accent-color: var(--accent);
        }

        .dialogue-card {
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            gap: 16px;
            align-items: start;
            padding: 18px;
            border: 1px solid var(--border);
            border-radius: var(--answer-radius);
            background: var(--card-bg);
            box-shadow: var(--bezel-highlight);
        }

        .dialogue-card::before {
            content: "";
            position: absolute;
            inset: -1px;
            border-radius: inherit;
            background: linear-gradient(135deg, rgba(47, 93, 80, 0.08), transparent 44%);
            pointer-events: none;
        }

        .dialogue-avatar,
        .dialogue-avatar-fallback {
            width: 58px;
            height: 58px;
            border-radius: 18px;
            object-fit: cover;
            background: var(--accent-soft);
        }

        .dialogue-avatar-fallback {
            display: grid;
            place-items: center;
            color: var(--accent);
            font-size: 1.1rem;
            font-weight: 900;
        }

        .dialogue-meta {
            min-width: 0;
            display: grid;
            gap: 2px;
            margin-bottom: 12px;
        }

        .dialogue-name {
            color: var(--heading-color);
            font-size: 1rem;
            font-weight: 900;
        }

        .dialogue-role {
            color: var(--muted-text);
            font-size: 0.78rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .dialogue-text {
            color: var(--body-text-color);
            font-size: 1.02rem;
        }

        .timer-display {
            position: relative;
            overflow: hidden;
            display: grid;
            place-items: center;
            gap: 8px;
            width: min(220px, 100%);
            margin: 0 auto 16px;
            padding: 28px 20px;
            border: 1px solid var(--border);
            border-radius: var(--card-radius);
            background: var(--card-bg);
            box-shadow: var(--bezel-highlight);
        }

        .timer-value {
            color: var(--heading-color);
            font-size: clamp(3rem, 7vw, 5rem);
            font-weight: 900;
            font-variant-numeric: tabular-nums;
            line-height: 0.9;
        }

        .timer-label {
            color: var(--muted-text);
            font-size: 0.78rem;
            font-weight: 850;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        .feedback-bubble,
        .node-frame[data-node-type="feedbackNode"] .node-desc {
            padding: 18px;
            border: 1px solid rgba(47, 93, 80, 0.18);
            border-radius: var(--answer-radius);
            background: var(--accent-soft);
            color: var(--accent);
            font-weight: 750;
        }

        .result-summary {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 8px;
        }

        .result-stat {
            padding: 16px;
            border: 1px solid var(--border);
            border-radius: var(--answer-radius);
            background: var(--card-bg);
            box-shadow: var(--bezel-highlight);
        }

        .result-stat-label {
            color: var(--muted-text);
            font-size: 0.72rem;
            font-weight: 850;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        .result-stat-value {
            margin-top: 4px;
            color: var(--heading-color);
            font-size: 1.8rem;
            font-weight: 900;
        }

        .correct-answer {
            border-color: rgba(39, 116, 93, 0.42) !important;
            background: #eef8f2 !important;
        }

        .wrong-answer {
            border-color: rgba(178, 75, 68, 0.42) !important;
            background: #fff1ef !important;
        }

        .media-frame,
        .image-wrapper,
        .image-container {
            width: 100%;
            overflow: hidden;
            border: 1px solid var(--border);
            border-radius: 22px;
            background: #ebe7dc;
            margin-bottom: clamp(22px, 3vw, 34px);
        }

        .video-frame {
            position: relative;
            aspect-ratio: 16 / 9;
        }

        .video-frame iframe {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            border: 0;
        }

        .quiz-media-image,
        .image-wrapper img,
        .image-container img {
            display: block;
            width: 100%;
            max-height: min(52dvh, 520px);
            object-fit: contain;
            cursor: zoom-in;
        }

        .image-wrapper {
            position: relative;
            transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }

        .image-wrapper:hover {
            transform: translateY(-1px);
            border-color: rgba(47, 93, 80, 0.34);
            box-shadow: 0 18px 38px rgba(56, 47, 35, 0.09);
        }

        .image-wrapper .zoom-hint {
            position: absolute;
            right: 12px;
            bottom: 12px;
            border-radius: 999px;
            background: rgba(29, 26, 22, 0.72);
            color: #fffefa;
            padding: 7px 10px;
            font-size: 0.72rem;
            font-weight: 850;
            opacity: 0;
            transform: translateY(4px);
            transition: opacity 180ms ease, transform 180ms ease;
            pointer-events: none;
        }

        .image-wrapper:hover .zoom-hint {
            opacity: 1;
            transform: translateY(0);
        }

        #image-modal {
            position: fixed;
            inset: 0;
            z-index: 1000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 22px;
            background: rgba(25, 22, 18, 0.78);
            backdrop-filter: blur(14px);
            cursor: zoom-out;
            opacity: 0;
            transition: opacity 220ms ease;
        }

        #image-modal.open {
            display: flex;
            opacity: 1;
        }

        #image-modal img {
            max-width: min(92vw, 1180px);
            max-height: 90dvh;
            border-radius: 22px;
            box-shadow: 0 32px 90px rgba(0,0,0,0.36);
            transform: scale(0.98);
            transition: transform 220ms ease;
        }

        #image-modal.open img {
            transform: scale(1);
        }

        .quiz-hud {
            min-width: 0;
            position: sticky;
            top: 110px;
            display: grid;
            gap: 14px;
        }

        .hud-panel {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            border: 1px solid var(--border);
            border-radius: 24px;
            background: rgba(255, 254, 250, 0.78);
            backdrop-filter: blur(16px);
            box-shadow: 0 16px 42px rgba(56, 47, 35, 0.07), var(--bezel-highlight);
            padding: 18px;
            transition: transform var(--motion-base) var(--ease-spring), box-shadow var(--motion-base) var(--ease-standard), border-color var(--motion-base) var(--ease-standard);
            opacity: 0;
            transform: translateY(12px);
            animation: controlIn var(--motion-slow) var(--ease-spring) forwards;
        }

        .quiz-hud .hud-panel:nth-child(1) {
            animation-delay: 160ms;
        }

        .quiz-hud .hud-panel:nth-child(2) {
            animation-delay: 220ms;
        }

        .quiz-hud .hud-panel:nth-child(3) {
            animation-delay: 280ms;
        }

        .hud-panel:hover {
            transform: translateY(-2px);
            border-color: var(--border-strong);
            box-shadow: 0 20px 52px rgba(56, 47, 35, 0.1), var(--bezel-highlight);
        }

        .hud-pulse {
            animation: hudPulse 620ms var(--ease-spring);
        }

        .hud-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin: 0 0 14px;
            color: var(--muted-text);
            font-size: 0.68rem;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        .hud-heading-left {
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .hud-dot {
            width: 7px;
            height: 7px;
            border-radius: 999px;
            background: var(--accent);
        }

        .hud-dot.gold {
            background: var(--warning);
        }

        .hud-dot.green {
            background: var(--success);
        }

        #ach-count {
            min-width: 24px;
            display: inline-flex;
            justify-content: center;
            border-radius: 999px;
            background: #fff2d7;
            color: #91621d;
            padding: 3px 8px;
            font-size: 0.72rem;
            font-weight: 900;
            letter-spacing: 0;
        }

        .ach-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
        }

        .ach-slot {
            aspect-ratio: 1;
            display: grid;
            place-items: center;
            position: relative;
            border: 1px dashed rgba(39, 35, 28, 0.18);
            border-radius: 14px;
            background: rgba(241, 238, 231, 0.75);
            color: rgba(39, 35, 28, 0.32);
            font-size: 0.78rem;
            font-weight: 900;
        }

        .ach-slot.unlocked {
            border-style: solid;
            border-color: rgba(185, 133, 43, 0.32);
            background: #fff8eb;
            color: #91621d;
            transform: translateY(-1px);
            animation: achievementIn 560ms var(--ease-press);
        }

        .ach-slot img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 12px;
        }

        .ach-slot .tooltip {
            position: absolute;
            left: 50%;
            bottom: calc(100% + 8px);
            width: max-content;
            max-width: 180px;
            transform: translateX(-50%) translateY(4px);
            border-radius: 12px;
            background: #1d1a16;
            color: #fffefa;
            padding: 8px 10px;
            font-size: 0.74rem;
            font-weight: 750;
            line-height: 1.25;
            opacity: 0;
            pointer-events: none;
            transition: opacity 160ms ease, transform 160ms ease;
            z-index: 10;
        }

        .ach-slot:hover .tooltip {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        .var-list {
            display: grid;
            gap: 8px;
        }

        .var-card {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 10px;
            align-items: center;
            padding: 11px 12px;
            border: 1px solid rgba(39, 35, 28, 0.08);
            border-radius: 15px;
            background: rgba(255, 255, 252, 0.72);
        }

        .var-name {
            overflow: hidden;
            color: var(--muted-text);
            font-size: 0.76rem;
            font-weight: 850;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .var-value {
            color: var(--heading-color);
            font-size: 0.84rem;
            font-weight: 900;
            font-variant-numeric: tabular-nums;
        }

        .hud-stats {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            gap: 14px;
            align-items: center;
        }

        .progress-ring-container {
            position: relative;
            width: 68px;
            height: 68px;
        }

        .progress-ring {
            width: 68px;
            height: 68px;
            transform: rotate(-90deg);
        }

        .progress-ring-bg {
            fill: none;
            stroke: rgba(29, 26, 22, 0.1);
            stroke-width: 5;
        }

        .progress-ring-fill {
            fill: none;
            stroke: var(--accent);
            stroke-width: 5;
            stroke-linecap: round;
            stroke-dasharray: 125.66;
            stroke-dashoffset: 125.66;
            transition: stroke-dashoffset 520ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .progress-ring-text {
            position: absolute;
            inset: 0;
            display: grid;
            place-items: center;
            color: var(--heading-color);
            font-size: 0.78rem;
            font-weight: 900;
        }

        .stat-stack {
            display: grid;
            gap: 8px;
        }

        .stat-card {
            padding: 12px;
            border: 1px solid rgba(39, 35, 28, 0.08);
            border-radius: 16px;
            background: rgba(255, 255, 252, 0.72);
        }

        .stat-label {
            color: var(--muted-text);
            font-size: 0.66rem;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        .stat-value {
            overflow: hidden;
            margin-top: 2px;
            color: var(--heading-color);
            font-size: 1.58rem;
            font-weight: 900;
            line-height: 1;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        #hud-name.stat-value {
            font-size: 0.95rem;
            line-height: 1.22;
        }

        .achievement-toast {
            position: fixed;
            right: 22px;
            bottom: 22px;
            z-index: 80;
            max-width: min(360px, calc(100vw - 32px));
            display: grid;
            gap: 3px;
            border: 1px solid rgba(185, 133, 43, 0.24);
            border-radius: 20px;
            background: rgba(255, 254, 250, 0.92);
            color: var(--heading-color);
            box-shadow: 0 22px 60px rgba(56, 47, 35, 0.16), var(--bezel-highlight);
            padding: 14px 16px;
            opacity: 0;
            transform: translateY(18px) scale(0.98);
            pointer-events: none;
            transition: opacity var(--motion-base) var(--ease-standard), transform var(--motion-base) var(--ease-spring);
        }

        .achievement-toast.show {
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        .achievement-toast-title {
            color: var(--warning);
            font-size: 0.68rem;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        .achievement-toast-copy {
            color: var(--heading-color);
            font-size: 0.95rem;
            font-weight: 850;
        }

        .animate-fade-in {
            animation: nodeIn 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .animate-fade-out {
            animation: nodeOut 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes nodeIn {
            from {
                opacity: 0;
                transform: translateY(14px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes nodeOut {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(-10px);
            }
        }

        @keyframes shellIn {
            from {
                opacity: 0;
                transform: translateY(14px) scale(0.992);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @keyframes copyIn {
            from {
                opacity: 0;
                transform: translateY(14px);
                filter: blur(4px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
                filter: blur(0);
            }
        }

        @keyframes controlIn {
            from {
                opacity: 0;
                transform: translateY(12px) scale(0.992);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @keyframes selectionPulse {
            0% { transform: scale(1); }
            45% { transform: scale(1.012); }
            100% { transform: scale(1); }
        }

        @keyframes matchedLock {
            0% { transform: scale(1); }
            42% { transform: scale(0.982); }
            100% { transform: scale(1); }
        }

        @keyframes achievementIn {
            0% { opacity: 0; transform: translateY(8px) scale(0.92); }
            62% { opacity: 1; transform: translateY(-2px) scale(1.04); }
            100% { opacity: 1; transform: translateY(-1px) scale(1); }
        }

        @keyframes hudPulse {
            0% { transform: scale(1); }
            45% { transform: scale(1.035); }
            100% { transform: scale(1); }
        }

        @media (max-width: 920px) {
            .quiz-shell {
                padding: 12px;
            }

            .quiz-topbar {
                top: 12px;
                border-radius: 20px;
            }

            .topbar-inner {
                grid-template-columns: minmax(0, 1fr) auto;
            }

            .timer-pill {
                grid-column: 1 / -1;
                width: 100%;
            }

            .quiz-main {
                padding-top: 18px;
            }

            .quiz-layout {
                grid-template-columns: 1fr;
            }

            .quiz-hud {
                position: static;
                grid-template-columns: 1fr;
                order: 2;
            }

            #quiz-view {
                min-height: 0;
                border-radius: 24px;
            }

            #quiz-view::before {
                inset: 10px;
                border-radius: 16px;
            }

            .node-frame {
                min-height: 0;
            }

            .node-title {
                font-size: clamp(1.9rem, 7.8vw, 3rem);
                line-height: 1.02;
            }
        }

        @media (max-width: 620px) {
            .brand-kicker,
            .top-progress {
                display: none;
            }

            .topbar-inner {
                gap: 10px;
                padding: 10px;
            }

            #header-logo {
                width: 34px;
                height: 34px;
                border-radius: 12px;
            }

            .top-progress {
                min-width: 56px;
            }

            #quiz-view {
                padding: 22px 16px;
            }

            .node-title {
                font-size: clamp(1.72rem, 8.4vw, 2.35rem);
                line-height: 1.04;
                margin-bottom: 12px;
            }

            .node-desc {
                margin-bottom: 22px;
            }

            .option {
                grid-template-columns: 1fr;
                gap: 10px;
            }

            .option-marker,
            .badge {
                width: 32px;
                height: 32px;
            }

            .match-grid,
            .result-summary {
                grid-template-columns: 1fr;
            }

            .dialogue-card {
                grid-template-columns: 1fr;
            }

            .hud-stats {
                grid-template-columns: 1fr;
            }

            .progress-ring-container {
                justify-self: center;
            }

            .achievement-toast {
                right: 12px;
                bottom: 12px;
                left: 12px;
                max-width: none;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
                animation-duration: 1ms !important;
                animation-iteration-count: 1 !important;
                scroll-behavior: auto !important;
                transition-duration: 1ms !important;
            }

            .btn:hover,
            .option:hover,
            .match-item:hover,
            .image-wrapper:hover,
            .timeline-controls button:hover,
            .hud-panel:hover {
                transform: none;
            }

            .node-title,
            .node-desc,
            .node-controls > *,
            .option,
            .quiz-topbar,
            #quiz-view,
            .hud-panel {
                opacity: 1 !important;
                transform: none !important;
                filter: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="quiz-shell">
        <header class="quiz-topbar">
            <div class="topbar-inner">
                <div class="brand-lockup">
                    <div id="header-logo">Q</div>
                    <div class="brand-copy">
                        <div class="brand-kicker">Поток</div>
                        <div id="header-title">Интерактивный квиз</div>
                    </div>
                </div>
                <div id="global-timer-container" class="timer-pill hidden">00:00</div>
                <div class="top-progress" aria-label="Прогресс">
                    <div class="top-progress-track" aria-hidden="true">
                        <div id="top-progress-fill" class="top-progress-fill"></div>
                    </div>
                    <span><span id="progress-text">0</span>%</span>
                </div>
            </div>
        </header>

        <main class="quiz-main">
            <div class="quiz-layout">
                <section class="quiz-stage" aria-live="polite">
                    <div id="quiz-view"></div>
                </section>

                <aside class="quiz-hud" aria-label="Состояние квиза">
                    <section class="hud-panel hud-achievements-panel">
                        <h3 class="hud-heading">
                            <span class="hud-heading-left"><span class="hud-dot gold"></span>Достижения</span>
                            <span id="ach-count">0</span>
                        </h3>
                        <div id="achievements-list" class="ach-grid"></div>
                    </section>

                    <section id="hud-variables-container" class="hud-panel hidden">
                        <h3 class="hud-heading">
                            <span class="hud-heading-left"><span class="hud-dot green"></span>Переменные</span>
                        </h3>
                        <div id="hud-variables-list" class="var-list"></div>
                    </section>

                    <section class="hud-panel hud-stats-panel">
                        <h3 class="hud-heading">
                            <span class="hud-heading-left"><span class="hud-dot"></span>Статистика</span>
                        </h3>
                        <div class="hud-stats">
                            <div class="progress-ring-container">
                                <svg class="progress-ring" viewBox="0 0 48 48" aria-hidden="true">
                                    <circle class="progress-ring-bg" cx="24" cy="24" r="20"></circle>
                                    <circle id="progress-ring" class="progress-ring-fill" cx="24" cy="24" r="20"></circle>
                                </svg>
                                <span id="progress-text-sidebar" class="progress-ring-text">0%</span>
                            </div>
                            <div class="stat-stack">
                                <div class="stat-card">
                                    <div class="stat-label">Очки</div>
                                    <div id="hud-score" class="stat-value">0</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-label">Имя</div>
                                    <div id="hud-name" class="stat-value">Гость</div>
                                </div>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>
        </main>
    </div>

    <div id="image-modal" aria-hidden="true">
        <img id="modal-img-src" alt="" />
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.min.js" integrity="sha384-4373D3C40FD427C0A09AD7647B286C33F34FC104F30FC33302FC105BE048DF37354FC7DD1A278F3FC54DE83E12C657A0" crossorigin="anonymous"></script>
    <script>%%QUIZ_SCRIPT%%</script>
</body>
</html>
`;

export default defaultTemplate;
