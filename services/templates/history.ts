
const historyTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Исторический Квиз</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" integrity="sha384-1C01FBF57751BC7AFA6B1546878C505950A9D7891C777D9B364E17BB4B070C7B45438DA7E8100CF3292F078EDD1B3E83" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" integrity="sha384-77EBF24347587329A83FC9DDAB6856EC5182E749EA19D5D4120A0E506C5B6E4009C19A8BEE1FA328DD061A09FD8450D2" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.min.js" integrity="sha384-4373D3C40FD427C0A09AD7647B286C33F34FC104F30FC33302FC105BE048DF37354FC7DD1A278F3FC54DE83E12C657A0" crossorigin="anonymous"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Ruslan+Display&family=Playfair+Display:wght@400;700&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #1a1625;
            --bg-panel: #2a2438;
            --gold: #eebb55;
            --gold-dim: #8a7a5a;
            --parchment: #e8e0cc;
            --parchment-dark: #d6ccb0;
            --crimson: #8a2be2; 
            --btn-red: #8b3a3a;
            --btn-red-hover: #a34b4b;
            --text-main: #3d342b;
            --text-light: #e8e0cc;
            --header-bg: #2c241b;
        }

        body {
            background-color: var(--bg-dark);
            background-image: radial-gradient(circle at 50% 50%, #252033 0%, #15121e 100%);
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
            color: var(--text-main);
            font-family: 'Cormorant Garamond', serif;
            margin: 0;
            height: 100vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        /* Starry background effect (subtle overlay) */
        .stars {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg width='50' height='50' viewBox='0 0 50 50' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='25' cy='25' r='1' fill='%23ffffff10'/%3E%3C/svg%3E");
            z-index: -1; pointer-events: none; opacity: 0.5;
        }

        /* HEADER */
        .top-bar {
            height: 80px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 40px;
            background-color: rgba(42, 32, 54, 0.9);
            backdrop-filter: blur(10px);
            border-bottom: 3px solid var(--gold-dim);
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            z-index: 20;
            position: relative;
        }
        
        .top-bar::after {
            content: '';
            position: absolute;
            bottom: -6px; left: 0; width: 100%; height: 4px;
            background: var(--gold);
            opacity: 0.5;
        }

        .header-center { text-align: center; }
        .header-title {
            font-family: 'Ruslan Display', cursive;
            color: var(--gold);
            font-size: 1.8rem;
            text-transform: uppercase;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
            display: flex; align-items: center; gap: 15px; justify-content: center;
        }
        .header-subtitle {
            font-family: 'Cormorant Garamond', serif;
            font-style: italic;
            color: #d6ccb0;
            font-size: 1.1rem;
            margin-top: -5px;
        }

        /* LAYOUT - 3 Columns */
        .game-area {
            display: grid;
            grid-template-columns: 300px 1fr 300px;
            gap: 30px;
            padding: 30px 40px;
            height: calc(100vh - 80px);
            max-width: 1800px;
            margin: 0 auto;
            width: 100%;
        }

        /* PANELS */
        .panel {
            display: flex; flex-direction: column; gap: 20px;
            overflow-y: auto;
            padding-right: 5px;
        }
        .panel::-webkit-scrollbar { width: 4px; }
        .panel::-webkit-scrollbar-thumb { background: var(--gold-dim); border-radius: 2px; }

        .scene-image-card {
            background: var(--gold); /* Gold border effect */
            padding: 3px;
            border-radius: 12px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.3);
            position: relative;
            cursor: zoom-in;
            transition: transform 0.2s;
            flex-shrink: 0;
        }
        .scene-image-card:hover { transform: scale(1.02); }
        .scene-image {
            width: 100%; height: 180px;
            object-fit: cover;
            border-radius: 10px;
            display: block;
        }
        .scene-caption {
            position: absolute; bottom: 8px; left: 8px; right: 8px;
            text-align: center; color: rgba(255,255,255,0.95);
            font-family: 'Cormorant Garamond', serif;
            font-style: italic; font-size: 0.85rem;
            text-shadow: 0 2px 4px rgba(0,0,0,0.9);
            background: rgba(0,0,0,0.4);
            border-radius: 4px;
            padding: 2px;
        }

        .info-card {
            background: #231e33;
            border: 2px solid var(--gold-dim);
            border-radius: 12px;
            padding: 20px;
            display: flex; flex-direction: column; align-items: center; gap: 10px;
            flex-shrink: 0;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
        }
        .char-icon {
            width: 80px; height: 80px; border-radius: 50%;
            border: 3px solid var(--gold);
            background: #3a2e4d;
            display: flex; align-items: center; justify-content: center;
            font-size: 40px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .char-name { color: var(--gold); font-family: 'Playfair Display', serif; font-weight: bold; font-size: 1.4rem; text-align: center; line-height: 1.2;}
        .char-role { 
            color: #d6ccb0; font-size: 0.95rem; font-style: italic; 
            border-top: 1px solid var(--gold-dim);
            padding-top: 5px; width: 100%; text-align: center;
        }

        /* Stats in Left Panel */
        .stats-row {
            display: flex; justify-content: space-around; width: 100%; margin-top: 5px;
        }
        .mini-stat { text-align: center; }
        .mini-stat-val { font-size: 1.2rem; color: var(--gold); font-weight: bold; font-family: 'Playfair Display'; }
        .mini-stat-label { font-size: 0.7rem; color: #aaa; text-transform: uppercase; letter-spacing: 1px; }

        /* Right Panel Cards */
        .timer-card {
            background: #2a2036;
            border: 2px solid var(--gold-dim);
            border-radius: 12px;
            padding: 15px;
            text-align: center;
            margin-bottom: 10px;
        }
        .timer-val {
            font-family: 'Ruslan Display', cursive;
            font-size: 2rem;
            color: var(--gold);
            text-shadow: 0 0 10px rgba(238, 187, 85, 0.3);
        }
        .timer-label { font-size: 0.8rem; color: #aaa; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; }

        .variable-list-card {
            background: #231e33;
            border: 1px solid var(--gold-dim);
            border-radius: 12px;
            padding: 15px;
            flex-shrink: 0;
        }
        .variable-row {
            display: flex; justify-content: space-between;
            padding: 8px 0; border-bottom: 1px dashed rgba(238, 187, 85, 0.2);
            font-size: 0.95rem;
        }
        .variable-row:last-child { border-bottom: none; }
        .variable-key { color: var(--text-light); opacity: 0.8; }
        .variable-val { color: var(--gold); font-weight: bold; font-family: 'Courier Prime', monospace; }

        .treasury-card {
            background: #231e33;
            border: 1px solid var(--gold-dim);
            border-radius: 12px;
            padding: 15px;
            flex-grow: 0;
            flex-shrink: 0;
        }
        .treasury-title {
            color: var(--gold); font-family: 'Playfair Display', serif;
            text-align: center; margin-bottom: 15px; font-size: 1.1rem;
            text-transform: uppercase; letter-spacing: 1px;
            border-bottom: 1px solid var(--gold-dim); padding-bottom: 8px;
        }
        .artifact-grid {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
        }
        .artifact-slot {
            aspect-ratio: 1; border: 1px solid var(--gold-dim);
            border-radius: 6px; background: rgba(0,0,0,0.2);
            display: flex; align-items: center; justify-content: center;
            font-size: 1.2rem; transition: all 0.3s;
        }
        .artifact-slot.collected {
            background: linear-gradient(135deg, #4a3b5e, #2a2036);
            border-color: var(--gold);
            box-shadow: 0 0 10px rgba(238, 187, 85, 0.4);
            transform: scale(1.05);
        }

        /* MAIN CONTENT PARCHMENT */
        .main-parchment {
            background-color: var(--parchment);
            background-image: url("https://www.transparenttextures.com/patterns/parchment.png");
            border-radius: 8px;
            position: relative;
            padding: 50px 60px;
            box-shadow: 0 0 0 1px #8a7a5a, 0 20px 60px rgba(0,0,0,0.6);
            display: flex; flex-direction: column;
            overflow: hidden;
            /* Book fold effect */
            background-image: linear-gradient(to right, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 5%, rgba(0,0,0,0) 95%, rgba(0,0,0,0.1) 100%), url("https://www.transparenttextures.com/patterns/parchment.png");
        }

        /* Decorative Corners */
        .corner {
            position: absolute; width: 50px; height: 50px;
            border: 5px solid var(--gold-dim);
            pointer-events: none;
        }
        .c-tl { top: 20px; left: 20px; border-right: none; border-bottom: none; }
        .c-tr { top: 20px; right: 20px; border-left: none; border-bottom: none; }
        .c-bl { bottom: 20px; left: 20px; border-right: none; border-top: none; }
        .c-br { bottom: 20px; right: 20px; border-left: none; border-top: none; }
        
        /* Decorative details in corners */
        .c-tl::after { content:''; position:absolute; top:5px; left:5px; width:10px; height:10px; background:var(--gold-dim); }
        .c-tr::after { content:''; position:absolute; top:5px; right:5px; width:10px; height:10px; background:var(--gold-dim); }
        .c-bl::after { content:''; position:absolute; bottom:5px; left:5px; width:10px; height:10px; background:var(--gold-dim); }
        .c-br::after { content:''; position:absolute; bottom:5px; right:5px; width:10px; height:10px; background:var(--gold-dim); }

        .content-scroll {
            overflow-y: auto; flex: 1; padding: 10px;
            scrollbar-width: thin; scrollbar-color: var(--gold-dim) transparent;
        }
        .content-scroll::-webkit-scrollbar { width: 6px; }
        .content-scroll::-webkit-scrollbar-thumb { background: var(--gold-dim); border-radius: 3px; }

        .node-title {
            font-family: 'Ruslan Display', cursive;
            font-size: 2.8rem; color: #4a2c2c;
            text-align: center; margin-bottom: 30px;
            border-bottom: 2px solid #8a7a5a;
            padding-bottom: 15px;
        }
        
        .node-body {
            font-size: 1.4rem; line-height: 1.7; color: #2b241e;
            margin-bottom: 30px; text-align: justify;
        }
        
        /* Markdown Styles within Node Body */
        .node-body h1 { font-size: 2em; font-weight: bold; margin-top: 0.5em; margin-bottom: 0.5em; color: #5c1919; font-family: 'Ruslan Display', cursive; text-align: center; }
        .node-body h2 { font-size: 1.5em; font-weight: bold; margin-top: 0.5em; margin-bottom: 0.5em; color: #5c1919; font-family: 'Playfair Display', serif; }
        .node-body h3 { font-size: 1.2em; font-weight: bold; margin-top: 0.5em; margin-bottom: 0.5em; color: #3d342b; }
        .node-body ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
        .node-body ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
        .node-body li { margin-bottom: 0.3em; }
        .node-body blockquote { border-left: 4px solid var(--gold-dim); padding-left: 1em; font-style: italic; color: #5c1919; margin: 1em 0; background: rgba(0,0,0,0.03); padding: 10px; }
        .node-body b, .node-body strong { font-weight: 700; color: #2a2036; }
        .node-body i, .node-body em { font-style: italic; }

        /* Buttons & Interactions */
        .action-btn {
            background: linear-gradient(to bottom, #8b3a3a, #5c1919);
            color: #fff;
            font-family: 'Playfair Display', serif; font-weight: 700;
            font-size: 1.2rem; text-transform: uppercase; letter-spacing: 1px;
            padding: 18px 32px;
            border: 3px double #eebb55;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            transition: all 0.2s;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center; gap: 10px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        }
        .action-btn:hover {
            transform: translateY(-2px);
            background: linear-gradient(to bottom, #a34b4b, #702020);
            box-shadow: 0 6px 12px rgba(0,0,0,0.4);
            border-color: #ffd700;
        }
        
        .option-btn {
            background: rgba(255,255,255,0.6);
            border: 2px solid var(--gold-dim);
            padding: 16px 20px;
            width: 100%; text-align: left;
            font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 600;
            color: var(--text-main);
            margin-bottom: 12px;
            border-radius: 8px;
            cursor: pointer; transition: all 0.2s;
            display: flex; align-items: center; gap: 15px;
        }
        .option-btn:hover {
            background: #fff; border-color: #5c1919; transform: translateX(5px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .option-btn.selected {
            background: #fff;
            border-color: #eebb55;
            box-shadow: 0 0 10px rgba(238, 187, 85, 0.4);
        }
        .option-badge {
            width: 32px; height: 32px; border: 2px solid var(--text-main); border-radius: 50%;
            display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: bold;
        }

        /* Inputs */
        .history-input {
            width: 100%; background: transparent;
            border: none; border-bottom: 2px solid var(--gold-dim);
            font-family: 'Cormorant Garamond', serif; font-size: 1.5rem;
            color: #5c1919; padding: 10px; text-align: center;
            outline: none; margin-bottom: 20px;
        }
        .history-input:focus { border-color: #5c1919; }

        /* Allocator / Sliders */
        .alloc-row { margin-bottom: 15px; }
        .alloc-label { display:flex; justify-content:space-between; font-weight:bold; margin-bottom:5px; color:#5c1919; }
        .history-slider {
            -webkit-appearance: none; width: 100%; height: 6px; background: var(--gold-dim);
            border-radius: 3px; outline: none;
        }
        .history-slider::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none; width: 20px; height: 20px;
            border-radius: 50%; background: #8b3a3a; border: 2px solid #5c1919; cursor: pointer;
        }

        /* Timeline */
        .timeline-item {
            background: rgba(255,255,255,0.6); border: 1px solid var(--gold-dim);
            padding: 10px; border-radius: 6px; margin-bottom: 8px;
            display: flex; align-items: center; gap: 15px;
        }
        .timeline-controls button {
            background: transparent; border: 1px solid var(--text-main);
            width: 24px; height: 24px; cursor: pointer; border-radius: 4px;
            display: flex; align-items: center; justify-content: center; font-size: 0.8rem;
        }
        .timeline-controls button:hover { background: var(--text-main); color: #fff; }

        /* Matching */
        .match-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 10px;}
        .match-item {
            padding: 15px; border: 2px dashed var(--gold-dim); border-radius: 8px;
            text-align: center; cursor: pointer; font-weight: 600; transition: all 0.2s;
            background: rgba(255,255,255,0.3);
            font-family: 'Cormorant Garamond', serif;
        }
        .match-item:hover { background: rgba(255,255,255,0.8); border-style: solid; border-color: #5c1919;}
        .match-item.selected { border-color: #5c1919; background: #eebb55; color: #2b241e; border-style: solid; }
        .match-item.matched { opacity: 0.5; cursor: default; background: #dcebd5; border-color: #3e662a; color: #2b3a1a; border-style: solid;}
        
        .match-col-title {
             text-align: center;
             font-weight: bold;
             color: #5c1919;
             margin-bottom: 8px;
             font-family: 'Playfair Display', serif;
             text-transform: uppercase;
             letter-spacing: 1px;
             font-size: 0.9rem;
        }
        .match-pairs-list {
            margin-top: 15px;
            border-top: 1px dashed var(--gold-dim);
            padding-top: 10px;
            font-size: 0.9rem;
            color: #5c1919;
        }
        .match-pair-row {
            display: flex; justify-content: space-between; padding: 4px 10px;
            background: rgba(255,255,255,0.4); margin-bottom: 4px; border-radius: 4px;
        }

        /* Video Container */
        .video-frame {
            border: 4px double var(--gold-dim);
            padding: 4px;
            background: #2a2036;
            margin-bottom: 20px;
            border-radius: 4px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .video-aspect {
            position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;
        }
        .video-aspect iframe {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        }

        /* Video Control Styles */
        .locked-controls { opacity: 0.5; pointer-events: none; filter: grayscale(1); transition: all 0.5s; position: relative; }
        .video-lock-overlay { 
            position: absolute; 
            inset: -10px; 
            background: rgba(20, 15, 30, 0.85); 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            z-index: 10; 
            border: 1px solid var(--gold-dim); 
            border-radius: 4px; 
            color: var(--gold); 
            text-align: center; 
            font-family: 'Playfair Display', serif; 
            backdrop-filter: blur(2px); 
        }
        .lock-icon { font-size: 24px; margin-bottom: 5px; }
        .lock-message { font-size: 0.9rem; color: #d6ccb0; margin-top: 5px; font-style: italic; }
        .manual-unlock-btn {
            margin-top: 15px; padding: 10px 20px; background: #586c48; color: #e8e0cc;
            border: 2px solid #cba353; border-radius: 4px; cursor: pointer; font-family: 'Playfair Display', serif;
            font-weight: bold; pointer-events: auto; transition: all 0.3s;
        }
        .manual-unlock-btn:hover { background: #4a5c3a; }
        
        .video-cover { position: absolute; inset: 0; background-size: cover; background-position: center; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 2; transition: all 0.3s; background-color: #000; }
        .video-cover:hover { background-color: rgba(0,0,0,0.3); }
        .play-btn-circle { width: 60px; height: 60px; background: rgba(238, 187, 85, 0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(238, 187, 85, 0.4); border: 2px solid #fff; transition: transform 0.2s; }
        .play-btn-circle:hover { transform: scale(1.1); background: #fff; border-color: var(--gold); }
        .play-triangle { width: 0; height: 0; border-left: 20px solid #5c1919; border-top: 12px solid transparent; border-bottom: 12px solid transparent; margin-left: 4px; }
        
        /* Node Timer Bar */
        .node-timer-bar {
            height: 4px; background: #2a2438; border-radius: 2px; margin-bottom: 15px; overflow: hidden;
        }
        .node-timer-fill {
            height: 100%; background: #d946ef; width: 100%; transition: width 1s linear;
        }

        /* --- RESULT DECREE STYLE --- */
        .result-decree {
            border: 8px double var(--gold-dim);
            padding: 40px;
            position: relative;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 4px;
            margin-bottom: 20px;
            text-align: center;
            box-shadow: inset 0 0 80px rgba(139, 115, 85, 0.2);
        }
        .wax-seal {
            width: 100px; height: 100px;
            background: radial-gradient(circle at 30% 30%, #ff4d4d, #8b0000);
            border-radius: 50%;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            position: absolute;
            top: -20px;
            right: -20px;
            display: flex; align-items: center; justify-content: center;
            color: rgba(255,255,255,0.9);
            font-family: 'Ruslan Display', cursive;
            font-size: 14px;
            transform: rotate(15deg);
            border: 4px dashed rgba(60, 10, 10, 0.3);
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        .result-score {
            font-size: 1.8rem;
            color: #5c1919;
            font-weight: bold;
            margin-top: 20px;
            border-top: 2px solid var(--gold-dim);
            padding-top: 15px;
            font-family: 'Playfair Display', serif;
        }

        .fade-in { animation: fadeIn 0.6s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        /* Lightbox */
        #lightbox {
            position: fixed; inset: 0; background: rgba(10, 8, 15, 0.95); z-index: 9999;
            display: none; align-items: center; justify-content: center; cursor: zoom-out;
            opacity: 0; transition: opacity 0.3s;
        }
        #lightbox.open { display: flex; opacity: 1; }
        #lightbox img {
            max-width: 90vw; max-height: 90vh; 
            border: 4px solid var(--gold); border-radius: 8px;
            box-shadow: 0 0 50px rgba(0,0,0,0.8);
        }

        @media (max-width: 1200px) {
            .game-area { grid-template-columns: 1fr; height: auto; gap: 20px; }
            .panel { width: 100%; max-height: 300px; margin-bottom: 20px; }
            .sidebar-right { order: 3; }
        }
    </style>
</head>
<body>
    <div class="stars"></div>
    <div class="top-bar">
        <div style="width: 50px;"></div> <!-- Spacer -->
        
        <div class="header-center">
            <div class="header-title">
                <span>⚜️</span>
                <span id="quiz-title">История</span>
                <span>⚜️</span>
            </div>
            <div id="quiz-subtitle" class="header-subtitle">Глава I</div>
        </div>

         <div style="width: 50px;"></div> <!-- Spacer -->
    </div>

    <div class="game-area">
        <!-- Sidebar LEFT: Character & Stats -->
        <aside class="panel">
            <div id="scene-image-card" class="scene-image-card">
                <img id="side-image" src="https://images.unsplash.com/photo-1546265492-cd22e34279b9?auto=format&fit=crop&w=600&q=80" class="scene-image" alt="Scene">
                <div class="scene-caption" id="image-caption">Историческая сцена</div>
            </div>

            <div class="info-card">
                <div class="char-icon" id="player-avatar">👤</div>
                <div>
                    <div class="char-name" id="player-name">Игрок</div>
                    <div class="char-role" id="player-rank">Путешественник во времени</div>
                </div>
                
                <div class="stats-row">
                     <div class="mini-stat">
                        <div id="score-display" class="mini-stat-val">0</div>
                        <div class="mini-stat-label">Очки</div>
                     </div>
                     <div class="mini-stat">
                        <div id="rep-display" class="mini-stat-val">0</div>
                        <div class="mini-stat-label">Репутация</div>
                     </div>
                </div>
            </div>

            <div class="quote-box" id="quote-box">
                "История — это фонарь в будущее..."
            </div>
        </aside>

        <!-- Main Content CENTER -->
        <main class="main-parchment">
            <div class="c-tl corner"></div><div class="c-tr corner"></div><div class="c-bl corner"></div><div class="c-br corner"></div>
            
            <div id="game-content" class="content-scroll fade-in">
                <!-- Node Content Here -->
                <div class="node-title">Загрузка летописи...</div>
            </div>
        </main>
        
        <!-- Sidebar RIGHT: Timer, Variables, Inventory -->
        <aside class="panel">
             <div class="timer-card">
                 <div class="timer-label">Песочные часы</div>
                 <div id="global-timer" class="timer-val">00:00</div>
             </div>
             
             <!-- Custom Variables Section -->
            <div class="variable-list-card" id="custom-vars-card" style="display:none;">
                <div class="treasury-title" style="margin-bottom:10px; font-size:1rem;">⚜ Летопись ⚜</div>
                <div id="custom-vars-list"></div>
            </div>

            <div class="treasury-card">
                <div class="treasury-title">⚜ Сокровищница ⚜</div>
                <div class="artifact-grid" id="artifact-grid">
                    <!-- JS will populate -->
                </div>
            </div>
        </aside>
    </div>
    
    <!-- Lightbox -->
    <div id="lightbox">
        <img id="lightbox-img" src="" alt="Zoomed Image">
    </div>

    <script>
        const quizData = %%QUIZ_DATA_INJECTION%%;

        // Global lock state tracker
        let currentVideoLockState = {
            controlsElement: null,
            overlayElement: null,
            unlockTimer: null,
            manualUnlockTimer: null,
            isLocked: false
        };

        const game = {
            state: {
                currentNodeId: null,
                score: 0,
                variables: {},
                achievements: [],
                temp: { 
                    selectedAnswers: new Set(),
                    matching: { left: null, right: null, pairs: [] },
                    timeline: []
                },
                pathData: [],
                sessionId: null,
                isResultSaved: false,
                visitedInteractiveNodes: new Set(),
                nodeTimerInterval: null
            },
            nodes: new Map(),
            resultsApiBase: '',
            timerInterval: null,
            bgAudio: null,
            bgWasPlayingBeforeVideo: false,
            rutubeOnMessage: null,

            init() {
                try {
                    if(!quizData) throw new Error("No Quiz Data");
                    quizData.nodes.forEach(n => this.nodes.set(n.id, n));
                    const sceneImageCard = document.getElementById('scene-image-card');
                    const lightbox = document.getElementById('lightbox');
                    const lightboxImage = document.getElementById('lightbox-img');
                    sceneImageCard?.addEventListener('click', () => this.openLightbox());
                    lightbox?.addEventListener('click', () => this.closeLightbox());
                    lightboxImage?.addEventListener('click', (event) => event.stopPropagation());
                    
                    if(quizData.currentQuizName) {
                        const parts = quizData.currentQuizName.split(/[:.]/);
                        document.getElementById('quiz-title').innerText = parts[0];
                        if(parts[1]) document.getElementById('quiz-subtitle').innerText = parts[1];
                    }

                    // Apply Custom Background if present
                    if (quizData.designSettings?.background?.imageUrl) {
                        document.body.style.backgroundImage = \`url('\${quizData.designSettings.background.imageUrl}')\`;
                    }

                    // Initial Avatar (Random medieval style)
                    document.getElementById('player-avatar').innerHTML = '🛡️';

                    this.resultsApiBase = (quizData.apiBaseUrl || '').replace(/\/$/, '');

                    // Generate Session ID
                    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                        this.state.sessionId = crypto.randomUUID();
                    } else {
                        this.state.sessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                    }
                    
                    // Initialize background music
                    this.initAudio();
                    
                    // Start Global Timer
                    this.startTimer();
                    
                    // Reset lock state
                    currentVideoLockState = {
                        controlsElement: null,
                        overlayElement: null,
                        unlockTimer: null,
                        manualUnlockTimer: null,
                        isLocked: false
                    };

                    if (quizData.startNodeId && !this.nodes.get(quizData.startNodeId)?.type.includes('startNode')) {
                         // PREVIEW FROM SPECIFIC NODE
                         this.processNode(quizData.startNodeId);
                    } else {
                         const startNode = quizData.nodes.find(n => n.type === 'startNode') || quizData.nodes[0];
                         if(startNode) {
                             this.processNode(startNode.id);
                         } else {
                             document.getElementById('game-content').innerHTML = '<div style="color:red; text-align:center; margin-top:20px;">Ошибка: Нет стартового узла</div>';
                         }
                    }

                } catch(e) {
                     console.error("Init error:", e);
                     document.getElementById('game-content').innerHTML = \`<div style="color:red; text-align:center; margin-top:20px;">Ошибка запуска: \${e.message}</div>\`;
                }
            },
            
            startTimer() {
                // Check for global timer settings
                const globalTimer = quizData.globalTimer;
                const isCountdown = globalTimer && globalTimer.enabled;
                let seconds = isCountdown ? (globalTimer.duration || 0) : 0;

                // Initial display
                const updateDisplay = () => {
                    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
                    const s = (seconds % 60).toString().padStart(2, '0');
                    const el = document.getElementById('global-timer');
                    if (el) el.innerText = \`\${m}:\${s}\`;
                };
                updateDisplay();

                this.timerInterval = setInterval(() => {
                    if (isCountdown) {
                        if (seconds > 0) {
                            seconds--;
                        } else {
                            clearInterval(this.timerInterval);
                            // Optional: Trigger timeout action if needed
                            if (globalTimer.onTimeoutNodeId) {
                                 this.processNode(globalTimer.onTimeoutNodeId);
                            } else {
                                // Default timeout behavior or alert
                            }
                        }
                    } else {
                        seconds++;
                    }
                    updateDisplay();
                }, 1000);
            },
            
            initAudio() {
                 if (quizData.designSettings?.sound?.backgroundMusic) {
                     this.bgAudio = new Audio(quizData.designSettings.sound.backgroundMusic);
                     this.bgAudio.loop = true;
                     this.bgAudio.volume = (quizData.designSettings.sound.volume ?? 0.5) * 0.3; 
                     
                     // Play on interaction
                     const startAudio = () => {
                         this.safePlayAudio(this.bgAudio);
                         document.removeEventListener('click', startAudio);
                     };
                     document.addEventListener('click', startAudio);
                 }
            },
            
            safePlayAudio(audio) {
                if (!audio) return;
                const p = audio.play();
                if (p && typeof p.catch === 'function') {
                    p.catch(() => {
                        // Autoplay policy fallback: resume on next click
                        const once = () => {
                            audio.play().catch(() => {});
                            document.removeEventListener('click', once);
                        };
                        document.addEventListener('click', once);
                    });
                }
            },

            pauseBackgroundMusicForVideo() {
                if (!this.bgAudio) { this.bgWasPlayingBeforeVideo = false; return; }
                this.bgWasPlayingBeforeVideo = !this.bgAudio.paused;
                if (this.bgWasPlayingBeforeVideo) this.bgAudio.pause();
            },

            resumeBackgroundMusicAfterVideo() {
                if (!this.bgAudio) return;
                if (!this.bgWasPlayingBeforeVideo) return;
                this.bgWasPlayingBeforeVideo = false;
                this.safePlayAudio(this.bgAudio);
            },

            cleanupRutubeListener() {
                if (this.rutubeOnMessage) {
                    window.removeEventListener('message', this.rutubeOnMessage);
                    this.rutubeOnMessage = null;
                }
            },
            
            // Centralized Unlock Function
            unlockVideoControls() {
                if (!currentVideoLockState.isLocked) return;
                
                const ctrls = currentVideoLockState.controlsElement || document.getElementById('node-controls');
                const overlay = currentVideoLockState.overlayElement || document.querySelector('.video-lock-overlay');
                
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
                
                // Clear all timers
                if (currentVideoLockState.unlockTimer) {
                    clearTimeout(currentVideoLockState.unlockTimer);
                    currentVideoLockState.unlockTimer = null;
                }
                if (currentVideoLockState.manualUnlockTimer) {
                    clearTimeout(currentVideoLockState.manualUnlockTimer);
                    currentVideoLockState.manualUnlockTimer = null;
                }
                
                currentVideoLockState.isLocked = false;
                currentVideoLockState.controlsElement = null;
                currentVideoLockState.overlayElement = null;
                
                this.resumeBackgroundMusicAfterVideo();
                this.cleanupRutubeListener();
            },
            
            // Setup RuTube Listener
            setupRutubeListener() {
                this.cleanupRutubeListener();
                
                const onMessage = (ev) => {
                    try {
                        let data = ev.data;
                        
                        // Parse if string
                        if (typeof data === 'string') {
                            try {
                                data = JSON.parse(data);
                            } catch (parseErr) {
                                // Check raw string for ended indicator
                                if (data.includes('ended') || data.includes('complete') || data.includes('finish')) {
                                    this.unlockVideoControls();
                                    return;
                                }
                                return;
                            }
                        }
                        
                        if (!data || typeof data !== 'object') return;
                        
                        // Check multiple possible event formats
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
                        
                        // Also check for progress near 100%
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
                        // ignore
                    }
                };

                this.rutubeOnMessage = onMessage;
                window.addEventListener('message', this.rutubeOnMessage);
            },

            cleanupMediaOnNodeChange() {
                this.cleanupRutubeListener();
                this.resumeBackgroundMusicAfterVideo();
                
                // Cleanup any pending video lock state
                if (currentVideoLockState.unlockTimer) {
                    clearTimeout(currentVideoLockState.unlockTimer);
                }
                if (currentVideoLockState.manualUnlockTimer) {
                    clearTimeout(currentVideoLockState.manualUnlockTimer);
                }
                currentVideoLockState = {
                    controlsElement: null,
                    overlayElement: null,
                    unlockTimer: null,
                    manualUnlockTimer: null,
                    isLocked: false
                };

                // Cleanup node timer
                if (this.state.nodeTimerInterval) {
                    clearInterval(this.state.nodeTimerInterval);
                    this.state.nodeTimerInterval = null;
                }
            },
            
            playSound(type, nodeOverrideUrl) {
                // Priority: Node Override -> Global Settings -> No Sound
                let src = nodeOverrideUrl;
                
                if (!src && quizData.designSettings?.sound) {
                    const global = quizData.designSettings.sound;
                    if (type === 'click') src = global.buttonClick;
                    else if (type === 'success' || type === 'correctAnswer') src = global.correctAnswer;
                    else if (type === 'error' || type === 'incorrectAnswer') src = global.incorrectAnswer;
                    else if (type === 'achievement') src = global.achievementUnlock;
                }
                
                if (src) {
                    const audio = new Audio(src);
                    audio.volume = quizData.designSettings?.sound?.volume ?? 0.5;
                    audio.play().catch(() => {});
                }
            },
            
            getRutubeId(url) {
                if (!url) return null;
                const regex = /(?:rutube\\.ru\\/(?:video|play\\/embed)\\/)([a-zA-Z0-9]+)/;
                const match = url.match(regex);
                return match ? match[1] : null;
            },
            
            getTotalInteractiveNodes() {
                if (!quizData || !quizData.nodes) return 0;
                const interactiveTypes = [
                    'questionNode', 
                    'multipleChoiceNode', 
                    'matchingNode', 
                    'timelineNode', 
                    'textInputNode',
                    'collectInfoNode',
                    'allocatorNode'
                ];
                return quizData.nodes.filter(n => interactiveTypes.includes(n.type)).length;
            },

            updateHUD() {
                document.getElementById('score-display').innerText = this.state.score;
                const name = this.state.variables['playerName'] || 'Игрок';
                document.getElementById('player-name').innerText = name;
                
                // Progress Calculation logic (replaces rep-display if needed, but keeping rep for now)
                const totalNodes = this.getTotalInteractiveNodes();
                const visitedCount = this.state.visitedInteractiveNodes.size;
                let pct = 0;
                if (totalNodes > 0) {
                    pct = Math.round((visitedCount / totalNodes) * 100);
                    pct = Math.min(pct, 100);
                }
                const repDisplay = document.getElementById('rep-display');
                if (repDisplay) repDisplay.innerText = \`\${pct}%\`;
                
                // --- Dynamic Rank Update (Progression Node) ---
                const rank = this.state.variables['rankName'] || 'Путешественник во времени';
                const rankEl = document.getElementById('player-rank');
                if (rankEl) rankEl.innerText = rank;
                
                // --- Variables Panel Logic ---
                const varListContainer = document.getElementById('custom-vars-list');
                const varCard = document.getElementById('custom-vars-card');
                
                if (varListContainer) {
                    varListContainer.innerHTML = '';
                    let hasVars = false;
                    
                    // Filter variables to show
                    Object.entries(this.state.variables).forEach(([key, value]) => {
                         if (['score', 'playerName', 'reputation', 'rankName'].includes(key)) return; // Skip standard/internal
                         
                         hasVars = true;
                         const row = document.createElement('div');
                         row.className = 'variable-row';
                         row.innerHTML = \`<span class="variable-key">\${key}</span> <span class="variable-val">\${value}</span>\`;
                         varListContainer.appendChild(row);
                    });
                    
                    if (hasVars) varCard.style.display = 'block';
                    else varCard.style.display = 'none';
                }

                // Artifacts
                const grid = document.getElementById('artifact-grid');
                grid.innerHTML = '';
                // Fill unlocked
                this.state.achievements.forEach(ach => {
                    const slot = document.createElement('div');
                    slot.className = 'artifact-slot collected';
                    slot.innerHTML = '🏆';
                    slot.title = ach;
                    slot.style.background = '#fff';
                    slot.style.borderColor = '#eebb55';
                    grid.appendChild(slot);
                });
                // Fill empty (up to 8)
                for(let i=this.state.achievements.length; i<8; i++) {
                     const slot = document.createElement('div');
                     slot.className = 'artifact-slot';
                     grid.appendChild(slot);
                }
            },
            
            trackPath(node, details = {}) {
                this.state.pathData.push({
                    nodeId: node.id,
                    nodeType: node.type,
                    nodeLabel: node.data.label || node.data.title || 'Step',
                    timestamp: new Date().toISOString(),
                    details: details
                });
            },

            async saveResults(finalNodeTitle) {
                if (!this.resultsApiBase || !quizData.quizId || this.state.isResultSaved) return;
                try {
                    const participantName = this.state.variables.username || this.state.variables.playerName || 'Игрок';
                    
                    const payload = {
                        quiz_id: quizData.quizId,
                        session_id: this.state.sessionId,
                        score: this.state.score,
                        final_node_title: finalNodeTitle,
                        participant_name: participantName,
                        results_data: { 
                            variables: this.state.variables, 
                            achievements: this.state.achievements 
                        },
                        path_data: this.state.pathData
                    };

                    const response = await fetch(this.resultsApiBase + '/results', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        keepalive: true
                    });

                    if (!response.ok) {
                         console.error('Save error:', response.status);
                         return;
                    }
                    this.state.isResultSaved = true;
                } catch (err) { console.error(err); }
            },

            processText(text) {
                if (!text) return '';
                // Variable interpolation
                let processed = text.replace(/{{(.*?)}}/g, (m, k) => {
                    k = k.trim();
                    if(k === 'score') return this.state.score;
                    return this.state.variables[k] !== undefined ? this.state.variables[k] : m;
                });
                
                // Markdown Parsing
                processed = processed
                    .replace(/\\*\\*(.*?)\\*\\*/g, '<b>$1</b>')
                    .replace(/\\*(.*?)\\*/g, '<i>$1</i>')
                    .replace(/__(.*?)__/g, '<u>$1</u>')
                    .replace(/~~(.*?)~~/g, '<s>$1</s>')
                    .replace(/^#\\s+(.*)$/gm, '<h2>$1</h2>')
                    .replace(/^##\\s+(.*)$/gm, '<h3>$1</h3>')
                    .replace(/^\\s*[\\-\\*]\\s+(.*)$/gm, '<li>$1</li>')
                    .replace(/\\n/g, '<br>');
                
                if (processed.includes('<li>')) {
                    processed = processed.replace(/((?:<li>.*<\\/li>)+)/g, '<ul>$1</ul>');
                }
                
                return processed;
            },

            goToNext(sourceId, handleId = null) {
                const edge = quizData.edges.find(e => e.source === sourceId && (!handleId || e.sourceHandle === handleId));
                const fallback = quizData.edges.find(e => e.source === sourceId);
                const targetId = edge ? edge.target : (fallback ? fallback.target : null);
                
                if (targetId) this.processNode(targetId);
            },

            openLightbox(src) {
                 const img = document.getElementById('lightbox-img');
                 img.src = src || document.getElementById('side-image').src;
                 document.getElementById('lightbox').classList.add('open');
            },
            closeLightbox() {
                 document.getElementById('lightbox').classList.remove('open');
            },

            // --- RENDER HELPERS ---
            renderMedia(node, container) {
                 // Video Support
                 const rutubeId = this.getRutubeId(node.data.videoUrl);
                 const hasRequiredVideo = node.data.isRequiredWatch && rutubeId;
                 
                 if (rutubeId) {
                     const wrapper = document.createElement('div');
                     wrapper.className = 'video-frame';
                     
                     const aspect = document.createElement('div');
                     aspect.className = 'video-aspect';
                     
                     const cover = document.createElement('div');
                     cover.className = 'video-cover';
                     if (node.data.imageUrl) {
                        cover.style.backgroundImage = \`url('\${node.data.imageUrl}')\`;
                     }
                     cover.innerHTML = '<div class="play-btn-circle"><div class="play-triangle"></div></div>';
                     
                     cover.onclick = (e) => {
                        e.stopPropagation();
                        this.pauseBackgroundMusicForVideo();
                        
                        aspect.innerHTML = \`<iframe src="https://rutube.ru/play/embed/\${rutubeId}?autoplay=1" frameborder="0" allow="clipboard-write; autoplay" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>\`;
                        
                        if (hasRequiredVideo) {
                             this.setupRutubeListener();
                             // Use controls ID convention
                             currentVideoLockState.controlsElement = document.getElementById('node-controls');
                             currentVideoLockState.overlayElement = document.querySelector('.video-lock-overlay');
                             currentVideoLockState.isLocked = true;
                             
                             if (node.data.videoDuration) {
                                  const fallbackDelay = (node.data.videoDuration + 5) * 1000;
                                  currentVideoLockState.unlockTimer = setTimeout(() => {
                                      if (currentVideoLockState.isLocked) this.unlockVideoControls();
                                  }, fallbackDelay);
                             }
                        }
                     };
                     
                     aspect.appendChild(cover);
                     wrapper.appendChild(aspect);
                     container.appendChild(wrapper);
                     return hasRequiredVideo;
                 }
                 
                 return false;
            },
            
            handleNodeTimer(node, container) {
                 if (node.data.timer && node.data.timer > 0) {
                     const timerBar = document.createElement('div');
                     timerBar.className = 'node-timer-bar';
                     const fill = document.createElement('div');
                     fill.className = 'node-timer-fill';
                     fill.style.transitionDuration = \`\${node.data.timer}s\`;
                     timerBar.appendChild(fill);
                     container.appendChild(timerBar);
                     
                     // Trigger reflow
                     setTimeout(() => { fill.style.width = '0%'; }, 50);
                     
                     this.state.nodeTimerInterval = setTimeout(() => {
                          this.playSound('error'); // Timeout sound
                          // Logic for timeout edge
                          const timeoutEdge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === 'timeout');
                          const defaultEdge = quizData.edges.find(e => e.source === node.id);
                          const nextId = timeoutEdge ? timeoutEdge.target : (defaultEdge ? defaultEdge.target : null);
                          
                          if (nextId) this.processNode(nextId);
                     }, node.data.timer * 1000);
                 }
            },

            processNode(id) {
                this.cleanupMediaOnNodeChange(); // Cleanup media/timers from previous node

                const node = this.nodes.get(id);
                if(!node) return;
                this.state.currentNodeId = id;
                this.trackPath(node);
                
                // Track interactive node visit for progress
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
                    this.state.visitedInteractiveNodes.add(node.id);
                }

                // Logic Nodes
                if(['scoreNode', 'variableNode', 'conditionNode', 'formulaNode', 'achievementNode', 'goToNode', 'startNode', 'progressionNode'].includes(node.type)) {
                    this.executeLogic(node);
                    return;
                }
                
                // Play custom entry sound if set
                if (node.data.soundSettings?.onEntry) {
                    this.playSound(null, node.data.soundSettings.onEntry);
                }

                this.renderNode(node);
                this.updateHUD();
                
                if(node.type !== 'startNode') this.playSound('click'); // Generic sound for new content
            },

            executeLogic(node) {
                 const { type, data } = node;
                 let nextId = null;
                 
                 if (type === 'scoreNode') {
                     const val = parseInt(data.value || 0);
                     if(data.operation === 'add') this.state.score += val;
                     else if(data.operation === 'subtract') this.state.score -= val;
                     else this.state.score = val;
                 } else if (type === 'variableNode') {
                     const v = data.variableName; const val = data.value;
                     if(!this.state.variables[v]) this.state.variables[v] = 0;
                     
                     // Check if value is number
                     const numVal = parseFloat(val);
                     if (!isNaN(numVal)) {
                        if(data.operation === 'add') this.state.variables[v] = (parseFloat(this.state.variables[v])||0) + numVal;
                        else if(data.operation === 'subtract') this.state.variables[v] = (parseFloat(this.state.variables[v])||0) - numVal;
                        else this.state.variables[v] = val; // Set can be string or number
                     } else {
                         this.state.variables[v] = val;
                     }
                 } else if (type === 'achievementNode') {
                     if(!this.state.achievements.includes(data.title)) {
                         this.state.achievements.push(data.title);
                         this.playSound('achievement');
                         confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#d4af37'] });
                     }
                 } else if (type === 'conditionNode') {
                     const curr = this.state.variables[data.variable] ?? this.state.score;
                     const target = data.value;
                     let res = false;
                     // Simple comparison (can extend)
                     if(data.operator === 'eq') res = curr == target;
                     else if(data.operator === 'neq') res = curr != target;
                     else if(data.operator === 'gt') res = parseFloat(curr) > parseFloat(target);
                     else if(data.operator === 'lt') res = parseFloat(curr) < parseFloat(target);
                     else if(data.operator === 'gte') res = parseFloat(curr) >= parseFloat(target);
                     else if(data.operator === 'lte') res = parseFloat(curr) <= parseFloat(target);
                     else if(data.operator === 'contains') res = String(curr).includes(String(target));

                     const tEdge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === 'true');
                     const fEdge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === 'false');
                     if(res && tEdge) nextId = tEdge.target; else if(!res && fEdge) nextId = fEdge.target;
                     if(nextId) { this.processNode(nextId); return; }
                 } else if (type === 'goToNode') {
                     if(data.targetNodeId) nextId = data.targetNodeId;
                 } else if (type === 'formulaNode') {
                     if (window.math && data.expression) {
                         try {
                             const scope = { ...this.state.variables, score: this.state.score };
                             let res = window.math.evaluate(data.expression, scope);
                             if (data.decimalPlaces !== undefined) res = parseFloat(res.toFixed(data.decimalPlaces));
                             this.state.variables[data.variableName] = res;
                         } catch(e) { console.error("Formula error", e); }
                     }
                 } else if (type === 'progressionNode') {
                    // Logic from engine
                    const currentLevel = this.state.variables[data.levelVar] || 0;
                    let bestRule = null;
                    const sortedRules = (data.rules || []).sort((a, b) => b.level - a.level);
                    
                    for (const rule of sortedRules) {
                        const pass = (rule.requirements || []).every(req => {
                            let val = 0;
                            if (req.type.includes('Score')) val = this.state.score;
                            else if (req.variable) val = this.state.variables[req.variable] || 0;
                            
                            if (req.type === 'minVar' || req.type === 'minScore') return val >= req.value;
                            if (req.type === 'maxVar' || req.type === 'maxScore') return val <= req.value;
                            return false;
                        });
                        if (pass) { bestRule = rule; break; }
                    }
                    
                    let handle = 'default';
                    if (bestRule) {
                        if (bestRule.level > currentLevel) {
                            handle = 'levelUp';
                            this.state.variables[data.levelVar] = bestRule.level;
                            this.state.variables[data.nameVar] = bestRule.name;
                            // Visual Cue for level up
                            confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 }, colors: ['#ffd700'] });
                            this.playSound('achievement');
                        } else if (!data.lockDegrade && bestRule.level < currentLevel) {
                            this.state.variables[data.levelVar] = bestRule.level;
                            this.state.variables[data.nameVar] = bestRule.name;
                        }
                    }
                    const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle) || quizData.edges.find(e => e.source === node.id);
                    if(edge) nextId = edge.target;
                 }

                 if(!nextId) {
                     const edge = quizData.edges.find(e => e.source === node.id);
                     if(edge) nextId = edge.target;
                 }
                 if(nextId) this.processNode(nextId);
            },

                   renderNode(node) {
                const content = document.getElementById('game-content');
                content.innerHTML = '';
                
                const title = document.createElement('div');
                title.className = 'node-title';
                title.innerText = node.data.title || node.data.label || 'Событие';
                content.appendChild(title);

                const container = document.createElement('div');
                content.appendChild(container);

                // Update side image - MOVED/ENSURED HERE
                if (node.data.imageUrl) {
                    const sideImg = document.getElementById('side-image');
                    const sideCap = document.getElementById('image-caption');
                    if (sideImg) sideImg.src = node.data.imageUrl;
                    if (sideCap) sideCap.innerText = node.data.title || 'Иллюстрация';
                }

                // Render Video (Image removed via modified renderMedia)
                const isLocked = this.renderMedia(node, container);

               const textContent = node.data.description || node.data.question || node.data.text || node.data.feedback || node.data.message;

                if (textContent) {
                    const body = document.createElement('div');
                    body.className = 'node-body';
                    body.innerHTML = this.processText(textContent);
                    container.appendChild(body);
                }

                // Controls area
                const controls = document.createElement('div');
                controls.id = 'node-controls';
                controls.className = 'controls-area';
                if (isLocked) {
                    controls.classList.add('locked-controls');
                     const lockOverlay = document.createElement('div');
                    lockOverlay.className = 'video-lock-overlay';
                    lockOverlay.innerHTML = '<div class="lock-icon">🔒</div><div class="lock-message">Просмотр обязателен</div><div class="lock-message" style="font-size:0.8rem; margin-top:5px;">Нажмите на видео</div>';
                    controls.appendChild(lockOverlay);
                    
                    // Add manual unlock button after duration logic
                    if (node.data.videoDuration) {
                        const manualUnlockDelay = (node.data.videoDuration || 30) * 1000;
                        currentVideoLockState.manualUnlockTimer = setTimeout(() => {
                            if (currentVideoLockState.isLocked && lockOverlay && lockOverlay.parentNode) {
                                const lockMessage = lockOverlay.querySelector('.lock-message');
                                if (lockMessage) lockMessage.innerText = 'Видео просмотрено?';
                                
                                const manualBtn = document.createElement('button');
                                manualBtn.className = 'manual-unlock-btn';
                                manualBtn.innerText = '✓ Я посмотрел';
                                manualBtn.onclick = (ev) => {
                                    ev.stopPropagation();
                                    this.unlockVideoControls();
                                };
                                lockOverlay.appendChild(manualBtn);
                            }
                        }, manualUnlockDelay);
                    }
                }
                container.appendChild(controls);

                // Start Node Timer
                this.handleNodeTimer(node, controls);

                // Render Specific Node Logic
                if (node.type === 'questionNode') {
                    // Logic for single choice with "Answer/Reset" requested previously
                    let selectedId = null;
                    const answers = node.data.answers || [];
                    const answersContainer = document.createElement('div');
                    
                    const actionRow = document.createElement('div');
                    actionRow.style.display = 'none';
                    actionRow.style.gap = '15px';
                    actionRow.style.marginTop = '20px';

                    // Reset Button
                    const resetBtn = document.createElement('button');
                    resetBtn.className = 'action-btn';
                    resetBtn.style.background = '#4a4a4a'; 
                    resetBtn.style.borderColor = '#666';
                    resetBtn.innerHTML = '<span>✕</span> Сбросить';
                    resetBtn.onclick = () => {
                        selectedId = null;
                        const opts = answersContainer.querySelectorAll('.option-btn');
                        opts.forEach(o => o.classList.remove('selected'));
                        actionRow.style.display = 'none';
                    };

                    // Answer Button
                    const answerBtn = document.createElement('button');
                    answerBtn.className = 'action-btn';
                    answerBtn.innerHTML = '<span>✓</span> Ответить';
                    answerBtn.onclick = () => {
                        if(selectedId) {
                            this.playSound('click');
                            this.goToNext(node.id, selectedId);
                        }
                    };

                    actionRow.appendChild(resetBtn);
                    actionRow.appendChild(answerBtn);

                    answers.forEach((ans, idx) => {
                        const btn = document.createElement('button');
                        btn.className = 'option-btn';
                        btn.innerHTML = \`<span class="option-badge">\${String.fromCharCode(65+idx)}</span> \${this.processText(ans.text)}\`;
                        btn.onclick = () => {
                            selectedId = ans.id;
                            const opts = answersContainer.querySelectorAll('.option-btn');
                            opts.forEach(o => o.classList.remove('selected'));
                            btn.classList.add('selected');
                            actionRow.style.display = 'flex';
                            // smooth scroll to bottom
                            setTimeout(() => content.scrollTop = content.scrollHeight, 50);
                        };
                        answersContainer.appendChild(btn);
                    });

                    controls.appendChild(answersContainer);
                    controls.appendChild(actionRow);

                } else if (node.type === 'multipleChoiceNode') {
                     const answers = node.data.answers || [];
                     const selected = new Set();
                     
                     answers.forEach((ans, idx) => {
                        const btn = document.createElement('button');
                        btn.className = 'option-btn';
                        btn.innerHTML = \`<span class="option-badge"></span> \${this.processText(ans.text)}\`;
                        btn.onclick = () => {
                             if(selected.has(ans.id)) {
                                 selected.delete(ans.id);
                                 btn.classList.remove('selected');
                                 btn.querySelector('.option-badge').innerText = '';
                             } else {
                                 selected.add(ans.id);
                                 btn.classList.add('selected');
                                 btn.querySelector('.option-badge').innerText = '✓';
                             }
                        };
                        controls.appendChild(btn);
                     });
                     
                     this.createButton(controls, node.data.buttonText || 'Подтвердить', () => {
                         const correct = node.data.correctOptions || [];
                         const isCorrect = correct.length === selected.size && correct.every(id => selected.has(id));
                         this.goToNext(node.id, isCorrect ? 'correct' : 'incorrect');
                     });

                } else if (node.type === 'matchingNode') {
                     this.state.temp.matching = { left: null, right: null, pairs: [] };
                     const grid = document.createElement('div');
                     grid.className = 'match-grid';
                     
                     // Helper
                     const createItem = (item, side) => {
                         const el = document.createElement('div');
                         const isMatched = this.state.temp.matching.pairs.some(p => (side === 'left' ? p.left : p.right) === item.id);
                         const isSelected = (side === 'left' ? this.state.temp.matching.left : this.state.temp.matching.right) === item.id;
                         el.className = \`match-item \${isMatched ? 'matched' : ''} \${isSelected ? 'selected' : ''}\`;
                         if (item.imageUrl) {
                             const image = document.createElement('img');
                             image.src = item.imageUrl;
                             image.alt = item.text || '';
                             image.style.cssText = 'width:100%;max-height:120px;object-fit:contain;margin-bottom:8px;cursor:zoom-in;';
                             image.onclick = (event) => {
                                 event.stopPropagation();
                                 this.openLightbox(item.imageUrl);
                             };
                             el.appendChild(image);
                         }
                         const label = document.createElement('span');
                         label.innerText = item.text || '';
                         el.appendChild(label);
                         if(!isMatched) el.onclick = () => {
                             this.playSound('click');
                             if(side === 'left') this.state.temp.matching.left = item.id; else this.state.temp.matching.right = item.id;
                             if(this.state.temp.matching.left && this.state.temp.matching.right) {
                                 this.state.temp.matching.pairs.push({left: this.state.temp.matching.left, right: this.state.temp.matching.right});
                                 this.state.temp.matching.left = null; this.state.temp.matching.right = null;
                             }
                             renderMatches();
                         };
                         return el;
                     };

                     const renderMatches = () => {
                         grid.innerHTML = '';
                         const leftCol = document.createElement('div'); leftCol.className = 'match-col';
                         const rightCol = document.createElement('div'); rightCol.className = 'match-col';
                         
                         (node.data.leftColumn||[]).forEach(i => leftCol.appendChild(createItem(i, 'left')));
                         (node.data.rightColumn||[]).forEach(i => rightCol.appendChild(createItem(i, 'right')));
                         
                         // Titles
                         leftCol.insertAdjacentHTML('afterbegin', '<div class="match-col-title">Объекты</div>');
                         rightCol.insertAdjacentHTML('afterbegin', '<div class="match-col-title">Варианты</div>');

                         grid.appendChild(leftCol); grid.appendChild(rightCol);

                         // List Pairs
                         const pairsList = document.createElement('div');
                         pairsList.className = 'match-pairs-list';
                         if(this.state.temp.matching.pairs.length > 0) {
                             this.state.temp.matching.pairs.forEach(p => {
                                 const l = node.data.leftColumn.find(x=>x.id===p.left);
                                 const r = node.data.rightColumn.find(x=>x.id===p.right);
                                 pairsList.innerHTML += \`<div class="match-pair-row"><span>\${l.text}</span> <span class="match-arrow">↔</span> <span>\${r.text}</span></div>\`;
                             });
                         } else {
                             pairsList.innerHTML = '<div style="text-align:center; color:#999; font-style:italic;">Составьте пары</div>';
                         }
                         
                         // Clear existing
                         const oldGrid = controls.querySelector('.match-grid');
                         if(oldGrid) oldGrid.remove();
                         const oldList = controls.querySelector('.match-pairs-list');
                         if(oldList) oldList.remove();
                         const oldBtn = controls.querySelector('.match-btn');
                         if(oldBtn) oldBtn.remove();
                         
                         controls.prepend(pairsList);
                         controls.prepend(grid);
                         
                         // Add Check Button only once
                         const btn = document.createElement('button');
                         btn.className = 'action-btn match-btn';
                         btn.innerHTML = '<span>✓</span> Проверить';
                         btn.onclick = () => {
                             const user = this.state.temp.matching.pairs;
                             const correct = node.data.correctPairs || [];
                             const isOk = user.length === correct.length && correct.every(c => user.some(u => u.left === c.leftId && u.right === c.rightId));
                             
                             this.playSound(isOk ? 'success' : 'error');
                             const handle = isOk ? 'correct' : 'incorrect';
                             const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle) || quizData.edges.find(e => e.source === node.id);
                             if(edge) this.processNode(edge.target);
                         };
                         controls.appendChild(btn);
                     };
                     
                     renderMatches(); // Initial render

                } else if (node.type === 'timelineNode') {
                     if (!this.state.temp.timeline || this.state.temp.timelineNodeId !== node.id) {
                         // Shuffle initial items
                         this.state.temp.timeline = [...(node.data.events || [])].sort(() => Math.random() - 0.5);
                         this.state.temp.timelineNodeId = node.id;
                     }
                     
                     const container = document.createElement('div');
                     container.className = 'timeline-container'; // Reuse matching container style if needed or define new
                     
                     const renderTimeline = () => {
                         container.innerHTML = '';
                         this.state.temp.timeline.forEach((item, i) => {
                             const el = document.createElement('div');
                             el.className = 'timeline-item';
                             el.innerHTML = \`
                                <div class="timeline-controls">
                                    <button onclick="game.moveTimelineItem(\${i}, -1)">▲</button>
                                    <button onclick="game.moveTimelineItem(\${i}, 1)">▼</button>
                                </div>
                                <div class="timeline-content">\${item.text}</div>
                             \`;
                             container.appendChild(el);
                         });
                     };
                     
                     game.moveTimelineItem = (index, delta) => {
                        const list = this.state.temp.timeline;
                        const newIndex = index + delta;
                        if (newIndex >= 0 && newIndex < list.length) {
                            [list[index], list[newIndex]] = [list[newIndex], list[index]];
                            renderTimeline();
                            this.playSound('click');
                        }
                     };
                     
                     renderTimeline();
                     controls.appendChild(container);
                     
                     this.createButton(controls, node.data.buttonText || 'Проверить', () => {
                         const current = this.state.temp.timeline.map(t => t.id);
                         const correct = (node.data.events || []).map(t => t.id);
                         const isOk = JSON.stringify(current) === JSON.stringify(correct);
                         this.playSound(isOk ? 'success' : 'error');
                         const handle = isOk ? 'correct' : 'incorrect';
                         const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle) || quizData.edges.find(e => e.source === node.id);
                         if(edge) this.processNode(edge.target);
                     });

                } else if (node.type === 'textInputNode') {
                     const input = document.createElement('input');
                     input.className = 'history-input';
                     input.placeholder = 'Ваш ответ...';
                     controls.appendChild(input);
                     
                     this.createButton(controls, node.data.buttonText || 'Проверить', () => {
                        const val = input.value.trim().toLowerCase();
                        const key = (node.data.keyword || '').toLowerCase();
                        const isOk = val.includes(key);
                        this.playSound(isOk ? 'success' : 'error');
                        const handle = isOk ? 'correct' : 'incorrect';
                        const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle) || quizData.edges.find(e => e.source === node.id);
                        if(edge) this.processNode(edge.target);
                     });

                } else if (node.type === 'allocatorNode') {
                     const max = node.data.maxTotal || 100;
                     (node.data.items || []).forEach(item => {
                         if (this.state.variables[item.variableName] === undefined) {
                             this.state.variables[item.variableName] = item.defaultValue || 0;
                         }
                         
                         const row = document.createElement('div');
                         row.className = 'alloc-row';
                         row.innerHTML = \`<div class="alloc-label"><span>\${item.label}</span><span id="val-\${item.id}">\${this.state.variables[item.variableName]}</span></div>\`;
                         
                         const slider = document.createElement('input');
                         slider.type = 'range';
                         slider.className = 'history-slider';
                         slider.min = 0;
                         slider.max = max;
                         slider.value = this.state.variables[item.variableName];
                         slider.oninput = (e) => {
                             this.state.variables[item.variableName] = parseInt(e.target.value);
                             document.getElementById(\`val-\${item.id}\`).innerText = e.target.value;
                             this.updateHUD(); // If displayed
                         };
                         row.appendChild(slider);
                         controls.appendChild(row);
                     });
                     
                     this.createButton(controls, node.data.buttonText || 'Распределить', () => {
                         const edge = quizData.edges.find(e => e.source === node.id);
                         if(edge) this.processNode(edge.target);
                     });

                } else if (node.type === 'collectInfoNode') {
                     (node.data.fields || []).forEach(f => {
                         const inp = document.createElement('input');
                         inp.className = 'history-input';
                         inp.placeholder = f.label;
                         inp.value = this.state.variables[f.variableName] || '';
                         inp.onchange = (e) => {
                             this.state.variables[f.variableName] = e.target.value;
                             this.updateHUD();
                         };
                         controls.appendChild(inp);
                     });
                     this.createButton(controls, node.data.buttonText || 'Далее', () => {
                         const edge = quizData.edges.find(e => e.source === node.id);
                         if(edge) this.processNode(edge.target);
                     });

                } else if (node.type === 'resultNode') {
                     if (node.data.showScore) {
                         const score = document.createElement('div');
                         score.className = 'result-score';
                         score.innerText = \`Счет: \${this.state.score}\`;
                         controls.appendChild(score);
                     }
                     // Save results logic should be called here ideally if not done in executeLogic
                     this.saveResults(node.data.title || 'Финиш');
                     
                     this.createButton(controls, 'Заново', () => location.reload(), '↺');

                } else {
                     // Default (Info, Feedback)
                     this.createButton(controls, node.data.buttonText || 'Далее', () => {
                         const edge = quizData.edges.find(e => e.source === node.id);
                         if(edge) this.processNode(edge.target);
                     });
                }
            },

            createButton(parent, text, onClick, icon = '➜', node) {
                const btn = document.createElement('button');
                btn.className = 'action-btn';
                btn.innerHTML = \`<span>\${icon}</span> \${text}\`;
                btn.onclick = () => { 
                    this.playSound('click', node?.data?.soundSettings?.onButtonPress); 
                    onClick(); 
                };
                parent.appendChild(btn);
            }
        };

        window.game = game;
        window.onload = () => game.init();
    </script>
</body>
</html>
`;

export default historyTemplate;
