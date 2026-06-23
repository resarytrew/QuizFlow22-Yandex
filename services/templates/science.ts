const scienceTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MARS_COLONY_VLAB_TERMINAL_V9.0</title>

  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" integrity="sha384-1C01FBF57751BC7AFA6B1546878C505950A9D7891C777D9B364E17BB4B070C7B45438DA7E8100CF3292F078EDD1B3E83" crossorigin="anonymous"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.min.js" integrity="sha384-4373D3C40FD427C0A09AD7647B286C33F34FC104F30FC33302FC105BE048DF37354FC7DD1A278F3FC54DE83E12C657A0" crossorigin="anonymous"></script>

  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@500;600;700&family=Exo+2:wght@300;400;600;800&display=swap" rel="stylesheet">

  <style>
    :root {
      --c-bg: #070a14;
      --c-primary: #33e7ff;
      --c-secondary: #a78bfa;
      --c-accent: #ff3b5c;
      --c-success: #20f7a7;
      --c-mars: #ff6a3d;
      --c-text: #f8fafc;
      --c-text-dim: #93a4bd;

      --glass: rgba(16, 23, 40, 0.78);
      --glass-border: rgba(255, 255, 255, 0.12);

      --panel-left: 360px;
      --panel-right: 440px;
      --panel-gap: 1rem;
      --panel-radius: 10px;
    }

    * { box-sizing: border-box; }

    body {
      background-color: var(--c-bg);
      color: var(--c-text);
      font-family: 'Exo 2', sans-serif;
      height: 100vh;
      overflow: hidden;
      margin: 0;
      display: flex;
      flex-direction: column;
      user-select: none;
      cursor: crosshair;

      background-image:
        radial-gradient(1200px 600px at 20% 15%, rgba(255, 106, 61, 0.14), transparent 60%),
        radial-gradient(900px 500px at 80% 20%, rgba(51, 231, 255, 0.10), transparent 62%),
        radial-gradient(1000px 700px at 50% 110%, rgba(167, 139, 250, 0.10), transparent 55%),
        linear-gradient(180deg, rgba(7,10,20,0.96), rgba(7,10,20,0.86));
      background-size: cover;
      background-attachment: fixed;
    }

    #bg-canvas { position: fixed; top:0; left:0; width:100%; height:100%; z-index:-2; opacity:0.35; }
    #matrix-canvas { position: fixed; top:0; left:0; width:100%; height:100%; z-index:9000; opacity:0; pointer-events:none; transition:opacity .5s; background:black; }
    #matrix-canvas.active { opacity:0.9; pointer-events:auto; }

    body::before{
      content:"";
      position: fixed; inset: 0;
      pointer-events: none;
      z-index: -1;
      opacity: 0.18;
      background:
        linear-gradient(to right, rgba(51,231,255,0.10) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(51,231,255,0.08) 1px, transparent 1px),
        radial-gradient(circle at 15% 30%, rgba(255,106,61,0.18), transparent 55%),
        radial-gradient(circle at 85% 70%, rgba(51,231,255,0.12), transparent 60%);
      background-size: 44px 44px, 44px 44px, cover, cover;
      filter: blur(0.15px);
    }

    .crt-overlay {
      position: fixed; inset: 0; pointer-events: none; z-index: 50;
      background:
        linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.12) 50%),
        linear-gradient(90deg, rgba(255, 106, 61, 0.03), rgba(0, 255, 255, 0.02), rgba(167, 139, 250, 0.03));
      background-size: 100% 2px, 3px 100%;
      opacity: 0.22;
    }
    .scanline {
      position: fixed; top: 0; left: 0; width: 100%; height: 6px;
      background: linear-gradient(to bottom, transparent, rgba(51,231,255,0.9), transparent);
      opacity: 0.06; animation: scan 7s linear infinite;
      pointer-events: none; z-index: 51;
    }
    @keyframes scan { 0% { top: -10%; } 100% { top: 110%; } }

    .glitch-active .holo-panel { animation: glitch-anim 0.3s cubic-bezier(.25, .46, .45, .94) both infinite; }
    .glitch-active .node-content { filter: blur(2px); }
    @keyframes glitch-anim {
      0% { transform: translate(0); }
      20% { transform: translate(-2px, 2px); }
      40% { transform: translate(-2px, -2px); }
      60% { transform: translate(2px, 2px); }
      80% { transform: translate(2px, -2px); }
      100% { transform: translate(0); }
    }

    .critical-value {
      color: var(--c-accent) !important;
      text-shadow: 0 0 10px var(--c-accent) !important;
      animation: pulse-critical 1s ease-in-out infinite;
    }
    @keyframes pulse-critical {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.65; transform: scale(1.05); }
    }
    .warning-value{
      color: var(--c-mars) !important;
      text-shadow: 0 0 10px rgba(255,106,61,0.35) !important;
    }

    .app-container {
      display: grid;
      grid-template-rows: 74px 1fr;
      height: 100%;
      position: relative;
      z-index: 10;
    }

    .header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0 1.5rem;
      background: rgba(7, 10, 20, 0.78);
      border-bottom: 1px solid var(--glass-border);
      backdrop-filter: blur(12px);
      box-shadow: 0 10px 40px rgba(0,0,0,0.55);
      position: relative;
      overflow: hidden;
    }
    .header::after{
      content:"";
      position:absolute; inset:-2px;
      background: linear-gradient(90deg, rgba(51,231,255,0.0), rgba(51,231,255,0.14), rgba(255,106,61,0.08), rgba(51,231,255,0.0));
      filter: blur(10px);
      opacity: 0.9;
      pointer-events:none;
    }

    .logo-area { display:flex; align-items:center; gap:1rem; font-family:'Rajdhani', sans-serif; text-transform:uppercase; z-index:1; }
    .logo-icon {
      width: 44px; height: 44px;
      border: 2px solid rgba(51,231,255,0.9);
      background: rgba(51, 231, 255, 0.08);
      display:flex; align-items:center; justify-content:center;
      box-shadow: 0 0 18px rgba(51, 231, 255, 0.35), inset 0 0 20px rgba(255,106,61,0.08);
      border-radius: 10px;
      font-size: 20px;
      color: var(--c-primary);
      position: relative;
    }
    .logo-icon::before{
      content:"";
      position:absolute; inset:-6px;
      border: 1px dashed rgba(255,106,61,0.25);
      border-radius: 14px;
    }

    .system-status { display:flex; gap:1.1rem; align-items:center; font-family:'Share Tech Mono', monospace; font-size:.95rem; color: var(--c-primary); z-index:1; }
    .status-metric { display:flex; align-items:center; gap:10px; padding:6px 10px; border:1px solid rgba(255,255,255,0.08); border-radius:10px; background: rgba(0,0,0,0.18); }
    .status-metric input[type="range"]{ accent-color: var(--c-primary); }

    .overall-state {
      display:flex; align-items:center; gap:8px;
      padding: 6px 10px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      background: rgba(0,0,0,0.18);
      color: var(--c-text);
      letter-spacing: 0.08em;
    }
    .dot { width: 10px; height: 10px; border-radius: 999px; background: var(--c-success); box-shadow: 0 0 16px rgba(32,247,167,0.35); }
    .dot.warn { background: var(--c-mars); box-shadow: 0 0 16px rgba(255,106,61,0.35); }
    .dot.crit { background: var(--c-accent); box-shadow: 0 0 16px rgba(255,59,92,0.45); }

    .crit-chips{
      display:flex;
      align-items:center;
      gap: 8px;
      padding: 6px 10px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      background: rgba(0,0,0,0.18);
      max-width: 360px;
      overflow:hidden;
      white-space: nowrap;
    }
    .chip{
      display:inline-flex;
      align-items:center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.22);
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.78rem;
      letter-spacing: 0.08em;
    }
    .chip.warn{ border-color: rgba(255,106,61,0.25); color: rgba(255,106,61,0.95); }
    .chip.crit{ border-color: rgba(255,59,92,0.30); color: rgba(255,59,92,0.95); }
    .chip .dot-mini{
      width: 8px; height: 8px; border-radius: 99px;
      background: rgba(255,106,61,0.95);
      box-shadow: 0 0 12px rgba(255,106,61,0.25);
    }
    .chip.crit .dot-mini{ background: rgba(255,59,92,0.95); box-shadow: 0 0 12px rgba(255,59,92,0.35); }

    .content-grid {
      display: grid;
      grid-template-columns: var(--panel-left) 1fr var(--panel-right);
      gap: var(--panel-gap);
      padding: 1rem;
      overflow: hidden;
      height: calc(100vh - 74px);
    }

    .holo-panel {
      background: var(--glass);
      border: 1px solid var(--glass-border);
      border-radius: var(--panel-radius);
      position: relative;
      display: flex; flex-direction: column;
      overflow: hidden;
      box-shadow: 0 18px 60px -18px rgba(0,0,0,0.75);
      transition: all 0.3s;
    }
    .holo-panel::before{
      content:"";
      position:absolute; inset:0;
      pointer-events:none;
      background:
        radial-gradient(800px 200px at 20% 0%, rgba(51,231,255,0.10), transparent 55%),
        radial-gradient(600px 220px at 80% 0%, rgba(255,106,61,0.09), transparent 60%),
        radial-gradient(700px 260px at 50% 120%, rgba(167,139,250,0.10), transparent 60%);
      opacity: 0.9;
    }

    .corner {
      position: absolute; width: 12px; height: 12px;
      border: 2px solid var(--c-primary); transition: all 0.3s;
      pointer-events: none; opacity: 0.65;
    }
    .c-tl { top: 0; left: 0; border-right: 0; border-bottom: 0; }
    .c-tr { top: 0; right: 0; border-left: 0; border-bottom: 0; }
    .c-bl { bottom: 0; left: 0; border-right: 0; border-top: 0; }
    .c-br { bottom: 0; right: 0; border-left: 0; border-top: 0; }

    .panel-header {
      padding: 12px 16px;
      background: linear-gradient(90deg, rgba(255,255,255,0.06), transparent 55%);
      border-bottom: 1px solid var(--glass-border);
      font-family: 'Rajdhani', sans-serif;
      font-weight: 800; letter-spacing: 2px;
      color: var(--c-primary);
      text-transform: uppercase;
      font-size: 1.05rem;
      display: flex; justify-content: space-between; align-items: center;
      position: relative;
      z-index: 1;
    }
    .panel-header::after{
      content:"";
      display:block;
      height: 1px;
      flex: 1;
      margin-left: 12px;
      background: linear-gradient(90deg, rgba(51,231,255,0.35), rgba(255,106,61,0.15), transparent);
    }

    .left-panel .panel-header { padding: 10px 14px; font-size: 1rem; }

    .id-card{
      margin: 12px 14px 6px;
      padding: 12px;
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 12px;
      background: rgba(0,0,0,0.18);
      position: relative;
      z-index: 1;
    }
    .id-top{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 12px;
    }
    .id-avatar{
      width: 64px; height: 64px;
      border-radius: 12px;
      border: 1px solid rgba(51,231,255,0.25);
      background: rgba(51,231,255,0.05);
      display:flex;
      align-items:center;
      justify-content:center;
      position: relative;
      overflow: hidden;
    }
    .id-avatar::before{
      content:"";
      position:absolute; inset:-30px;
      background: radial-gradient(circle at 30% 20%, rgba(51,231,255,0.18), transparent 60%),
                  radial-gradient(circle at 80% 70%, rgba(255,106,61,0.12), transparent 55%);
      transform: rotate(18deg);
    }
    .avatar-silhouette{ width: 44px; height: 44px; position: relative; z-index: 1; }

    .id-meta{ flex:1; font-family: 'Share Tech Mono', monospace; }
    .id-row{ display:flex; justify-content:space-between; gap:10px; font-size:0.82rem; letter-spacing:0.08em; margin-bottom:6px; }
    .id-label{ color: rgba(147,164,189,0.95); }
    .id-value{ color:#fff; font-weight:900; }
    .id-badges{ display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
    .tiny-badge{
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.18);
      color: rgba(51,231,255,0.95);
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.72rem;
      letter-spacing: 0.14em;
    }
    .tiny-badge.ok{ color: rgba(32,247,167,0.95); border-color: rgba(32,247,167,0.20); }

    .data-row {
      display:flex; justify-content:space-between; align-items:baseline;
      padding: 8px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.95rem;
      gap: 10px;
      position: relative;
      z-index: 1;
    }
    .data-label { color: var(--c-text-dim); letter-spacing: 0.06em; }
    .data-value { color: var(--c-text); text-shadow: 0 0 8px rgba(51, 231, 255, 0.35); font-weight: 800; }

    .flag-item{
      display:flex; justify-content:space-between; align-items:center;
      padding: 8px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.9rem;
      position: relative;
      z-index: 1;
    }
    .flag-name{ color: var(--c-text-dim); letter-spacing: 0.08em; }
    .flag-pill{
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.18);
      font-weight: 800;
      letter-spacing: 0.12em;
      font-size: 0.75rem;
      min-width: 92px;
      text-align:center;
    }
    .flag-pill.on{ color: var(--c-success); border-color: rgba(32,247,167,0.25); box-shadow: 0 0 14px rgba(32,247,167,0.12); }
    .flag-pill.off{ color: rgba(147,164,189,0.95); border-color: rgba(255,255,255,0.10); opacity: 0.9; }

    #hud-canvas {
      width: 100%; height: 72px;
      background: rgba(0,0,0,0.18);
      border-top: 1px solid var(--glass-border);
      border-bottom: 1px solid var(--glass-border);
      margin-top: auto;
      position: relative;
      z-index: 1;
    }

    .right-panel { gap: 0; }
    #system-log {
      height: 220px;
      min-height: 220px;
      overflow-y: auto;
      border-bottom: 1px solid var(--glass-border);
      padding: 12px;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.92rem;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      position: relative;
      z-index: 1;
    }
    .log-item { margin-bottom: 6px; line-height: 1.25; word-wrap: break-word; }
    .log-time{ color: rgba(51,231,255,0.75); margin-right: 8px; }

    .log-tag{
      display:inline-block;
      padding: 2px 6px;
      margin-right: 8px;
      border-radius: 6px;
      font-weight: 900;
      letter-spacing: 0.12em;
      font-size: 0.7rem;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.16);
    }
    .tag-sys{ color: rgba(51,231,255,0.95); border-color: rgba(51,231,255,0.18); }
    .tag-var{ color: rgba(167,139,250,0.95); border-color: rgba(167,139,250,0.18); }
    .tag-alert{ color: rgba(255,59,92,0.95); border-color: rgba(255,59,92,0.22); }
    .tag-user{ color: rgba(32,247,167,0.95); border-color: rgba(32,247,167,0.18); }
    .tag-calc{ color: rgba(255,106,61,0.95); border-color: rgba(255,106,61,0.20); }

    .cmd-line {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      background: rgba(0,0,0,0.28);
      border-bottom: 1px solid var(--glass-border);
      position: relative;
      z-index: 1;
    }
    .cmd-prompt { color: var(--c-success); margin-right: 10px; font-family: 'Share Tech Mono'; }
    .cmd-input {
      background: transparent; border: none; outline: none;
      color: var(--c-primary); font-family: 'Share Tech Mono';
      flex: 1; font-size: 1rem;
    }

    .badge{
      display:flex;
      align-items:center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.18);
      cursor: help;
      user-select: none;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.85rem;
      letter-spacing: 0.06em;
      color: rgba(226,232,240,0.95);
      max-width: 100%;
    }
    .badge .icon{
      width: 28px; height: 28px;
      border-radius: 8px;
      border: 1px solid rgba(51,231,255,0.22);
      background: rgba(51,231,255,0.06);
      display:flex; align-items:center; justify-content:center;
      flex: 0 0 auto;
    }
    .badge .name{
      overflow:hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .viewport {
      position: relative;
      padding: 42px;
      overflow-y: auto;
      background:
        radial-gradient(circle at 50% 30%, rgba(16, 23, 40, 0.35) 0%, rgba(7, 10, 20, 0.72) 70%),
        radial-gradient(circle at 80% 20%, rgba(255, 106, 61, 0.10) 0%, transparent 45%);
      display: flex; flex-direction: column; flex: 1;
    }

    .step-card{
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.18);
      border-radius: 12px;
      padding: 12px 14px;
      margin: 0 0 20px 0;
      font-family: 'Share Tech Mono', monospace;
      letter-spacing: 0.08em;
    }
    .step-row{
      display:flex;
      justify-content:space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .step-key{ color: rgba(147,164,189,0.95); font-size: 0.82rem; }
    .step-val{ color: #fff; font-weight: 900; font-size: 0.82rem; }

    .md-content { line-height: 1.6; color: var(--c-text); font-size: 1.4rem; }

    .node-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 3.2rem;
      font-weight: 800;
      color: #fff;
      text-shadow: 0 0 28px rgba(51, 231, 255, 0.45), 0 0 22px rgba(255, 106, 61, 0.14);
      margin-bottom: 1rem;
      line-height: 1.1;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .md-content p {
      margin-bottom: 1.5rem;
      color: #e2e8f0;
      max-width: 95%;
      font-size: 1.5rem;
      font-family: 'Share Tech Mono', monospace;
    }

    .md-content strong, .md-content b, .highlight {
      color: var(--c-primary) !important;
      font-weight: 900 !important;
      text-shadow: 0 0 14px rgba(51, 231, 255, 0.55);
      letter-spacing: 0.5px;
    }
    .md-content em { color: var(--c-secondary); font-style: italic; }

    .sci-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(51,231,255,0.9);
      color: var(--c-primary);
      padding: 18px 24px;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 800; text-transform: uppercase; letter-spacing: 2px;
      font-size: 1.2rem;
      width: 100%; margin-top: 15px;
      cursor: pointer; position: relative; overflow: hidden;
      transition: all 0.2s; border-radius: 6px;
    }
    .sci-btn::before{
      content:"";
      position:absolute; inset:0;
      background: linear-gradient(90deg, transparent, rgba(255,106,61,0.12), transparent);
      transform: translateX(-120%);
      transition: transform 0.35s ease;
    }
    .sci-btn:hover::before{ transform: translateX(120%); }
    .sci-btn:hover {
      background: var(--c-primary);
      color: #07101a;
      box-shadow: 0 0 34px rgba(51, 231, 255, 0.45);
      text-shadow: 2px 0 var(--c-accent), -2px 0 var(--c-success);
      animation: rgb-shake 0.3s linear infinite;
    }
    @keyframes rgb-shake {
      0% { transform: translate(0, 0); }
      25% { transform: translate(1px, 1px); }
      50% { transform: translate(0, 0); }
      75% { transform: translate(-1px, -1px); }
      100% { transform: translate(0, 0); }
    }
    .sci-btn.selected { background: var(--c-secondary); border-color: var(--c-secondary); color: #fff; }

    .sci-input {
      width: 100%; background: rgba(0,0,0,0.42);
      border: 1px solid var(--glass-border);
      color: #fff; padding: 20px;
      font-family: 'Share Tech Mono', monospace;
      font-size: 1.4rem; margin-bottom: 12px;
      outline: none; transition: all 0.3s; border-radius: 6px;
    }
    .sci-input:focus { border-color: var(--c-primary); box-shadow: 0 0 22px rgba(51, 231, 255, 0.18); }

    .node-img-container {
      position: relative;
      width: 100%;
      max-width: 650px;
      height: 360px;
      margin: 0 auto 30px auto;
      border: 2px solid rgba(51,231,255,0.85);
      border-radius: 10px;
      box-shadow: 0 0 26px rgba(51, 231, 255, 0.18);
      overflow: hidden;
      background: rgba(0,0,0,0.55);
      cursor: zoom-in;
      transition: all 0.3s ease;
    }
    .node-img-container:hover {
      box-shadow: 0 0 40px rgba(51, 231, 255, 0.42), inset 0 0 22px rgba(255, 106, 61, 0.18);
      border-color: #fff;
    }
    .node-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.92; transition: transform 0.5s ease; }
    .node-img-container:hover .node-img { transform: scale(1.03); opacity: 1; }
    .node-img-container::after {
      content: 'СКАНЕР // НАЖМИТЕ ДЛЯ ПРОЕКЦИИ';
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 6px; background: rgba(51, 231, 255, 0.85);
      color: #07101a; font-family: 'Share Tech Mono';
      text-align: center; font-size: 0.8rem;
      transform: translateY(100%); transition: transform 0.3s ease;
      pointer-events: none; letter-spacing: 0.16em;
    }
    .node-img-container:hover::after { transform: translateY(0); }

    /* VIDEO CONTAINER STYLES */
    .video-container {
      position: relative;
      width: 100%;
      max-width: 800px;
      margin: 0 auto 30px auto;
      border: 2px solid rgba(51,231,255,0.85);
      border-radius: 10px;
      box-shadow: 0 0 26px rgba(51, 231, 255, 0.18);
      overflow: hidden;
      background: rgba(0,0,0,0.55);
    }
    .video-aspect {
      position: relative;
      padding-bottom: 56.25%;
      height: 0;
    }
    .video-cover {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.6);
      cursor: pointer;
      transition: all 0.3s;
    }
    .video-cover:hover {
      background: rgba(0,0,0,0.4);
    }
    .play-btn-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(51,231,255,0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 30px rgba(51,231,255,0.5);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .video-cover:hover .play-btn-circle {
      transform: scale(1.1);
      box-shadow: 0 0 50px rgba(51,231,255,0.7);
    }
    .play-triangle {
      width: 0;
      height: 0;
      border-left: 24px solid #070a14;
      border-top: 14px solid transparent;
      border-bottom: 14px solid transparent;
      margin-left: 6px;
    }

    /* LOCKED CONTROLS */
    .locked-controls {
      opacity: 0.4;
      pointer-events: none;
      filter: grayscale(0.8);
      transition: all 0.5s ease;
      position: relative;
    }
    .video-lock-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(7, 10, 20, 0.85);
      border-radius: 6px;
      z-index: 100;
      color: var(--c-primary);
      font-weight: bold;
      font-family: 'Share Tech Mono', monospace;
      text-align: center;
      padding: 20px;
      pointer-events: auto;
      border: 1px solid rgba(51,231,255,0.3);
    }
    .lock-icon {
      font-size: 2.5rem;
      margin-bottom: 10px;
      animation: pulse-lock 2s ease-in-out infinite;
    }
    @keyframes pulse-lock {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.1); }
    }
    .lock-message {
      font-size: 0.85rem;
      color: var(--c-text-dim);
      margin-top: 8px;
    }
    .manual-unlock-btn {
      margin-top: 15px;
      padding: 12px 24px;
      background: var(--c-success);
      color: #070a14;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-family: 'Rajdhani', sans-serif;
      text-transform: uppercase;
      letter-spacing: 1px;
      pointer-events: auto;
      transition: all 0.3s;
    }
    .manual-unlock-btn:hover {
      background: #fff;
      box-shadow: 0 0 20px rgba(32,247,167,0.5);
    }

    /* PROGRESS BAR */
    .progress-container {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      background: rgba(0,0,0,0.18);
    }
    .progress-bar-bg {
      width: 100px;
      height: 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: var(--c-success);
      width: 0%;
      transition: width 0.5s ease;
      border-radius: 3px;
    }
    .progress-text {
      font-size: 0.85rem;
      color: var(--c-success);
      min-width: 35px;
    }

    #holo-lightbox {
      position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 10000;
      display: none; align-items: center; justify-content: center;
      perspective: 1200px;
      backdrop-filter: blur(10px);
    }
    #holo-lightbox.open { display: flex; }

    .holo-projection {
      width: 95vw; height: 95vh;
      border: 3px solid rgba(51,231,255,0.9);
      box-shadow: 0 0 110px rgba(51,231,255,0.55), inset 0 0 60px rgba(255,106,61,0.14);
      position: relative;
      transform-style: preserve-3d;
      animation: holo-unfold 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      background: rgba(51, 231, 255, 0.05);
      display: flex; align-items: center; justify-content: center;
      cursor: zoom-out;
    }
    .holo-projection::before{
      content:"";
      position:absolute; inset: 10px;
      border: 1px dashed rgba(255,106,61,0.28);
      pointer-events:none;
    }
    .holo-projection img {
      max-width: 100%; max-height: 100%;
      object-fit: contain;
      display: block;
      animation: holo-flicker 4s infinite;
    }
    @keyframes holo-unfold {
      from { transform: rotateX(70deg) scale(0.5) translateY(200px); opacity: 0; }
      to { transform: rotateX(0) scale(1) translateY(0); opacity: 1; }
    }
    @keyframes holo-flicker {
      0%, 100% { opacity: 1; filter: brightness(1); }
      5% { opacity: 0.9; filter: brightness(1.25) hue-rotate(10deg); }
      10% { opacity: 1; filter: brightness(1); }
      15% { opacity: 0.92; filter: brightness(1); }
    }

    #monitor-panel {
      flex: 1;
      background: rgba(0,0,0,0.16);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    #monitor-panel::before{
      content:"";
      position:absolute; inset:0;
      pointer-events:none;
      background: linear-gradient(180deg, rgba(51,231,255,0.06), transparent 30%, rgba(255,106,61,0.04));
    }

    .monitor-bar-container { margin: 12px 14px; margin-bottom: 8px; position: relative; z-index: 1; }
    .monitor-label { font-size: 0.78rem; color: var(--c-text-dim); display: flex; justify-content: space-between; font-family: 'Share Tech Mono'; letter-spacing: 0.08em; }
    .monitor-bar-bg { height: 6px; background: rgba(255,255,255,0.10); margin-top: 6px; border-radius: 6px; overflow:hidden; }
    .monitor-bar-fill { height: 100%; background: var(--c-secondary); width: 0%; transition: width 0.5s; border-radius: 6px; box-shadow: 0 0 18px rgba(167,139,250,0.25); }

    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: rgba(0,0,0,0.12); }
    ::-webkit-scrollbar-thumb { background: rgba(51,231,255,0.85); border-radius: 10px; opacity: 0.7; }

    /* =========================
       MATCHING (works well)
       ========================= */
    .match-ui {
      margin-top: 14px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.18);
      border-radius: 14px;
      padding: 14px;
      font-family: 'Share Tech Mono', monospace;
    }

    .match-hintbar{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.18);
      margin-bottom: 12px;
    }
    .match-hint{
      color: rgba(147,164,189,0.95);
      letter-spacing: 0.08em;
      font-size: 0.92rem;
      line-height: 1.25;
    }
    .match-indicators{
      display:flex;
      gap: 10px;
      align-items:center;
      flex-wrap: wrap;
      justify-content:flex-end;
    }
    .match-chip{
      display:inline-flex;
      align-items:center;
      gap: 8px;
      border-radius: 999px;
      padding: 6px 10px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.18);
      font-size: 0.8rem;
      letter-spacing: 0.1em;
      color: rgba(226,232,240,0.95);
      max-width: 260px;
      overflow:hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .match-chip .k{ color: rgba(147,164,189,0.95); }
    .match-chip .v{
      color: #fff;
      font-weight: 900;
      text-shadow: 0 0 12px rgba(51,231,255,0.18);
      overflow:hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 170px;
    }
    .match-chip.empty .v{
      color: rgba(147,164,189,0.95);
      font-weight: 700;
      text-shadow: none;
    }
    .match-chip.active{
      border-color: rgba(51,231,255,0.65);
      box-shadow: 0 0 22px rgba(51,231,255,0.12);
    }

    .match-grid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .match-col{
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.16);
      border-radius: 12px;
      padding: 10px;
      min-height: 120px;
    }
    .match-col-title{
      font-family: 'Rajdhani', sans-serif;
      font-weight: 900;
      letter-spacing: 0.16em;
      color: rgba(51,231,255,0.95);
      text-transform: uppercase;
      font-size: 0.9rem;
      margin: 2px 2px 10px 2px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 8px;
    }
    .match-col-title .sub{
      color: rgba(147,164,189,0.95);
      font-family: 'Share Tech Mono', monospace;
      letter-spacing: 0.08em;
      font-weight: 700;
      font-size: 0.78rem;
      text-transform:none;
    }

    .match-item{
      display:flex;
      gap: 10px;
      align-items:center;
      padding: 10px 10px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.18);
      cursor: pointer;
      user-select: none;
      margin-bottom: 10px;
      transition: all .15s ease;
    }
    .match-item:last-child{ margin-bottom: 0; }
    .match-item:hover{
      border-color: rgba(51,231,255,0.45);
      box-shadow: 0 0 18px rgba(51,231,255,0.10);
    }
    .match-item.selected{
      border-color: rgba(51,231,255,0.9);
      box-shadow: 0 0 22px rgba(51,231,255,0.22);
    }
    .match-item.locked{
      opacity: 0.55;
      cursor: default;
      pointer-events: none;
      border-color: rgba(32,247,167,0.25);
    }

    .match-thumb{
      width: 54px;
      height: 54px;
      flex: 0 0 auto;
      border-radius: 10px;
      border: 1px solid rgba(51,231,255,0.22);
      background: rgba(51,231,255,0.06);
      overflow:hidden;
      display:flex;
      align-items:center;
      justify-content:center;
    }
    .match-thumb img{
      width:100%;
      height:100%;
      object-fit: cover;
      display:block;
      opacity: 0.95;
    }
    .match-text{
      flex: 1;
      min-width: 0;
      font-size: 1rem;
      line-height: 1.2;
      color: rgba(226,232,240,0.98);
      letter-spacing: 0.04em;
    }
    .match-meta{
      flex: 0 0 auto;
      font-size: 0.72rem;
      letter-spacing: 0.16em;
      color: rgba(147,164,189,0.95);
      border: 1px solid rgba(255,255,255,0.12);
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(0,0,0,0.18);
    }

    .match-pairsbox{
      margin-top: 12px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.18);
      border-radius: 12px;
      padding: 12px;
    }
    .match-pairs-title{
      color: rgba(147,164,189,0.95);
      letter-spacing: 0.16em;
      font-size: 0.78rem;
      margin-bottom: 10px;
    }
    .match-pair-row{
      display:grid;
      grid-template-columns: 1fr 18px 1fr;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      align-items:center;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.95rem;
    }
    .match-pair-row:last-child{ border-bottom: 0; }
    .match-arrow{ color: rgba(51,231,255,0.85); text-align:center; }
    .match-pair-side{
      overflow:hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #fff;
      font-weight: 800;
    }
    .match-empty{
      color: rgba(147,164,189,0.95);
      font-size: 0.95rem;
      letter-spacing: 0.06em;
    }

    .match-actions{
      display:flex;
      gap: 12px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .match-actions .sci-btn{ margin-top: 0; width: auto; min-width: 240px; }
    .sci-btn.secondary{
      border-color: rgba(255,255,255,0.18);
      color: rgba(226,232,240,0.95);
      background: rgba(0,0,0,0.22);
    }
    .sci-btn.secondary:hover{
      background: rgba(255,255,255,0.10);
      color: #fff;
      box-shadow: 0 0 22px rgba(255,255,255,0.08);
      text-shadow: none;
      animation: none;
    }

    /* =========================
       ACHIEVEMENT FX (SCI-FI)
       ========================= */
    .ach-pulse-overlay{
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9001;
      opacity: 0;
      transition: opacity .18s ease;
      background:
        radial-gradient(700px 260px at 50% 50%, rgba(51,231,255,0.22), transparent 60%),
        radial-gradient(900px 400px at 50% 60%, rgba(255,106,61,0.10), transparent 65%),
        linear-gradient(180deg, rgba(51,231,255,0.04), transparent 35%, rgba(255,59,92,0.02));
      mix-blend-mode: screen;
    }
    .ach-pulse-overlay.active{
      opacity: 1;
      animation: achPulse 550ms ease-out forwards;
    }
    @keyframes achPulse{
      0%   { opacity: 0; filter: blur(0px); }
      20%  { opacity: 1; filter: blur(0px); }
      100% { opacity: 0; filter: blur(1px); }
    }

    .ach-toast{
      position: fixed;
      left: 50%;
      bottom: 28px;
      transform: translateX(-50%) translateY(20px);
      z-index: 9002;
      pointer-events: none;
      opacity: 0;
      transition: opacity .2s ease, transform .2s ease;
      width: min(720px, calc(100vw - 24px));
      border: 1px solid rgba(51,231,255,0.35);
      border-radius: 14px;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(10px);
      box-shadow: 0 20px 80px rgba(0,0,0,0.55);
      padding: 12px 14px;
      display:flex;
      gap: 12px;
      align-items:center;
    }
    .ach-toast.show{
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .ach-toast .ico{
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 1px solid rgba(51,231,255,0.28);
      background: rgba(51,231,255,0.08);
      display:flex;
      align-items:center;
      justify-content:center;
      flex: 0 0 auto;
    }
    .ach-toast .txt{
      min-width: 0;
      flex: 1;
      font-family: 'Share Tech Mono', monospace;
    }
    .ach-toast .top{
      display:flex;
      justify-content:space-between;
      gap: 10px;
      align-items:baseline;
      letter-spacing: 0.14em;
    }
    .ach-toast .label{
      color: rgba(147,164,189,0.95);
      font-size: 0.78rem;
    }
    .ach-toast .title{
      color: #fff;
      font-weight: 900;
      text-shadow: 0 0 14px rgba(51,231,255,0.20);
      font-size: 0.98rem;
      overflow:hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ach-toast .desc{
      margin-top: 6px;
      color: rgba(226,232,240,0.92);
      font-size: 0.9rem;
      line-height: 1.25;
    }

    /* short highlight around achievements panel */
    #achievements-list.ach-glow{
      box-shadow: 0 0 0 1px rgba(51,231,255,0.28), 0 0 34px rgba(51,231,255,0.22);
      border-radius: 12px;
      background: rgba(51,231,255,0.06);
      transition: box-shadow .25s ease, background .25s ease;
    }

    @media (max-width: 1024px) {
      .content-grid { grid-template-columns: 1fr; grid-template-rows: auto 1fr auto; height: auto; }
      .header { padding: 0 10px; }
      .left-panel, .right-panel { display: none; }
    }
  </style>
</head>

<body>
  <canvas id="bg-canvas"></canvas>
  <canvas id="matrix-canvas"></canvas>
  <div class="crt-overlay"></div>
  <div class="scanline"></div>

  <div class="app-container">
    <header class="header">
      <div class="logo-area">
        <div class="logo-icon">Λ</div>
        <div class="logo-text">
          <h1 id="quiz-title" style="margin:0; font-size:1.5rem; letter-spacing:0.14em; font-weight:800;">МАРС // ВИРТ-ЛАБ</h1>
          <div style="font-size:0.72rem; color:var(--c-text-dim); letter-spacing:0.18em;">ТЕРМИНАЛ КОЛОНИИ • V.9.0 ULTRA</div>
        </div>
      </div>

      <div class="system-status">
        <div class="overall-state" title="Сводное состояние (по метрикам)">
          <span class="dot" id="overall-dot"></span>
          <span id="overall-state-text">OK</span>
        </div>

        <div class="crit-chips" id="crit-chips" title="Важные предупреждения"></div>

        <!-- PROGRESS BAR -->
        <div class="progress-container" title="Прогресс прохождения">
          <span style="font-size:0.8rem; color:var(--c-text-dim);">ПРОГРЕСС</span>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" id="progress-bar"></div>
          </div>
          <span class="progress-text" id="progress-text">0%</span>
        </div>

        <div class="status-metric" title="Громкость">
          <span>VOL</span>
          <input type="range" min="0" max="1" step="0.1" value="0.5" oninput="game.setVolume(this.value)" style="width:90px;">
        </div>

        <div class="status-metric blink text-amber-400" style="border-color: rgba(255,106,61,0.35); color: rgba(255,106,61,0.95);">
          T-MINUS: <span id="global-timer">00:00:00</span>
        </div>
      </div>
    </header>

    <div class="content-grid">
      <!-- Left -->
      <aside class="holo-panel left-panel">
        <div class="c-tl corner"></div><div class="c-tr corner"></div><div class="c-bl corner"></div><div class="c-br corner"></div>

        <div class="panel-header">КАРТА ОПЕРАТОРА</div>

        <div class="id-card">
          <div class="id-top">
            <div class="id-avatar" title="СИЛУЭТ ОПЕРАТОРА">
              <svg class="avatar-silhouette" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <path d="M32 34c8.3 0 15-6.7 15-15S40.3 4 32 4 17 10.7 17 19s6.7 15 15 15Z" fill="rgba(51,231,255,0.30)"/>
                <path d="M10 60c2-13 12-20 22-20s20 7 22 20" stroke="rgba(51,231,255,0.55)" stroke-width="6" stroke-linecap="round"/>
                <path d="M16 19c3 6 10 9 16 9s13-3 16-9" stroke="rgba(255,106,61,0.20)" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="id-meta">
              <div class="id-row">
                <span class="id-label">ПОЗЫВНОЙ</span>
                <span class="id-value" id="player-name">УЧЁНЫЙ</span>
              </div>
              <div class="id-row">
                <span class="id-label">РОЛЬ</span>
                <span class="id-value" id="player-role">ОПЕРАТОР ЛАБ</span>
              </div>
              <div class="id-row">
                <span class="id-label">ДОПУСК</span>
                <span class="id-value" id="player-clearance">A-03</span>
              </div>
            </div>
          </div>
          <div class="id-badges">
            <span class="tiny-badge ok" id="access-status">ДОСТУП: ОК</span>
            <span class="tiny-badge" id="session-status">СЕССИЯ: ACTIVE</span>
          </div>
        </div>

        <div class="panel-header">МОДУЛИ / ДОПУСКИ</div>
        <div id="flags-list" style="overflow-y:auto; max-height: 240px;"></div>

        <div class="panel-header">ТЕЛЕМЕТРИЯ (ВСЕ)</div>
        <div id="metrics-list" style="overflow-y:auto; max-height: 300px;"></div>

        <div class="panel-header">СВОДНЫЙ ГРАФИК</div>
        <div id="chart-container" style="height:140px; padding: 8px; position: relative; z-index: 1;">
          <canvas id="metrics-chart"></canvas>
        </div>

        <canvas id="hud-canvas"></canvas>
      </aside>

      <!-- Center -->
      <main id="main-panel" class="holo-panel viewport-panel">
        <div class="c-tl corner"></div><div class="c-tr corner"></div><div class="c-bl corner"></div><div class="c-br corner"></div>
        <div class="panel-header"><span>ГЛАВНЫЙ ТЕРМИНАЛ</span></div>

        <div id="quiz-view" class="viewport custom-scrollbar">
          <div style="text-align:center; margin-top:20%; color:var(--c-primary); letter-spacing:0.2em;">
            ИНИЦИАЛИЗАЦИЯ СИМУЛЯЦИИ...
          </div>
        </div>
      </main>

      <!-- Right -->
      <aside class="holo-panel right-panel">
        <div class="c-tl corner"></div><div class="c-tr corner"></div><div class="c-bl corner"></div><div class="c-br corner"></div>

        <div class="panel-header">СИСТЕМНЫЙ ЖУРНАЛ</div>
        <div id="system-log" class="custom-scrollbar">
          <div class="log-item new">
            <span class="log-time">00:00:00</span><span class="log-tag tag-sys">SYS</span> СОЕДИНЕНИЕ УСТАНОВЛЕНО • РЕТРАНСЛЯТОР: ONLINE
          </div>
        </div>

        <div class="cmd-line">
          <span class="cmd-prompt">root@mars-vlab:~#</span>
          <input type="text" id="cmd-input" class="cmd-input" placeholder="Введите команду... (/help)" autocomplete="off">
        </div>

        <div class="panel-header">ЗНАКИ / ДОСТИЖЕНИЯ</div>
        <div id="achievements-list"
             style="padding:12px; display:flex; flex-direction:column; gap:10px; min-height:72px; max-height: 220px; overflow-y:auto; position: relative; z-index: 1;">
        </div>

        <div class="panel-header">ЯДРО УЗЛА (ДЕКОР)</div>
        <div id="monitor-panel">
          <div class="monitor-bar-container">
            <div class="monitor-label"><span>CPU LOAD</span><span id="cpu-val">34%</span></div>
            <div class="monitor-bar-bg"><div class="monitor-bar-fill" id="cpu-bar" style="width:34%"></div></div>
          </div>
          <div class="monitor-bar-container">
            <div class="monitor-label"><span>MEMORY</span><span id="mem-val">62%</span></div>
            <div class="monitor-bar-bg"><div class="monitor-bar-fill" id="mem-bar" style="width:62%; background:var(--c-accent)"></div></div>
          </div>
          <div class="monitor-bar-container">
            <div class="monitor-label"><span>UPLINK</span><span id="net-val">88%</span></div>
            <div class="monitor-bar-bg"><div class="monitor-bar-fill" id="net-bar" style="width:88%; background:var(--c-success)"></div></div>
          </div>
        </div>
      </aside>
    </div>
  </div>

  <!-- Holographic Projection (Zoom) -->
  <div id="holo-lightbox">
    <div class="holo-projection">
      <img id="holo-img-src" src="" />
    </div>
  </div>

  <!-- Achievement FX overlays -->
  <div id="ach-pulse" class="ach-pulse-overlay"></div>
  <div id="ach-toast" class="ach-toast" aria-live="polite">
    <div class="ico" id="ach-toast-ico"></div>
    <div class="txt">
      <div class="top">
        <div class="label">ДОСТИЖЕНИЕ РАЗБЛОКИРОВАНО</div>
        <div class="title" id="ach-toast-title">—</div>
      </div>
      <div class="desc" id="ach-toast-desc"></div>
    </div>
  </div>

  <audio id="bg-music" loop></audio>

  <script>
    const quizData = %%QUIZ_DATA_INJECTION%%;

    const sfx = {
      click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
      success: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
      error: new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'),
      scan: new Audio('https://assets.mixkit.co/active_storage/sfx/2044/2044-preview.mp3'),
      holo: new Audio('https://assets.mixkit.co/active_storage/sfx/2043/2043-preview.mp3'),
      type: new Audio('https://assets.mixkit.co/active_storage/sfx/241/241-preview.mp3')
    };
    const bgMusic = document.getElementById('bg-music');

    const game = {
      currentNodeId: null,
      score: 0,
      variables: { playerName: 'Ученый' },
      temp: { matching: { pairs: [], left: null, right: null }, timeline: [] },
      typewriterTimer: null,
      audioVolume: 0.5,
      matrixInterval: null,

      history: {},
      lastAlertState: {},
      cachedThresholds: null,
      lastNodeTitle: null,
      contentStep: 0,
      __initDone: false,

      // Progress tracking
      visitedInteractiveNodes: new Set(),
      totalInteractiveNodes: 0,

      // Video lock state
      videoLockState: {
        controlsElement: null,
        overlayElement: null,
        unlockTimer: null,
        manualUnlockTimer: null,
        isLocked: false
      },
      rutubeOnMessage: null,
      bgWasPlayingBeforeVideo: false,

      resultsApiBase: '',
      sessionId: null,
      pathData: [],
      isResultSaved: false,
      achievements: [],

      init() {
        if (this.__initDone) return;
        this.__initDone = true;

        try {
          if (quizData.currentQuizName) {
            const titleEl = document.getElementById('quiz-title');
            if (titleEl) titleEl.innerText = quizData.currentQuizName;
            document.title = quizData.currentQuizName;
          }

          const holoLightbox = document.getElementById('holo-lightbox');
          const holoProjection = holoLightbox?.querySelector('.holo-projection');
          const holoImage = document.getElementById('holo-img-src');
          holoLightbox?.addEventListener('click', () => this.closeHolo());
          holoProjection?.addEventListener('click', (event) => event.stopPropagation());
          holoImage?.addEventListener('click', () => this.closeHolo());

          if (quizData.designSettings?.background?.imageUrl) {
            document.body.style.backgroundImage = \`url('\${quizData.designSettings.background.imageUrl}')\`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
          }

          if (quizData.designSettings?.sound?.backgroundMusic) {
            bgMusic.src = quizData.designSettings.sound.backgroundMusic;
            bgMusic.volume = 0.2;
            document.addEventListener('click', () => { if (bgMusic.paused) bgMusic.play().catch(()=>{}); }, { once: true });
          }

          this.resultsApiBase = (quizData.apiBaseUrl || '').replace(/\/$/, '');

          // Уникальный ID сессии
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            this.sessionId = crypto.randomUUID();
          } else {
            this.sessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          }

          // Calculate total interactive nodes for progress
          this.calculateTotalInteractiveNodes();
          
          // Initialize progress to 0
          this.updateProgressBar();

          this.startTimer();
          this.initCanvas();
          this.initHUD();
          this.initMatrix();
          this.initServerMonitor();
          this.initCommandLine();

          this.cachedThresholds = this.extractThresholdsFromGraph();

          this.log("СИСТЕМА ГОТОВА. ОЖИДАНИЕ ВВОДА.", "SYS");

          const startId = quizData.startNodeId;
          if (startId) {
            const node = quizData.nodes.find(n => n.id === startId);
            if (node && !this.isLogicNode(startId)) {
              this.processNode(startId);
            } else {
              const startNode = quizData.nodes.find(n => n.type === 'startNode') || quizData.nodes[0];
              if (startNode) this.processNode(startNode.id);
            }
          } else {
            const startNode = quizData.nodes.find(n => n.type === 'startNode') || quizData.nodes[0];
            if (startNode) this.processNode(startNode.id);
          }
        } catch (e) {
          console.error("Init Error:", e);
          document.getElementById('quiz-view').innerHTML = \`<div style="color:red; text-align:center;">КРИТИЧЕСКИЙ СБОЙ СИСТЕМЫ: \${e.message}</div>\`;
        }
      },

      // ===== PROGRESS TRACKING =====
      calculateTotalInteractiveNodes() {
        const interactiveTypes = [
          'questionNode',
          'multipleChoiceNode',
          'matchingNode',
          'timelineNode',
          'textInputNode',
          'collectInfoNode',
          'allocatorNode'
        ];
        this.totalInteractiveNodes = quizData.nodes.filter(n => interactiveTypes.includes(n.type)).length;
      },

      updateProgressBar() {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (!progressBar || !progressText) return;

        let pct = 0;
        if (this.totalInteractiveNodes > 0) {
          pct = Math.round((this.visitedInteractiveNodes.size / this.totalInteractiveNodes) * 100);
          pct = Math.min(pct, 100);
        }

        progressBar.style.width = pct + '%';
        progressText.innerText = pct + '%';
      },

      // ===== VIDEO LOCK FUNCTIONS =====
      getRutubeId(url) {
        if (!url) return null;
        const regex = /(?:rutube\\.ru\\/(?:video|play\\/embed)\\/)([a-zA-Z0-9]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
      },

      pauseBackgroundMusicForVideo() {
        if (!bgMusic) { this.bgWasPlayingBeforeVideo = false; return; }
        this.bgWasPlayingBeforeVideo = !bgMusic.paused;
        if (this.bgWasPlayingBeforeVideo) bgMusic.pause();
      },

      resumeBackgroundMusicAfterVideo() {
        if (!bgMusic) return;
        if (!this.bgWasPlayingBeforeVideo) return;
        this.bgWasPlayingBeforeVideo = false;
        bgMusic.play().catch(() => {});
      },

      unlockVideoControls() {
        if (!this.videoLockState.isLocked) return;

        const ctrls = this.videoLockState.controlsElement || document.getElementById('node-controls');
        const overlay = this.videoLockState.overlayElement || document.querySelector('.video-lock-overlay');

        if (ctrls) {
          ctrls.classList.remove('locked-controls');
        }

        if (overlay) {
          overlay.style.transition = 'opacity 0.5s ease';
          overlay.style.opacity = '0';
          setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          }, 500);
        }

        // Clear timers
        if (this.videoLockState.unlockTimer) {
          clearTimeout(this.videoLockState.unlockTimer);
          this.videoLockState.unlockTimer = null;
        }
        if (this.videoLockState.manualUnlockTimer) {
          clearTimeout(this.videoLockState.manualUnlockTimer);
          this.videoLockState.manualUnlockTimer = null;
        }

        this.videoLockState.isLocked = false;
        this.videoLockState.controlsElement = null;
        this.videoLockState.overlayElement = null;

        this.resumeBackgroundMusicAfterVideo();
        this.cleanupRutubeListener();

        this.log('ВИДЕО ПРОСМОТРЕНО. КОНТРОЛЬ РАЗБЛОКИРОВАН.', 'SYS');
        this.playSfx('success');
      },

      cleanupRutubeListener() {
        if (this.rutubeOnMessage) {
          window.removeEventListener('message', this.rutubeOnMessage);
          this.rutubeOnMessage = null;
        }
      },

      cleanupMediaOnNodeChange() {
        this.cleanupRutubeListener();
        this.resumeBackgroundMusicAfterVideo();

        if (this.videoLockState.unlockTimer) {
          clearTimeout(this.videoLockState.unlockTimer);
        }
        if (this.videoLockState.manualUnlockTimer) {
          clearTimeout(this.videoLockState.manualUnlockTimer);
        }
        this.videoLockState = {
          controlsElement: null,
          overlayElement: null,
          unlockTimer: null,
          manualUnlockTimer: null,
          isLocked: false
        };
      },

      setupRutubeListener() {
        this.cleanupRutubeListener();

        const onMessage = (ev) => {
          try {
            let data = ev.data;

            if (typeof data === 'string') {
              try {
                data = JSON.parse(data);
              } catch (parseErr) {
                if (data.includes('ended') || data.includes('complete') || data.includes('finish')) {
                  this.unlockVideoControls();
                  return;
                }
                return;
              }
            }

            if (!data || typeof data !== 'object') return;

            const isEnded =
              data.type === 'player:ended' ||
              (data.type === 'player:changeState' && data.data?.state === 'ended') ||
              data.event === 'ended' ||
              data.event === 'complete' ||
              data.event === 'finish' ||
              data.state === 'ended' ||
              data.state === 'complete' ||
              data.data?.ended === true ||
              data.data?.state === 'ended' ||
              data.method === 'ended' ||
              data.action === 'ended' ||
              (data.info && data.info.playerState === 0);

            if (isEnded) {
              this.unlockVideoControls();
            }

            // Check progress >= 95%
            if (data.type === 'player:currentTime' || data.type === 'player:progress') {
              const currentTime = data.data?.currentTime || data.currentTime || 0;
              const duration = data.data?.duration || data.duration || 0;

              if (duration > 0 && currentTime > 0) {
                const progress = currentTime / duration;
                if (progress >= 0.95) {
                  this.unlockVideoControls();
                }
              }
            }

          } catch (err) {
            console.error('[Quiz Engine] Message handler error:', err);
          }
        };

        this.rutubeOnMessage = onMessage;
        window.addEventListener('message', this.rutubeOnMessage);
      },

      trackPath(node, details) {
        try {
          if (!details) details = {};
          if (!this.pathData) this.pathData = [];
          this.pathData.push({
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel: (node.data && (node.data.label || node.data.title || node.data.question)) || 'Step',
            timestamp: new Date().toISOString(),
            details: details
          });
          if (this.pathData.length > 600) this.pathData.shift();
        } catch (e) {}
      },

      async saveResults(finalTitle) {
        if (!this.resultsApiBase || !quizData.quizId || this.isResultSaved) return;

        try {
                    var participantName = this.variables.playerName || 'Ученый';

          var payload = {
            quiz_id: quizData.quizId,
            session_id: this.sessionId,
            score: this.score,
            final_node_title: finalTitle || 'Завершено',
            participant_name: participantName,
            results_data: {
              variables: this.variables,
              achievements: this.achievements
            },
            path_data: this.pathData
          };

          var res = await fetch(this.resultsApiBase + '/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
          });

          if (!res.ok) {
            console.error('Save error:', res.status);

            if (true) {

              console.warn('Retrying without path_data...');
              delete payload.path_data;
              var res2 = await fetch(this.resultsApiBase + '/results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
              });
              if (!res2.ok) {
                console.error('Retry failed:', res2.status);
              } else {
                this.log('РЕЗУЛЬТАТЫ СОХРАНЕНЫ (РЕЗЕРВ)', 'SYS');
                this.isResultSaved = true;
              }
            }
          } else {
            this.log('РЕЗУЛЬТАТЫ СОХРАНЕНЫ В БАЗУ', 'SYS');
            this.isResultSaved = true;
          }
        } catch (e) {
          console.error(e);
          this.log('ОШИБКА СОХРАНЕНИЯ', 'ALERT');
        }
      },

      initCommandLine() {
        const input = document.getElementById('cmd-input');
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const cmd = input.value.trim();
            input.value = '';
            this.processCommand(cmd);
          }
        });
      },

      processCommand(cmd) {
        if (!cmd) return;
        this.log(\`> \${this.escapeHtml(cmd)}\`, "USER");
        const lowerCmd = cmd.toLowerCase();

        if (lowerCmd === '/help') {
          this.log('КОМАНДЫ: /help, /hack, /clear, /date, /whoami, /reboot, /status, /vars, /progress', "SYS");
        } else if (lowerCmd === '/hack') {
          this.log('ЗАПУСК ПРОТОКОЛА ВЗЛОМА...', "SYS");
          this.startMatrixEffect();
        } else if (lowerCmd === '/clear' || lowerCmd === '/clean') {
          document.getElementById('system-log').innerHTML = '';
        } else if (lowerCmd === '/date') {
          this.log(\`СИСТЕМНОЕ ВРЕМЯ: \${new Date().toLocaleString()}\`, "SYS");
        } else if (lowerCmd === '/whoami') {
          this.log(\`ПОЛЬЗОВАТЕЛЬ: \${this.variables.playerName || 'Неизвестный'}\`, "SYS");
        } else if (lowerCmd === '/status') {
          const core = this.getCoreMetrics();
          const bits = core.map(k => \`\${k.toUpperCase()}=\${this.variables[k]}\${this.getUnitSuffix(k, this.variables[k])}\`);
          this.log(\`СТАТУС: \${bits.join(' | ')} | SCORE=\${this.score}\`, "SYS");
        } else if (lowerCmd === '/vars') {
          const keys = Object.keys(this.variables).filter(k => k !== 'playerName');
          if (keys.length === 0) this.log('ПЕРЕМЕННЫЕ: (нет)', "SYS");
          else this.log('ПЕРЕМЕННЫЕ: ' + keys.sort().join(', '), "SYS");
        } else if (lowerCmd === '/progress') {
          const pct = this.totalInteractiveNodes > 0 
            ? Math.round((this.visitedInteractiveNodes.size / this.totalInteractiveNodes) * 100) 
            : 0;
          this.log(\`ПРОГРЕСС: \${pct}% (\${this.visitedInteractiveNodes.size}/\${this.totalInteractiveNodes} узлов)\`, "SYS");
        } else if (lowerCmd === '/reboot') {
          location.reload();
        } else {
          this.log('НЕИЗВЕСТНАЯ КОМАНДА. ПОПРОБУЙТЕ /help', "SYS");
        }
      },

      initMatrix() {},

      startMatrixEffect() {
        const c = document.getElementById('matrix-canvas');
        const ctx = c.getContext('2d');
        c.width = window.innerWidth;
        c.height = window.innerHeight;
        c.classList.add('active');

        const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
        const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nums = '0123456789';
        const alphabet = katakana + latin + nums;
        const fontSize = 16;
        const columns = c.width / fontSize;
        const drops = [];
        for (let x = 0; x < columns; x++) drops[x] = 1;

        const draw = () => {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.fillStyle = '#0F0';
          ctx.font = fontSize + 'px monospace';

          for (let i = 0; i < drops.length; i++) {
            const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            if (drops[i] * fontSize > c.height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
          }
        };

        if (this.matrixInterval) clearInterval(this.matrixInterval);
        this.matrixInterval = setInterval(draw, 30);

        setTimeout(() => {
          clearInterval(this.matrixInterval);
          c.classList.remove('active');
          this.log('ВЗЛОМ ЗАВЕРШЕН. ДОСТУП РАЗРЕШЕН.', "SYS");
        }, 2000);

        const stopHandler = () => {
          clearInterval(this.matrixInterval);
          c.classList.remove('active');
          document.removeEventListener('click', stopHandler);
        };
        document.addEventListener('click', stopHandler);
      },

      initServerMonitor() {
        setInterval(() => {
          const cpu = Math.floor(Math.random() * 60) + 20;
          const mem = Math.floor(Math.random() * 40) + 40;
          const net = Math.floor(Math.random() * 80) + 10;

          document.getElementById('cpu-bar').style.width = cpu + '%';
          document.getElementById('cpu-val').innerText = cpu + '%';

          document.getElementById('mem-bar').style.width = mem + '%';
          document.getElementById('mem-val').innerText = mem + '%';

          document.getElementById('net-bar').style.width = net + '%';
          document.getElementById('net-val').innerText = net + '%';
        }, 1000);
      },

      triggerGlitch() {
        const app = document.querySelector('.app-container');
        app.classList.add('glitch-active');
        setTimeout(() => { app.classList.remove('glitch-active'); }, 400);
      },

      triggerAchievementFX(title, description) {
        this.triggerGlitch();

        const pulse = document.getElementById('ach-pulse');
        if (pulse) {
          pulse.classList.remove('active');
          void pulse.offsetWidth;
          pulse.classList.add('active');
          setTimeout(() => pulse.classList.remove('active'), 650);
        }

        const toast = document.getElementById('ach-toast');
        const tTitle = document.getElementById('ach-toast-title');
        const tDesc = document.getElementById('ach-toast-desc');
        const tIco = document.getElementById('ach-toast-ico');

        if (tTitle) tTitle.textContent = title || 'ДОСТИЖЕНИЕ';
        if (tDesc) tDesc.textContent = description || '';
        if (tIco) tIco.innerHTML = this.getBadgeIcon(title || '');

        if (toast) {
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 1800);
        }

        const ach = document.getElementById('achievements-list');
        if (ach) {
          ach.classList.add('ach-glow');
          setTimeout(() => ach.classList.remove('ach-glow'), 650);
        }

        this.playSfx('scan');
      },

      initHUD() {
        const canvas = document.getElementById('hud-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let t = 0;

        const draw = () => {
          const w = canvas.width = canvas.clientWidth;
          const h = canvas.height = canvas.clientHeight;
          ctx.clearRect(0,0,w,h);

          ctx.strokeStyle = '#33e7ff';
          ctx.lineWidth = 2;
          ctx.beginPath();

          const amplitude = 10 + (this.score % 50) / 2;
          const freq = 0.05 + (Object.values(this.variables).filter(v => typeof v === 'number')[0] || 50) / 1000;

          for(let x=0; x<w; x++) {
            const y = h/2 + Math.sin(x * freq + t) * amplitude * Math.sin(x * 0.01);
            ctx.lineTo(x,y);
          }
          ctx.stroke();
          t += 0.1;
          requestAnimationFrame(draw);
        };
        draw();
      },

      openHolo(url) {
        const lightbox = document.getElementById('holo-lightbox');
        const img = document.getElementById('holo-img-src');
        if (!lightbox || !img) return;
        img.src = url;
        lightbox.classList.add('open');
        this.playSfx('holo');
        this.log('ГОЛОГРАММА АКТИВИРОВАНА', "SYS");
      },

      closeHolo() { document.getElementById('holo-lightbox').classList.remove('open'); },

      isLogicNode(id) {
        const node = quizData.nodes.find(n => n.id === id);
        return node && ['startNode','scoreNode','variableNode','conditionNode','formulaNode','achievementNode','goToNode','groupNode'].includes(node.type);
      },

      escapeHtml(str) {
        return String(str)
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#039;');
      },

      log(msg, tag = "SYS") {
        const log = document.getElementById('system-log');
        if(!log) return;
        const div = document.createElement('div');
        div.className = 'log-item new';
        const t = new Date().toLocaleTimeString('ru-RU', { hour12: false });

        const tagClass = tag === 'ALERT' ? 'tag-alert' :
                         tag === 'VAR' ? 'tag-var' :
                         tag === 'USER' ? 'tag-user' :
                         tag === 'CALC' ? 'tag-calc' : 'tag-sys';

        div.innerHTML = \`<span class="log-time">\${t}</span><span class="log-tag \${tagClass}">\${tag}</span> \${msg}\`;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;

        if(log.children.length > 80) log.firstChild.remove();
      },

      getUnitSuffix(varName, rawVal) {
        const k = String(varName || '').toLowerCase();
        const n = Number(rawVal);
        if (!isNaN(n)) {
          if (k === 'energy' || k === 'atmosphere' || k === 'biocontour' || k.endsWith('_pct') || k.endsWith('_percent')) return '%';
          if (k.endsWith('_c') || k.includes('temp_c')) return '°C';
          if (k.endsWith('_k')) return 'K';
          if (k.endsWith('_kpa')) return ' kPa';
          if (k.endsWith('_atm')) return ' atm';
          if (k.endsWith('_ppm') || k.includes('co2')) return ' ppm';
          if (k.endsWith('_v')) return ' V';
          if (k.endsWith('_a')) return ' A';
          if (k.endsWith('_w')) return ' W';
          if (k.endsWith('_j')) return ' J';
        }
        return '';
      },

      extractThresholdsFromGraph() {
        const map = {};
        const conds = (quizData.nodes || []).filter(n => n.type === 'conditionNode' && n.data && n.data.variable);
        for (const n of conds) {
          const v = n.data.variable;
          const op = n.data.operator;
          const valueNum = Number(n.data.value);
          if (isNaN(valueNum)) continue;
          if (!map[v]) map[v] = { warn: null, crit: null };

          if (op === 'lt' || op === 'lte') {
            if (map[v].crit === null || valueNum < map[v].crit) map[v].crit = valueNum;
          }
        }
        for (const [k, obj] of Object.entries(map)) {
          if (obj.crit !== null && obj.warn === null) obj.warn = obj.crit + 10;
        }
        return map;
      },

      classifyValue(varName, rawVal) {
        const num = Number(rawVal);
        if (isNaN(num)) return { state: 'NA', num: null, warn: null, crit: null };

        const th = this.cachedThresholds?.[varName] || {};
        const crit = (typeof th.crit === 'number') ? th.crit : 20;
        const warn = (typeof th.warn === 'number') ? th.warn : 35;

        let state = 'OK';
        if (num < crit) state = 'CRIT';
        else if (num < warn) state = 'WARN';

        return { state, num, warn, crit };
      },

      pushHistory(varName, rawVal) {
        const num = Number(rawVal);
        if (isNaN(num)) return;
        if (!this.history[varName]) this.history[varName] = [];
        const arr = this.history[varName];
        arr.push(num);
        if (arr.length > 24) arr.shift();
      },

      getCoreMetrics() {
        const preferred = ['energy', 'atmosphere', 'biocontour', 'health', 'stability', 'oxygen', 'power'];
        const vars = this.variables || {};
        const hits = preferred.filter(k => vars[k] !== undefined && vars[k] !== null && !isNaN(Number(vars[k])));

        if (hits.length >= 3) return hits.slice(0, 3);

        const candidates = Object.entries(vars)
          .filter(([k]) => !['playerName', 'name', 'score'].includes(k))
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => ({ k, n: Number(v) }))
          .filter(x => !isNaN(x.n))
          .filter(x => !(x.n === 0 || x.n === 1))
          .filter(x => x.n >= 0 && x.n <= 100);

        candidates.sort((a, b) => ((this.history[b.k]?.length || 0) - (this.history[a.k]?.length || 0)));
        return candidates.slice(0, 3).map(x => x.k);
      },

      getModulesList() {
        const vars = this.variables || {};
        const modules = [];

        const addModule = (key, label, state) => modules.push({ key, label, state });

        for (const [k, v] of Object.entries(vars)) {
          if (['playerName', 'name', 'score'].includes(k)) continue;
          const n = Number(v);
          if (!isNaN(n) && (n === 0 || n === 1)) {
            const on = n === 1;
            const label = k.toUpperCase().replaceAll('_', ' ');
            addModule(k, label, on ? 'UNLOCK' : 'LOCK');
          }
        }
        modules.sort((a, b) => a.label.localeCompare(b.label));
        return modules;
      },

      updateOverallState(coreKeys) {
        let worst = 'OK';
        for (const k of coreKeys) {
          const c = this.classifyValue(k, this.variables[k]);
          if (c.state === 'CRIT') { worst = 'CRIT'; break; }
          if (c.state === 'WARN') worst = 'WARN';
        }
        const dot = document.getElementById('overall-dot');
        const txt = document.getElementById('overall-state-text');
        if(!dot || !txt) return;
        dot.classList.remove('warn','crit');
        if (worst === 'CRIT') dot.classList.add('crit');
        else if (worst === 'WARN') dot.classList.add('warn');
        txt.textContent = worst;
      },

      updatePinnedChips(coreKeys) {
        const wrap = document.getElementById('crit-chips');
        if (!wrap) return;

        const chips = [];
        coreKeys.forEach(k => {
          const c = this.classifyValue(k, this.variables[k]);
          if (c.state === 'WARN' || c.state === 'CRIT') {
            const unit = this.getUnitSuffix(k, this.variables[k]);
            chips.push({ k, state: c.state, val: this.variables[k], unit });
          }
        });

        wrap.innerHTML = '';
        if (chips.length === 0) {
          wrap.style.opacity = '0.55';
          wrap.innerHTML = \`<span style="color:rgba(147,164,189,0.95); letter-spacing:0.12em; font-size:0.8rem;">НЕТ ПРЕДУПРЕЖДЕНИЙ</span>\`;
          return;
        }
        wrap.style.opacity = '1';

        chips.slice(0, 3).forEach(c => {
          const el = document.createElement('span');
          el.className = 'chip ' + (c.state === 'CRIT' ? 'crit' : 'warn');
          el.innerHTML = \`<span class="dot-mini"></span> \${this.escapeHtml(c.k.toUpperCase())} \${this.escapeHtml(c.val)}\${this.escapeHtml(c.unit)}\`;
          wrap.appendChild(el);
        });
      },

      emitAlerts(coreKeys) {
        for (const k of coreKeys) {
          const { state, num, warn, crit } = this.classifyValue(k, this.variables[k]);
          const prev = this.lastAlertState[k] || 'OK';
          if (state !== prev) {
            this.lastAlertState[k] = state;

            if (state === 'CRIT') {
              this.log(\`ТРЕВОГА: \${this.escapeHtml(k.toUpperCase())}=\${num} (КРИТИЧНО &lt; \${crit})\`, "ALERT");
              this.playSfx('error');
            } else if (state === 'WARN') {
              this.log(\`ПРЕДУПРЕЖДЕНИЕ: \${this.escapeHtml(k.toUpperCase())}=\${num} (НИЗКО &lt; \${warn})\`, "ALERT");
            } else if (state === 'OK' && (prev === 'WARN' || prev === 'CRIT')) {
              this.log(\`СТАБИЛИЗАЦИЯ: \${this.escapeHtml(k.toUpperCase())}=\${num}\`, "SYS");
            }
          }
        }
      },

      startTimer() {
        let s = 0;
        setInterval(() => {
          s++;
          const h = Math.floor(s/3600).toString().padStart(2,'0');
          const m = Math.floor((s%3600)/60).toString().padStart(2,'0');
          const sec = (s%60).toString().padStart(2,'0');
          const el = document.getElementById('global-timer');
          if(el) el.innerText = \`\${h}:\${m}:\${sec}\`;
        }, 1000);
      },

      setVolume(val) {
        this.audioVolume = parseFloat(val);
        if(bgMusic) bgMusic.volume = this.audioVolume * 0.2;
        Object.values(sfx).forEach(s => s.volume = this.audioVolume);
      },

      playSfx(key) {
        if(sfx[key]) { sfx[key].currentTime = 0; sfx[key].play().catch(()=>{}); }
      },

      initCanvas() {
        const cvs = document.getElementById('bg-canvas');
        const ctx = cvs.getContext('2d');
        let width, height;
        const particles = [];

        const resize = () => { width = cvs.width = window.innerWidth; height = cvs.height = window.innerHeight; };
        window.addEventListener('resize', resize); resize();

        for(let i=0; i<46; i++) particles.push({
          x: Math.random()*width, y: Math.random()*height,
          vx: (Math.random()-0.5)*0.55, vy: (Math.random()-0.5)*0.55, size: Math.random()*2.2
        });

        const animate = () => {
          ctx.clearRect(0,0,width,height);
          particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if(p.x < 0) p.x = width; if(p.x > width) p.x = 0;
            if(p.y < 0) p.y = height; if(p.y > height) p.y = 0;

            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#33e7ff';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();

            ctx.globalAlpha = 0.06;
            ctx.fillStyle = '#ff6a3d';
            ctx.beginPath(); ctx.arc(p.x+6, p.y-4, p.size*0.8, 0, Math.PI*2); ctx.fill();
          });
          requestAnimationFrame(animate);
        };
        animate();
      },

      processNode(id) {
        // Cleanup media state on node change
        this.cleanupMediaOnNodeChange();

        const node = quizData.nodes.find(n => n.id === id);
        if(!node) return;
        this.currentNodeId = id;

        this.trackPath(node);

        // Track visited interactive nodes for progress
        const interactiveTypes = [
          'questionNode',
          'multipleChoiceNode',
          'matchingNode',
          'timelineNode',
          'textInputNode',
          'collectInfoNode',
          'allocatorNode'
        ];
        if (interactiveTypes.includes(node.type)) {
          this.visitedInteractiveNodes.add(node.id);
          this.updateProgressBar();
        }

        if (this.isLogicNode(id)) { this.executeLogic(node); return; }

        this.triggerGlitch();

        const nodeTitle = node.data.title || node.data.label || node.data.question || this.getNodeTypeRu(node.type);
        this.lastNodeTitle = (nodeTitle || '').toString();

        this.contentStep += 1;

        this.renderNode(node);
        this.updateDashboard();

        this.log(\`ЗАГРУЗКА: \${this.escapeHtml((nodeTitle || 'МОДУЛЬ').toUpperCase())}\`, "SYS");
      },

      executeLogic(node) {
        var type = node.type;
        var data = node.data || {};
        var nextId = null;
        var edge = quizData.edges.find(function (e) { return e.source === node.id; });

        switch (type) {
          case 'startNode':
            this.log('СЕССИЯ НАЧАТА', 'SYS');
            break;

          case 'variableNode': {
            var vName = data.variableName;
            if (this.variables[vName] === undefined) this.variables[vName] = 0;

            var oldRaw = this.variables[vName];
            var oldNum = oldRaw !== undefined ? Number(oldRaw) : 0;

            if (data.operation === 'add') {
              this.variables[vName] = Number(this.variables[vName]) + Number(data.value);
            } else if (data.operation === 'subtract') {
              this.variables[vName] = Number(this.variables[vName]) - Number(data.value);
            } else {
              this.variables[vName] = data.value;
            }

            var newRaw = this.variables[vName];
            this.pushHistory(vName, newRaw);

            var newNum = Number(newRaw);
            var varDelta = newNum - oldNum;

            if (!isNaN(varDelta) &&
                varDelta !== 0 &&
                (data.operation === 'add' || data.operation === 'subtract')) {
              var varDeltaStr = (varDelta > 0 ? '+' : '') + varDelta;
              var varColor = varDelta > 0 ? 'var(--c-success)' : 'var(--c-accent)';
              this.log(
                '<span style="color:' + varColor + '; font-weight:900;">' +
                this.escapeHtml(vName.toUpperCase()) + ' ' +
                varDeltaStr + this.escapeHtml(this.getUnitSuffix(vName, newRaw)) +
                '</span>',
                'VAR'
              );
            } else {
              this.log(
                '<span style="color:rgba(167,139,250,0.95); font-weight:900;">' +
                this.escapeHtml(vName.toUpperCase()) + ' = ' +
                this.escapeHtml(newRaw) +
                this.escapeHtml(this.getUnitSuffix(vName, newRaw)) +
                '</span>',
                'VAR'
              );
            }
            break;
          }

          case 'conditionNode': {
            var rawVal = (this.variables[data.variable] != null ? this.variables[data.variable] : this.score);
            var checkVal = Number(rawVal);
            var compareVal = Number(data.value);
            var res = false;

            if (data.operator === 'eq') res = checkVal == compareVal;
            else if (data.operator === 'neq') res = checkVal != compareVal;
            else if (data.operator === 'gt') res = checkVal > compareVal;
            else if (data.operator === 'gte') res = checkVal >= compareVal;
            else if (data.operator === 'lt') res = checkVal < compareVal;
            else if (data.operator === 'lte') res = checkVal <= compareVal;

            var tEdge = quizData.edges.find(function (e) {
              return e.source === node.id && e.sourceHandle === 'true';
            });
            var fEdge = quizData.edges.find(function (e) {
              return e.source === node.id && e.sourceHandle === 'false';
            });
            if (res && tEdge) nextId = tEdge.target;
            else if (!res && fEdge) nextId = fEdge.target;

            this.log(
              'ПРОВЕРКА: ' +
              this.escapeHtml(String(data.variable)) + ' ' +
              this.escapeHtml(String(data.operator)) + ' ' +
              this.escapeHtml(String(data.value)) + ' → ' +
              (res ? 'ИСТИНА' : 'ЛОЖЬ'),
              'CALC'
            );

            if (nextId) {
              this.processNode(nextId);
              return;
            }
            break;
          }

          case 'achievementNode': {
            if (data && data.title && this.achievements.indexOf(data.title) === -1) {
              this.achievements.push(data.title);
            }

            const achList = document.getElementById('achievements-list');
            if (achList) {
              const iconSvg = this.getBadgeIcon(data.title || '');
              const el = document.createElement('div');
              el.className = 'badge';
              el.title = (data.title || '') + (data.description ? ('\\n' + data.description) : '');
              el.innerHTML = \`
                <div class="icon">\${iconSvg}</div>
                <div class="name">\${this.escapeHtml(data.title || 'BADGE')}</div>
              \`;
              achList.appendChild(el);
            }

            this.log(\`ПОЛУЧЕН ЗНАК: \${this.escapeHtml(data.title)}\`, "SYS");
            this.triggerAchievementFX(data.title, data.description);
            break;
          }

          case 'goToNode':
            if (data.targetNodeId) nextId = data.targetNodeId;
            break;

          case 'formulaNode': {
            if (window.math && data && data.expression && data.variableName) {
              try {
                var scope = {};
                for (var k in this.variables) scope[k] = this.variables[k];
                scope.score = this.score;

                var formulaResult = window.math.evaluate(data.expression, scope);
                if (typeof data.decimalPlaces === 'number') {
                  formulaResult = parseFloat(formulaResult.toFixed(data.decimalPlaces));
                }
                this.variables[data.variableName] = formulaResult;
                this.pushHistory(data.variableName, formulaResult);
                this.log(
                  'ФОРМУЛА: ' + this.escapeHtml(data.variableName) + ' = ' + formulaResult,
                  'CALC'
                );
              } catch (e) {
                this.log('ОШИБКА ФОРМУЛЫ: ' + this.escapeHtml(e.message), 'ALERT');
              }
            }
            break;
          }

          case 'scoreNode': {
            var oldScore = this.score;
            var scoreVal = parseInt(data.value || 0, 10);
            if (data.operation === 'add') this.score += scoreVal;
            else if (data.operation === 'subtract') this.score -= scoreVal;
            else this.score = scoreVal;

            var delta = this.score - oldScore;
            if (delta !== 0) {
              var sign = delta > 0 ? '+' : '';
              var color = delta > 0 ? 'var(--c-success)' : 'var(--c-accent)';
              this.log(
                '<span style="color:' + color + '; font-weight:900;">СЧЁТ ' +
                sign + delta + '</span>',
                'VAR'
              );
            }
            this.pushHistory('score', this.score);
            break;
          }

          default:
            break;
        }

        if (!nextId && edge) nextId = edge.target;
        if (nextId) this.processNode(nextId);
      },

      getNodeTypeRu(type) {
        const types = {
          'startNode': 'СТАРТ',
          'questionNode': 'ВЫБОР ДЕЙСТВИЯ',
          'multipleChoiceNode': 'ПРОВЕРКА ПРОТОКОЛА',
          'textInputNode': 'ВВОД ПАРАМЕТРА',
          'infoNode': 'БРИФИНГ / НАБЛЮДЕНИЕ',
          'resultNode': 'ОТЧЁТ',
          'matchingNode': 'СОПОСТАВЛЕНИЕ',
          'timelineNode': 'ХРОНОЛОГИЯ',
          'feedbackNode': 'РАЗБОР ШАГА',
          'allocatorNode': 'КОНФИГУРАЦИЯ СИСТЕМЫ',
          'collectInfoNode': 'ИДЕНТИФИКАЦИЯ'
        };
        return types[type] || 'МОДУЛЬ';
      },

      updateDashboard() {
        if(this.variables['playerName']) {
          const playerNameEl = document.getElementById('player-name');
          if(playerNameEl) playerNameEl.innerText = this.variables['playerName'];
        }

        const flagsWrap = document.getElementById('flags-list');
        const list = document.getElementById('metrics-list');

        const coreKeys = this.getCoreMetrics();
        this.updateOverallState(coreKeys);
        this.updatePinnedChips(coreKeys);
        this.emitAlerts(coreKeys);

        if (flagsWrap) {
          const modules = this.getModulesList();
          flagsWrap.innerHTML = '';
          if (modules.length === 0) {
            flagsWrap.innerHTML = \`<div class="data-row"><span class="data-label">МОДУЛИ</span><span class="data-value">НЕТ</span></div>\`;
          } else {
            modules.forEach(m => {
              const div = document.createElement('div');
              div.className = 'flag-item';
              div.innerHTML = \`
                <span class="flag-name">\${this.escapeHtml(m.label)}</span>
                <span class="flag-pill \${String(m.state).includes('UNLOCK') ? 'on' : 'off'}">\${this.escapeHtml(String(m.state))}</span>
              \`;
              flagsWrap.appendChild(div);
            });
          }
        }

        if(list) {
          list.innerHTML = \`<div class="data-row"><span class="data-label">СЧЁТ</span><span class="data-value">\${this.score}</span></div>\`;
          for(const [k, v] of Object.entries(this.variables)) {
            if(['playerName', 'name', 'score'].includes(k)) continue;
            if(v === undefined || v === null) continue;

            const numValue = Number(v);
            const isCritical = !isNaN(numValue) && numValue >= 0 && numValue < 20;
            const isWarn = !isNaN(numValue) && numValue >= 0 && numValue < 35 && !isCritical;
            const valueClass = isCritical ? 'data-value critical-value' : isWarn ? 'data-value warning-value' : 'data-value';
            const unit = this.getUnitSuffix(k, v);

            list.innerHTML += \`<div class="data-row"><span class="data-label">\${this.escapeHtml(k.toUpperCase())}</span><span class="\${valueClass}">\${this.escapeHtml(v)}\${this.escapeHtml(unit)}</span></div>\`;
          }
        }

        // Update progress bar
        this.updateProgressBar();

        const canvas = document.getElementById('metrics-chart');
        if (canvas) {
          const ctx = canvas.getContext('2d');
          const w = canvas.parentElement.offsetWidth;
          const h = 140;
          canvas.width = w; canvas.height = h;
          const centerX = w/2; const centerY = h/2; const radius = Math.min(w,h)/2 - 18;

          const stats = [];
          stats.push({ label: 'SCORE', val: Math.min(Math.max(this.score || 0, 0), 100) });

          for(const [k, v] of Object.entries(this.variables)) {
            if(['playerName', 'name', 'score'].includes(k)) continue;
            if(v === undefined || v === null) continue;
            const numVal = Number(v);
            if(!isNaN(numVal)) stats.push({ label: k.toUpperCase().substring(0, 6), val: numVal });
          }

          ctx.clearRect(0,0,w,h);

          if(stats.length < 3) {
            ctx.fillStyle = '#93a4bd';
            ctx.font = '12px "Share Tech Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Ожидание данных...', w/2, h/2);
            return;
          }

          ctx.strokeStyle = 'rgba(51, 231, 255, 0.18)';
          ctx.beginPath();
          for(let i=0; i<stats.length; i++) {
            const angle = (Math.PI*2 * i) / stats.length - Math.PI/2;
            const x = centerX + Math.cos(angle)*radius;
            const y = centerY + Math.sin(angle)*radius;
            ctx.moveTo(centerX, centerY); ctx.lineTo(x,y);

            ctx.fillStyle = 'rgba(147, 164, 189, 0.95)';
            ctx.font = '10px "Share Tech Mono", monospace';
            ctx.textAlign = x > centerX ? 'left' : x < centerX ? 'right' : 'center';
            ctx.textBaseline = y > centerY ? 'top' : y < centerY ? 'bottom' : 'middle';
            const labelX = x + (x > centerX ? 4 : x < centerX ? -4 : 0);
            const labelY = y + (y > centerY ? 4 : y < centerY ? -4 : 0);
            ctx.fillText(stats[i].label, labelX, labelY);
          }
          ctx.stroke();

          ctx.strokeStyle = '#33e7ff';
          ctx.fillStyle = 'rgba(51, 231, 255, 0.26)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          stats.forEach((s, i) => {
            const val = Math.min(Math.max(s.val, 0), 100) / 100;
            const angle = (Math.PI*2 * i) / stats.length - Math.PI/2;
            const x = centerX + Math.cos(angle)*(radius*val);
            const y = centerY + Math.sin(angle)*(radius*val);
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          });
          ctx.closePath(); ctx.stroke(); ctx.fill();
        }
      },

      getBadgeIcon(title) {
        const t = String(title || '').toLowerCase();
        const stroke = 'rgba(51,231,255,0.65)';
        const fill = 'rgba(51,231,255,0.18)';
        let kind = 'chip';
        if (t.includes('вода') || t.includes('water')) kind = 'drop';
        else if (t.includes('кислород') || t.includes('oxygen') || t.includes('o2')) kind = 'o2';
        else if (t.includes('энерг') || t.includes('power')) kind = 'bolt';
        else if (t.includes('калибр') || t.includes('газ') || t.includes('pressure')) kind = 'gauge';
        else if (t.includes('инжен') || t.includes('tech')) kind = 'gear';

        const svg = (inner) => \`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">\${inner}</svg>\`;

        if (kind === 'bolt') return svg(\`<path d="M13 2 3 14h7l-1 8 12-14h-7l-1-6Z" fill="\${fill}" stroke="\${stroke}" stroke-width="1.6" stroke-linejoin="round"/>\`);
        if (kind === 'drop') return svg(\`<path d="M12 2s6 7 6 12a6 6 0 1 1-12 0c0-5 6-12 6-12Z" fill="\${fill}" stroke="\${stroke}" stroke-width="1.6"/>\`);
        if (kind === 'o2') return svg(\`<path d="M7 8c0-2 1-3 3-3s3 1 3 3v8c0 2-1 3-3 3s-3-1-3-3V8Z" fill="\${fill}" stroke="\${stroke}" stroke-width="1.6"/><path d="M15 9h2.5a2.5 2.5 0 0 1 0 5H15" stroke="\${stroke}" stroke-width="1.6" stroke-linecap="round"/>\`);
        if (kind === 'gauge') return svg(\`<path d="M4 14a8 8 0 1 1 16 0" stroke="\${stroke}" stroke-width="1.6" stroke-linecap="round"/><path d="M12 14l4-4" stroke="\${stroke}" stroke-width="1.6" stroke-linecap="round"/><path d="M7 20h10" stroke="\${stroke}" stroke-width="1.6" stroke-linecap="round"/>\`);
        if (kind === 'gear') return svg(\`<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="\${fill}" stroke="\${stroke}" stroke-width="1.6"/><path d="M19 12l2-1-2-1-.5-2.5-2.5-.5-1-2-1 2-2.5.5-.5 2.5-2 1 2 1 .5 2.5 2.5.5 1 2 1-2 2.5-.5.5-2.5Z" stroke="\${stroke}" stroke-width="1.2" stroke-linejoin="round"/>\`);
        return svg(\`<rect x="5" y="5" width="14" height="14" rx="3" fill="\${fill}" stroke="\${stroke}" stroke-width="1.6"/><path d="M8 9h8M8 12h8M8 15h5" stroke="\${stroke}" stroke-width="1.4" stroke-linecap="round"/>\`);
      },

      processText(text) {
        if(!text) return '';
        let t = text.replace(/{{(.*?)}}/g, (m, key) => this.variables[key.trim()] ?? m);
        t = t.replace(/\\*\\*(.+?)\\*\\*/g, '<strong class="highlight">$1</strong>');
        t = t.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
        t = t.replace(/^#\\s+(.*)$/gm, '<h1>$1</h1>');
        t = t.replace(/^##\\s+(.*)$/gm, '<h2>$1</h2>');
        t = t.replace(/\\n/g, '<br>');
        return t;
      },

      typewriter(elementId, html, onComplete) {
        const root = document.getElementById(elementId);
        if(!root) return;

        root.innerHTML = '';
        if(this.typewriterTimer) clearTimeout(this.typewriterTimer);

        const tokens = html.split(/(<[^>]+>)/g).filter(x => x !== '');
        let tokenIndex = 0;
        let charIndex = 0;

        const typeStep = () => {
          if (tokenIndex >= tokens.length) {
            if(onComplete) onComplete();
            return;
          }

          const token = tokens[tokenIndex];

          if (token.startsWith('<') && token.endsWith('>')) {
            root.innerHTML += token;
            tokenIndex++;
            typeStep();
            return;
          }

          const char = token[charIndex];
          root.innerHTML += char;
          charIndex++;

          if (charIndex % 3 === 0) this.playSfx('type');

          if (charIndex >= token.length) {
            tokenIndex++;
            charIndex = 0;
          }

          let delay = 15;
          if (['.', '!', '?', ','].includes(char)) delay = 200;
          this.typewriterTimer = setTimeout(typeStep, delay);
        };

        typeStep();
      },

      renderStepCard(view, node) {
        const { type, data } = node;
        const title = data.title || data.label || data.question || this.getNodeTypeRu(type);
        const card = document.createElement('div');
        card.className = 'step-card';
        card.innerHTML = \`
          <div class="step-row">
            <div><span class="step-key">ШАГ</span> <span class="step-val">#\${this.contentStep}</span></div>
            <div><span class="step-key">ТИП</span> <span class="step-val">\${this.escapeHtml(this.getNodeTypeRu(type))}</span></div>
            <div><span class="step-key">МОДУЛЬ</span> <span class="step-val">\${this.escapeHtml(String(title).slice(0, 42))}</span></div>
          </div>
        \`;
        view.appendChild(card);
      },

      renderNode(node) {
        const view = document.getElementById('quiz-view');
        if(!view) return;
        view.innerHTML = '';

        const { type, data } = node;

        this.renderStepCard(view, node);

        // Check for video
        const rutubeId = this.getRutubeId(data.videoUrl);
        const hasRequiredVideo = data.isRequiredWatch && rutubeId;

        if(type === 'resultNode') {
          // Set progress to 100% on result
          this.visitedInteractiveNodes = new Set(
            quizData.nodes
              .filter(n => ['questionNode', 'multipleChoiceNode', 'matchingNode', 'timelineNode', 'textInputNode', 'collectInfoNode', 'allocatorNode'].includes(n.type))
              .map(n => n.id)
          );
          this.updateProgressBar();

          if (this.saveResults) {
            this.saveResults(data.title || data.label || 'Финиш');
          }

          confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ['#33e7ff', '#ff3b5c', '#ffffff', '#ff6a3d'] });
          this.playSfx('success');

          const container = document.createElement('div');
          container.className = 'md-content';
          container.style.textAlign = 'center';

          if(data.showScore) {
            container.innerHTML += \`<div style="font-size:3rem; font-weight:800; color:#fff; margin-bottom:20px;">\${this.score} <span style="font-size:1rem; color:var(--c-text-dim); letter-spacing:0.2em;">СЧЁТ</span></div>\`;
          }

          container.innerHTML += \`<h1>\${this.processText(data.title || 'МИССИЯ ЗАВЕРШЕНА')}</h1>\`;
          container.innerHTML += \`<div id="res-desc" class="fade-in"></div>\`;

          const btn = document.createElement('button');
          btn.className = 'sci-btn selected';
          btn.innerText = 'ПЕРЕЗАПУСК СИСТЕМЫ';
          btn.onclick = () => location.reload();
          container.appendChild(btn);

          view.appendChild(container);
          this.typewriter('res-desc', this.processText(data.description));
          return;
        }

        const content = document.createElement('div');
        content.className = 'node-content';

        // Render video if present
        if (rutubeId) {
          const videoContainer = document.createElement('div');
          videoContainer.className = 'video-container';

          const videoAspect = document.createElement('div');
          videoAspect.className = 'video-aspect';

          const cover = document.createElement('div');
          cover.className = 'video-cover';
          if (data.imageUrl) {
            cover.style.backgroundImage = \`url('\${data.imageUrl}')\`;
            cover.style.backgroundSize = 'cover';
            cover.style.backgroundPosition = 'center';
          }
          cover.innerHTML = '<div class="play-btn-circle"><div class="play-triangle"></div></div>';

          cover.onclick = (e) => {
            e.stopPropagation();
            this.pauseBackgroundMusicForVideo();

            videoAspect.innerHTML = \`<iframe src="https://rutube.ru/play/embed/\${rutubeId}?autoplay=1" frameborder="0" allow="clipboard-write; autoplay" webkitAllowFullScreen mozallowfullscreen allowFullScreen style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe>\`;

            if (hasRequiredVideo) {
              this.setupRutubeListener();

              // Fallback timer
              if (data.videoDuration) {
                const fallbackDelay = (data.videoDuration + 5) * 1000;
                this.videoLockState.unlockTimer = setTimeout(() => {
                  if (this.videoLockState.isLocked) {
                    this.unlockVideoControls();
                  }
                }, fallbackDelay);
              }
            }

            this.log('ВОСПРОИЗВЕДЕНИЕ ВИДЕО', 'SYS');
          };

          videoAspect.appendChild(cover);
          videoContainer.appendChild(videoAspect);
          content.appendChild(videoContainer);
        } else if(data.imageUrl) {
          const imgContainer = document.createElement('div');
          imgContainer.className = 'node-img-container';
          imgContainer.innerHTML = \`<img src="\${data.imageUrl}" class="node-img" />\`;
          imgContainer.onclick = () => this.openHolo(data.imageUrl);
          content.appendChild(imgContainer);
        }

        if(data.title || data.label) content.innerHTML += \`<h1 class="node-title">\${this.processText(data.title || data.label)}</h1>\`;

        const textDiv = document.createElement('div');
        textDiv.id = 'node-text-' + node.id;
        textDiv.className = 'md-content';
        content.appendChild(textDiv);

        view.appendChild(content);

        const controls = document.createElement('div');
        controls.id = 'node-controls';
        controls.className = 'interactive-area opacity-0 transition-opacity duration-500';
        controls.style.position = 'relative';
        view.appendChild(controls);

        // === IMMEDIATE LOCK if required video ===
        if (hasRequiredVideo) {
          controls.classList.add('locked-controls');

          const lockOverlay = document.createElement('div');
          lockOverlay.className = 'video-lock-overlay';
          lockOverlay.innerHTML = '<div class="lock-icon">🔒</div><div>ПРОСМОТР ВИДЕО ОБЯЗАТЕЛЕН</div><div class="lock-message">Нажмите на видео для воспроизведения</div>';
          controls.appendChild(lockOverlay);

          this.videoLockState = {
            controlsElement: controls,
            overlayElement: lockOverlay,
            unlockTimer: null,
            manualUnlockTimer: null,
            isLocked: true
          };

          // Add manual unlock button after delay
          const manualUnlockDelay = (data.videoDuration || 30) * 1000;
          this.videoLockState.manualUnlockTimer = setTimeout(() => {
            if (this.videoLockState.isLocked && lockOverlay && lockOverlay.parentNode) {
              const lockMessage = lockOverlay.querySelector('.lock-message');
              if (lockMessage) {
                lockMessage.innerText = 'Видео просмотрено?';
              }

              const manualBtn = document.createElement('button');
              manualBtn.className = 'manual-unlock-btn';
              manualBtn.innerText = '✓ Я ПОСМОТРЕЛ ВИДЕО';
              manualBtn.onclick = (ev) => {
                ev.stopPropagation();
                this.unlockVideoControls();
              };
              lockOverlay.appendChild(manualBtn);
            }
          }, manualUnlockDelay);
        }

        const showControls = () => controls.classList.remove('opacity-0');

        if(type === 'questionNode' || type === 'multipleChoiceNode') {
          const isMulti = type === 'multipleChoiceNode';
          const selected = new Set();

          (data.answers || []).forEach((ans, i) => {
            const btn = document.createElement('button');
            btn.className = 'sci-btn';
            btn.innerHTML = \`<span style="color:var(--c-primary); margin-right:10px;">[\${String.fromCharCode(65+i)}]</span> \${this.processText(ans.text)}\`;
            btn.onclick = () => {
              this.playSfx('click');
              if(isMulti) {
                if(selected.has(ans.id)) { selected.delete(ans.id); btn.classList.remove('selected'); }
                else { selected.add(ans.id); btn.classList.add('selected'); }
              } else {
                const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === ans.id) || quizData.edges.find(e => e.source === node.id);
                if(edge) this.processNode(edge.target);
              }
            };
            controls.appendChild(btn);
          });

          if(isMulti) {
            const submit = document.createElement('button');
            submit.className = 'sci-btn';
            submit.innerText = data.buttonText || 'ПОДТВЕРДИТЬ';
            submit.onclick = () => {
              const correct = new Set(data.correctOptions || []);
              const isOk = correct.size === selected.size && [...selected].every(id => correct.has(id));
              this.playSfx(isOk ? 'success' : 'error');
              const handle = isOk ? 'correct' : 'incorrect';
              const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle) || quizData.edges.find(e => e.source === node.id);
              if(edge) this.processNode(edge.target);
            };
            controls.appendChild(submit);
          }
        }

        else if (type === 'textInputNode') {
          const input = document.createElement('input');
          input.className = 'sci-input';
          input.placeholder = 'ВВЕДИТЕ ДАННЫЕ...';
          controls.appendChild(input);

          const btn = document.createElement('button');
          btn.className = 'sci-btn';
          btn.innerText = data.buttonText || 'ПРОВЕРИТЬ';
          btn.onclick = () => {
            const val = input.value.trim().toLowerCase();
            const key = (data.keyword || '').toLowerCase();
            const isOk = val.includes(key);
            this.playSfx(isOk ? 'success' : 'error');
            const handle = isOk ? 'correct' : 'incorrect';
            const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle) || quizData.edges.find(e => e.source === node.id);
            if(edge) this.processNode(edge.target);
          };
          controls.appendChild(btn);
        }

        else if (type === 'matchingNode') {
          const left = Array.isArray(data.leftColumn) ? data.leftColumn : [];
          const right = Array.isArray(data.rightColumn) ? data.rightColumn : [];
          const correct = Array.isArray(data.correctPairs) ? data.correctPairs : [];

          this.temp.matching = { left: null, right: null, pairs: [] };

          const leftMap = new Map(left.map(x => [x.id, x]));
          const rightMap = new Map(right.map(x => [x.id, x]));

          const ui = document.createElement('div');
          ui.className = 'match-ui';

          const hint = document.createElement('div');
          hint.className = 'match-hintbar';
          hint.innerHTML = \`
            <div class="match-hint">
              <div style="color:#fff; font-weight:900; letter-spacing:0.12em;">ИНСТРУКЦИЯ</div>
              <div>Шаг 1: выберите элемент <b>слева</b>. Шаг 2: выберите соответствие <b>справа</b>. Пара зафиксируется автоматически.</div>
            </div>
            <div class="match-indicators">
              <div class="match-chip" id="match-chip-left">
                <span class="k">ЛЕВО:</span> <span class="v">— не выбрано —</span>
              </div>
              <div class="match-chip" id="match-chip-right">
                <span class="k">ПРАВО:</span> <span class="v">— не выбрано —</span>
              </div>
            </div>
          \`;
          ui.appendChild(hint);

          const grid = document.createElement('div');
          grid.className = 'match-grid';

          const colL = document.createElement('div');
          colL.className = 'match-col';
          colL.innerHTML = \`<div class="match-col-title">СЛЕВА <span class="sub">объект</span></div>\`;

          const colR = document.createElement('div');
          colR.className = 'match-col';
          colR.innerHTML = \`<div class="match-col-title">СПРАВА <span class="sub">функция</span></div>\`;

          const pairsBox = document.createElement('div');
          pairsBox.className = 'match-pairsbox';
          pairsBox.innerHTML = \`<div class="match-pairs-title">СОБРАННЫЕ ПАРЫ</div><div id="match-pairs-list"></div>\`;

          const updateIndicator = () => {
            const lChip = ui.querySelector('#match-chip-left');
            const rChip = ui.querySelector('#match-chip-right');

            const lObj = this.temp.matching.left ? leftMap.get(this.temp.matching.left) : null;
            const rObj = this.temp.matching.right ? rightMap.get(this.temp.matching.right) : null;

            const setChip = (chip, obj, active) => {
              chip.classList.toggle('active', !!active);
              chip.classList.toggle('empty', !obj);
              chip.querySelector('.v').textContent = obj ? (obj.text || obj.id) : '— не выбрано —';
            };

            setChip(lChip, lObj, !!this.temp.matching.left);
            setChip(rChip, rObj, !!this.temp.matching.right);
          };

          const renderPairs = () => {
            const box = pairsBox.querySelector('#match-pairs-list');
            if (!box) return;

            if (this.temp.matching.pairs.length === 0) {
              box.innerHTML = \`<div class="match-empty">Пары ещё не собраны. Выберите слева и справа.</div>\`;
              return;
            }

            box.innerHTML = this.temp.matching.pairs.map(p => {
              const l = leftMap.get(p.leftId);
              const r = rightMap.get(p.rightId);
              return \`
                <div class="match-pair-row">
                  <div class="match-pair-side">\${this.escapeHtml(l?.text || p.leftId)}</div>
                  <div class="match-arrow">→</div>
                  <div class="match-pair-side">\${this.escapeHtml(r?.text || p.rightId)}</div>
                </div>
              \`;
            }).join('');
          };

          const isUsed = (id, side) => {
            return this.temp.matching.pairs.some(p => (side === 'left') ? p.leftId === id : p.rightId === id);
          };

          const clearSelections = () => {
            this.temp.matching.left = null;
            this.temp.matching.right = null;
            updateIndicator();
          };

          const tryCommitPair = () => {
            if (!this.temp.matching.left || !this.temp.matching.right) return;

            if (isUsed(this.temp.matching.left, 'left') || isUsed(this.temp.matching.right, 'right')) {
              this.playSfx('error');
              this.log('СОПОСТАВЛЕНИЕ: элемент уже использован в паре.', "ALERT");
              clearSelections();
              renderAll();
              return;
            }

            this.temp.matching.pairs.push({ leftId: this.temp.matching.left, rightId: this.temp.matching.right });
            this.playSfx('success');
            this.log(\`СОПОСТАВЛЕНИЕ: \${this.escapeHtml(leftMap.get(this.temp.matching.left)?.text || this.temp.matching.left)} → \${this.escapeHtml(rightMap.get(this.temp.matching.right)?.text || this.temp.matching.right)}\`, "USER");
            clearSelections();
            renderAll();
          };

          const renderCol = (items, side, container) => {
            const title = container.firstChild;
            container.innerHTML = '';
            container.appendChild(title);

            items.forEach((item, idx) => {
              const el = document.createElement('div');
              el.className = 'match-item';

              const used = isUsed(item.id, side);
              const selected = (side === 'left' ? this.temp.matching.left : this.temp.matching.right) === item.id;

              if (used) el.classList.add('locked');
              if (selected) el.classList.add('selected');

              const thumb = document.createElement('div');
              thumb.className = 'match-thumb';

              if (item.imageUrl) {
                const img = document.createElement('img');
                img.src = item.imageUrl;
                img.alt = item.text || item.id;
                img.loading = 'lazy';
                thumb.appendChild(img);

                thumb.style.cursor = 'zoom-in';
                thumb.onclick = (e) => { e.stopPropagation(); this.openHolo(item.imageUrl); };
              } else {
                thumb.innerHTML = \`<span style="color:rgba(147,164,189,0.95); font-size:0.8rem; letter-spacing:0.12em;">N/A</span>\`;
              }

              const text = document.createElement('div');
              text.className = 'match-text';
              text.textContent = item.text || item.id;

              const meta = document.createElement('div');
              meta.className = 'match-meta';
              meta.textContent = side === 'left' ? ('L' + (idx+1)) : ('R' + (idx+1));

              el.appendChild(thumb);
              el.appendChild(text);
              el.appendChild(meta);

              if (!used) {
                el.onclick = () => {
                  this.playSfx('click');
                  if (side === 'left') this.temp.matching.left = item.id;
                  else this.temp.matching.right = item.id;
                  updateIndicator();
                  renderAll();
                  tryCommitPair();
                };
              }

              container.appendChild(el);
            });
          };

          const renderAll = () => {
            renderCol(left, 'left', colL);
            renderCol(right, 'right', colR);
            renderPairs();
            updateIndicator();
          };

          grid.appendChild(colL);
          grid.appendChild(colR);
          ui.appendChild(grid);
          ui.appendChild(pairsBox);

          const actions = document.createElement('div');
          actions.className = 'match-actions';

          const resetBtn = document.createElement('button');
          resetBtn.className = 'sci-btn secondary';
          resetBtn.innerText = 'СБРОСИТЬ ПАРЫ';
          resetBtn.onclick = () => {
            this.playSfx('click');
            this.temp.matching.pairs = [];
            clearSelections();
            renderAll();
            this.log('СОПОСТАВЛЕНИЕ: пары сброшены', "SYS");
          };

          const checkBtn = document.createElement('button');
          checkBtn.className = 'sci-btn';
          checkBtn.innerText = data.buttonText || 'ПРОВЕРИТЬ';
          checkBtn.onclick = () => {
            if (this.temp.matching.pairs.length !== correct.length) {
              this.playSfx('error');
              this.log(\`СОПОСТАВЛЕНИЕ: соберите все пары (\${this.temp.matching.pairs.length}/\${correct.length}).\`, "ALERT");
              return;
            }

            const isOk =
              this.temp.matching.pairs.length === correct.length &&
              correct.every(c => this.temp.matching.pairs.some(u => u.leftId === c.leftId && u.rightId === c.rightId));

            this.playSfx(isOk ? 'success' : 'error');

            const handle = isOk ? 'correct' : 'incorrect';
            const edge =
              quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle) ||
              quizData.edges.find(e => e.source === node.id);

            if(edge) this.processNode(edge.target);
          };

          actions.appendChild(resetBtn);
          actions.appendChild(checkBtn);
          ui.appendChild(actions);

          controls.appendChild(ui);

          showControls();
          renderAll();
        }

        else if (type === 'timelineNode') {
          if (!this.temp.timeline || this.temp.nodeId !== node.id) {
            this.temp.timeline = [...(data.events || [])].sort(() => Math.random() - 0.5);
            this.temp.nodeId = node.id;
          }

          const container = document.createElement('div');
          container.style.display = 'flex';
          container.style.flexDirection = 'column';
          container.style.gap = '8px';

          const renderTimeline = () => {
            container.innerHTML = '';
            this.temp.timeline.forEach((item, i) => {
              const el = document.createElement('div');
              el.className = 'sci-btn';
              el.style.margin = '0';
              el.style.display = 'flex';
              el.style.justifyContent = 'space-between';
              el.innerHTML = \`<span>\${this.escapeHtml(item.text)}</span>
                <div style="display:flex; gap:10px;">
                  <button onclick="game.moveTimeline(\${i}, -1)">▲</button>
                  <button onclick="game.moveTimeline(\${i}, 1)">▼</button>
                </div>\`;
              container.appendChild(el);
            });
          };

          game.moveTimeline = (i, d) => {
            const list = this.temp.timeline;
            if(i+d >= 0 && i+d < list.length) {
              [list[i], list[i+d]] = [list[i+d], list[i]];
              renderTimeline();
              this.playSfx('click');
            }
          };

          renderTimeline();
          controls.appendChild(container);

          const btn = document.createElement('button');
          btn.className = 'sci-btn';
          btn.innerText = data.buttonText || 'ПРОВЕРИТЬ ПОСЛЕДОВАТЕЛЬНОСТЬ';
          btn.onclick = () => {
            const current = this.temp.timeline.map(t => t.id);
            const correctOrder = (data.events || []).map(t => t.id);
            const isOk = JSON.stringify(current) === JSON.stringify(correctOrder);
            this.playSfx(isOk ? 'success' : 'error');
            const handle = isOk ? 'correct' : 'incorrect';
            const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle) || quizData.edges.find(e => e.source === node.id);
            if(edge) this.processNode(edge.target);
          };
          controls.appendChild(btn);
          showControls();
        }

        else if (type === 'allocatorNode') {
          const total = data.maxTotal || 100;
          const container = document.createElement('div');

          (data.items || []).forEach(item => {
            if(this.variables[item.variableName] === undefined) this.variables[item.variableName] = item.defaultValue || 0;

            const div = document.createElement('div');
            div.style.marginBottom = '20px';
            div.innerHTML = \`
              <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-family:'Share Tech Mono';">
                <span>\${this.escapeHtml(item.label)}</span>
                <span id="val-\${this.escapeHtml(item.id)}" style="color:var(--c-primary); font-weight:bold;">\${this.escapeHtml(this.variables[item.variableName])}</span>
              </div>
              <input type="range" class="sci-input" style="padding:0; height:6px;" min="0" max="\${total}" value="\${this.escapeHtml(this.variables[item.variableName])}"
                oninput="game.variables['\${this.escapeHtml(item.variableName)}'] = parseInt(this.value || '0'); document.getElementById('val-\${this.escapeHtml(item.id)}').innerText = this.value; game.updateDashboard();">
            \`;
            container.appendChild(div);
          });

          controls.appendChild(container);

          const btn = document.createElement('button');
          btn.className = 'sci-btn';
          btn.innerText = data.buttonText || 'РАСПРЕДЕЛИТЬ';
          btn.onclick = () => {
            this.playSfx('click');
            const edge = quizData.edges.find(e => e.source === node.id);
            if(edge) this.processNode(edge.target);
          };
          controls.appendChild(btn);
        }

        else if (type === 'collectInfoNode') {
          (data.fields || []).forEach(f => {
            const inp = document.createElement('input');
            inp.className = 'sci-input';
            inp.placeholder = f.label;
            if(this.variables[f.variableName]) inp.value = this.variables[f.variableName];
            inp.onchange = (e) => { this.variables[f.variableName] = e.target.value; this.updateDashboard(); };
            controls.appendChild(inp);
          });

          const btn = document.createElement('button');
          btn.className = 'sci-btn';
          btn.innerText = data.buttonText || 'ЗАГРУЗИТЬ';
          btn.onclick = () => {
            this.playSfx('click');
            const edge = quizData.edges.find(e => e.source === node.id);
            if(edge) this.processNode(edge.target);
          };
          controls.appendChild(btn);
        }

        else {
          const btn = document.createElement('button');
          btn.className = 'sci-btn';
          btn.innerText = data.buttonText || 'ПРОДОЛЖИТЬ';
          btn.onclick = () => {
            this.playSfx('click');
            const edge = quizData.edges.find(e => e.source === node.id);
            if(edge) this.processNode(edge.target);
          };
          controls.appendChild(btn);
        }

        this.typewriter('node-text-' + node.id, this.processText(data.description || data.question || data.message || ''), showControls);
      },

      get state() { return { variables: this.variables }; }
    };

    window.game = game;
    document.addEventListener('DOMContentLoaded', () => game.init());
    window.onload = () => game.init();
  </script>
</body>
</html>
`;

export default scienceTemplate;
