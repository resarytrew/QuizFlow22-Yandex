
const newyearTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Новогодний Квиз</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" integrity="sha384-1C01FBF57751BC7AFA6B1546878C505950A9D7891C777D9B364E17BB4B070C7B45438DA7E8100CF3292F078EDD1B3E83" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.min.js" integrity="sha384-4373D3C40FD427C0A09AD7647B286C33F34FC104F30FC33302FC105BE048DF37354FC7DD1A278F3FC54DE83E12C657A0" crossorigin="anonymous"></script>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-night: #1e1b4b; /* Dark Indigo */
            --bg-panel: rgba(30, 27, 75, 0.6);
            --glass-border: rgba(255, 255, 255, 0.1);
            --accent-gold: #fbbf24;
            --accent-blue: #38bdf8;
            --text-main: #f8fafc;
            --text-dim: #94a3b8;
        }

        body {
            background: radial-gradient(circle at 50% 0%, #312e81 0%, #1e1b4b 60%, #0f172a 100%);
            color: var(--text-main);
            font-family: 'Rubik', sans-serif;
            margin: 0;
            height: 100vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            user-select: none;
            cursor: default;
            transition: background 2s ease;
        }
        
        /* --- FEATURE: AURORA BOREALIS --- */
        body.aurora-active {
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
            position: relative;
        }
        body.aurora-active::after {
            content: ''; position: absolute; inset: 0; pointer-events: none;
            background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.2), rgba(168, 85, 247, 0.2), transparent);
            filter: blur(60px);
            animation: aurora 10s infinite alternate;
            z-index: -1;
        }
        @keyframes aurora {
            0% { transform: translateX(-20%) skewX(-10deg); opacity: 0.5; }
            100% { transform: translateX(20%) skewX(10deg); opacity: 0.8; }
        }

        /* --- SNOW ANIMATION & PARALLAX --- */
        .snow-container {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 0; overflow: hidden;
            transition: transform 0.1s ease-out;
        }
        .snowflake {
            position: absolute; top: -20px; 
            color: white;
            text-shadow: 0 0 5px rgba(255,255,255,0.8);
            animation: fall linear infinite;
        }
        @keyframes fall {
            to { transform: translateY(105vh) rotate(360deg); }
        }
        
        /* Blizzard Modifier */
        .blizzard .snowflake {
            animation-duration: 2s !important; /* Fast fall */
            animation-timing-function: ease-in;
        }

        /* --- FIREWORKS CANVAS --- */
        #fireworks-canvas {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 60;
        }

        /* --- FROST CANVAS (SCRATCH CARD) --- */
        #frost-canvas {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 20; border-radius: 24px; cursor: crosshair;
            opacity: 1; transition: opacity 1s; pointer-events: none;
        }
        #frost-canvas.active { pointer-events: auto; }
        #frost-canvas.faded { opacity: 0; pointer-events: none; }

        /* --- FEATURE: SNOWBALL CLICK --- */
        .snowball {
            position: fixed; width: 12px; height: 12px; background: white; border-radius: 50%;
            pointer-events: none; z-index: 100;
            box-shadow: 0 0 5px rgba(255,255,255,0.8);
            transition: transform 0.2s ease-in;
        }
        .snow-splat {
            position: fixed; width: 40px; height: 40px; 
            background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%);
            border-radius: 50%; pointer-events: none; z-index: 99;
            transform: scale(0);
            animation: splat 0.5s ease-out forwards;
        }
        @keyframes splat {
            0% { transform: scale(0.2); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.8; }
            100% { transform: scale(1.2); opacity: 0; }
        }

        /* --- SPARKLE CURSOR --- */
        .sparkle {
            position: fixed; pointer-events: none; z-index: 100;
            width: 10px; height: 10px; background: white; border-radius: 50%;
            box-shadow: 0 0 10px gold, 0 0 20px gold;
            animation: fadeOut 1s forwards;
        }
        @keyframes fadeOut {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(0); opacity: 0; }
        }

        /* --- GARLAND HEADER --- */
        .garland-container {
            position: absolute; top: -15px; left: 0; width: 100%; height: 50px;
            display: flex; justify-content: space-around; z-index: 50; 
            pointer-events: none;
        }
        .bulb-wire {
            position: absolute; top: 0; left: 0; width: 100%; height: 2px;
            background: #222; border-bottom: 1px solid rgba(255,255,255,0.2);
            z-index: 49;
            /* Curved wire effect via border-radius is tricky, using simple line for performance */
        }
        .bulb {
            width: 16px; height: 24px; border-radius: 50%;
            position: relative; top: 10px;
            animation: flash 2s infinite alternate;
            z-index: 50;
        }
        .bulb::before {
            content: ''; position: absolute; top: -4px; left: 50%; transform: translateX(-50%);
            width: 6px; height: 6px; background: #333; border-radius: 2px;
        }
        
        .bulb.red { background: #ef4444; box-shadow: 0 5px 20px rgba(239, 68, 68, 0.6); animation-delay: 0s; }
        .bulb.gold { background: #fbbf24; box-shadow: 0 5px 20px rgba(251, 191, 36, 0.6); animation-delay: 0.5s; }
        .bulb.blue { background: #3b82f6; box-shadow: 0 5px 20px rgba(59, 130, 246, 0.6); animation-delay: 1s; }
        .bulb.green { background: #22c55e; box-shadow: 0 5px 20px rgba(34, 197, 94, 0.6); animation-delay: 1.5s; }

        @keyframes flash {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.9); }
        }

        /* --- FLOATING GIFT --- */
        .floating-gift {
            position: fixed; font-size: 30px; cursor: pointer; z-index: 90;
            animation: floatGift 3s ease-in-out infinite;
            filter: drop-shadow(0 0 10px gold);
        }
        @keyframes floatGift {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }

        /* --- LAYOUT --- */
        .app-layout {
            display: grid;
            grid-template-columns: 280px 1fr;
            height: 100%;
            position: relative;
            z-index: 10;
        }

        /* --- SIDEBAR --- */
        .sidebar {
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(15px);
            border-right: 1px solid var(--glass-border);
            padding: 24px;
            display: flex; flex-direction: column; gap: 24px;
            overflow-y: auto;
        }

        .avatar-card {
            background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 20px;
            display: flex; flex-direction: column; align-items: center; text-align: center;
        }
        .avatar-img {
            width: 80px; height: 80px; font-size: 50px;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 20px rgba(255,255,255,0.1);
            margin-bottom: 12px;
            border: 2px solid rgba(255,255,255,0.2);
        }
        .char-name { font-weight: 700; font-size: 1.1rem; color: var(--accent-gold); word-break: break-word;}
        .char-desc { font-size: 0.8rem; color: var(--text-dim); }

        .stats-grid {
            display: grid; gap: 12px;
        }
        .stat-row {
            display: flex; justify-content: space-between; align-items: center;
            background: rgba(0,0,0,0.2); padding: 10px 14px;
            border-radius: 12px; border: 1px solid var(--glass-border);
        }
        .stat-icon { font-size: 1.2rem; margin-right: 8px; }
        .stat-label { font-size: 0.85rem; color: var(--text-dim); font-weight: 600; flex: 1; }
        .stat-value { font-weight: 700; color: var(--text-main); }
        
        .progress-bar {
            width: 60px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;
        }
        .progress-fill { height: 100%; background: var(--accent-gold); width: 50%; transition: width 0.3s; }

        /* ARTIFACTS GRID UPDATED */
        .artifacts-grid {
            display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
        }
        .artifact-slot {
            aspect-ratio: 1; background: rgba(0,0,0,0.3); border-radius: 8px;
            border: 1px solid var(--glass-border);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            opacity: 0.3; transition: all 0.3s; filter: grayscale(100%);
            padding: 4px; position: relative;
        }
        .artifact-slot.unlocked { 
            opacity: 1; 
            background: rgba(251, 191, 36, 0.1); 
            border-color: var(--accent-gold); 
            box-shadow: 0 0 10px rgba(251,191,36,0.2);
            filter: grayscale(0%);
        }
        .art-icon { font-size: 1.4rem; line-height: 1; }
        
        /* Tooltip style for artifacts */
        .artifact-slot:hover::after {
            content: attr(title);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.7rem;
            white-space: nowrap;
            z-index: 10;
            pointer-events: none;
            margin-bottom: 5px;
            border: 1px solid rgba(255,255,255,0.2);
        }

        .quest-progress {
            display: flex; flex-direction: column; gap: 8px;
        }
        .quest-step {
            display: flex; align-items: center; gap: 10px;
            font-size: 0.85rem; color: var(--text-dim);
            padding: 8px; border-radius: 8px;
            transition: all 0.2s;
        }
        .quest-step.active { background: rgba(255,255,255,0.05); color: white; border-left: 3px solid var(--accent-gold); }
        .step-num { 
            width: 20px; height: 20px; background: rgba(255,255,255,0.1); 
            border-radius: 50%; font-size: 0.7rem; display: flex; align-items: center; justify-content: center;
            font-weight: bold;
        }
        .quest-step.done .step-num { background: var(--accent-blue); color: black; }
        .quest-step.done { color: rgba(255,255,255,0.5); text-decoration: line-through; }

        .advice-box {
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(30, 58, 138, 0.2));
            border: 1px solid rgba(56, 189, 248, 0.3);
            border-radius: 16px; padding: 16px; margin-top: auto;
        }
        .advice-header { font-size: 0.75rem; color: var(--accent-blue); text-transform: uppercase; font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
        .advice-text { font-size: 0.85rem; font-style: italic; line-height: 1.4; color: #e2e8f0; }

        /* --- MAIN AREA --- */
        .main-area {
            position: relative;
            padding: 40px;
            /* FIX: changed from justify-content: center to flex-start + padding-top for better scrolling with large content */
            padding-top: 100px; 
            padding-bottom: 60px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            align-items: center; 
            justify-content: flex-start;
        }

        .header-bar {
            position: absolute; top: 0; left: 0; width: 100%;
            display: flex; justify-content: space-between; align-items: center;
            padding: 20px 40px;
        }
        .quiz-meta { display: flex; align-items: center; gap: 30px; font-weight: 600; font-size: 0.9rem; }
        .meta-item { display: flex; align-items: center; gap: 8px; }

        .content-card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px;
            padding: 40px;
            width: 100%; max-width: 800px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
            animation: floatIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
            position: relative;
            margin: auto; /* Vertically centers if space allows, scrolls if not */
        }
        @keyframes floatIn {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* --- TYPOGRAPHY IN CARD --- */
        h1.node-title {
            font-family: 'Nunito', sans-serif;
            font-size: 2.2rem; font-weight: 800;
            margin-bottom: 20px;
            background: linear-gradient(to right, #fff, #cbd5e1);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .node-desc {
            font-size: 1.1rem; line-height: 1.6; color: #cbd5e1; margin-bottom: 32px;
        }
        
        /* FEEDBACK SPECIFIC STYLE */
        .feedback-bubble {
            background: rgba(56, 189, 248, 0.15);
            border-left: 4px solid var(--accent-blue);
            padding: 20px;
            border-radius: 0 12px 12px 0;
            margin-bottom: 24px;
            font-size: 1.1rem;
            color: #fff;
            position: relative;
        }
        .feedback-bubble::before {
            content: '✉️';
            position: absolute; left: -14px; top: -14px;
            font-size: 24px;
        }
        
        .md-content b, .md-content strong { color: var(--accent-gold); }

        /* --- BUTTONS --- */
        .ny-btn {
            width: 100%; text-align: left;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 16px 24px; border-radius: 16px;
            color: white; font-weight: 600; font-size: 1.05rem;
            transition: all 0.2s; cursor: pointer;
            display: flex; align-items: center; gap: 16px;
            margin-bottom: 12px;
            position: relative; overflow: hidden;
        }
        .ny-btn:hover {
            background: rgba(255,255,255,0.15);
            border-color: rgba(255,255,255,0.4);
            transform: translateX(5px);
            box-shadow: 0 0 15px rgba(255,255,255,0.1);
        }
        /* Frost effect on hover */
        .ny-btn::before {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            transform: translateX(-100%); transition: transform 0.5s;
        }
        .ny-btn:hover::before { transform: translateX(100%); }

        .ny-btn.selected {
            background: rgba(56, 189, 248, 0.2);
            border-color: var(--accent-blue);
            box-shadow: inset 0 0 10px rgba(56, 189, 248, 0.3);
        }
        
        .ny-btn.primary {
            text-align: center; justify-content: center;
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            border: none; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
        }
        .ny-btn.primary:hover {
            background: linear-gradient(135deg, #4338ca, #6d28d9);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5);
        }
        
        /* --- INTERACTIVE --- */
        .ny-input {
            width: 100%; background: rgba(0,0,0,0.3);
            border: 2px solid rgba(255,255,255,0.1);
            padding: 16px; border-radius: 12px;
            color: white; font-size: 1.2rem;
            outline: none; transition: all 0.3s;
        }
        .ny-input:focus { border-color: var(--accent-blue); background: rgba(0,0,0,0.5); }

        /* --- SLIDERS (ALLOCATOR) --- */
        .ny-slider-container { margin-bottom: 20px; }
        .ny-slider-label { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 600; color: var(--accent-blue); }
        .ny-slider {
            -webkit-appearance: none; width: 100%; height: 8px;
            background: rgba(255,255,255,0.1); border-radius: 4px; outline: none;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .ny-slider::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none;
            width: 24px; height: 24px; background: #fff;
            border: 2px solid var(--accent-blue); border-radius: 50%;
            cursor: pointer; box-shadow: 0 0 10px var(--accent-blue);
            transition: transform 0.2s;
        }
        .ny-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }

        /* --- CHECKBOX CUSTOM --- */
        .ny-check {
            width: 24px; height: 24px; border: 2px solid var(--text-dim);
            border-radius: 6px; display: flex; align-items: center; justify-content: center;
            transition: all 0.2s;
        }
        .ny-btn.selected .ny-check { background: var(--accent-blue); border-color: var(--accent-blue); color: white; }

        /* --- MATCHING --- */
        .match-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .match-item {
            padding: 15px; background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px; cursor: pointer; text-align: center;
            transition: all 0.2s;
        }
        .match-item.selected { border-color: var(--accent-gold); background: rgba(251, 191, 36, 0.1); }
        .match-item.matched { opacity: 0.5; border-color: var(--accent-blue); }

        /* --- TIMELINE --- */
        .timeline-item {
            background: rgba(255,255,255,0.05); padding: 12px;
            border-radius: 12px; margin-bottom: 8px; display: flex; gap: 10px; align-items: center;
        }
        .t-btn { cursor: pointer; color: var(--accent-gold); opacity: 0.7; }
        .t-btn:hover { opacity: 1; transform: scale(1.2); }

        /* --- RESULT --- */
        .result-trophy { font-size: 60px; margin-bottom: 20px; display: inline-block; animation: bounce 2s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        
        /* --- GIFT UNBOXING --- */
        #gift-modal {
            position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000;
            display: none; align-items: center; justify-content: center;
        }
        .gift-box {
            width: 150px; height: 150px; background: linear-gradient(135deg, #ef4444, #b91c1c);
            border-radius: 16px; position: relative; cursor: pointer;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            animation: shake 2s infinite;
        }
        .gift-lid {
            position: absolute; top: -20px; left: -10px; right: -10px; height: 40px;
            background: #ef4444; border-radius: 8px; border-bottom: 4px solid #991b1b;
        }
        .gift-ribbon {
            position: absolute; top: 0; bottom: 0; left: 50%; width: 20px;
            transform: translateX(-50%); background: #fbbf24;
        }
        .gift-ribbon-h {
            position: absolute; top: 50%; left: 0; right: 0; height: 20px;
            transform: translateY(-50%); background: #fbbf24;
        }
        .gift-content {
            display: none; text-align: center; color: white; animation: popIn 0.5s ease-out;
        }
        @keyframes shake {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(2deg); }
            75% { transform: rotate(-2deg); }
        }
        @keyframes popIn {
            0% { transform: scale(0); opacity: 0; }
            80% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); }
        }
        
        /* --- VARIABLES LIST --- */
        .var-list-item {
            display: flex; justify-content: space-between;
            font-size: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.1);
            padding: 4px 0; color: var(--text-dim);
        }

        /* --- SOUNDBOARD & BLIZZARD UI --- */
        .sound-board {
            position: fixed; bottom: 20px; right: 20px; display: flex; gap: 10px; z-index: 100;
        }
        .tool-btn {
            width: 48px; height: 48px; background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 20px; cursor: pointer; transition: all 0.2s;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .tool-btn:hover { transform: scale(1.1); background: rgba(255,255,255,0.2); }
        .tool-btn:active { transform: scale(0.9); }
        
        .blizzard-active .tool-btn.blizzard-toggle {
            background: var(--accent-blue); color: black; box-shadow: 0 0 15px var(--accent-blue);
        }
        
        /* Wish Modal */
        #wish-modal {
            position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1001;
            display: none; align-items: center; justify-content: center;
        }

        /* Lightbox - UPDATED STYLE */
        #lightbox { 
            position: fixed; inset: 0; background: rgba(10, 10, 20, 0.9); 
            backdrop-filter: blur(8px);
            z-index: 9999; display: none; align-items: center; justify-content: center; 
            opacity: 0; transition: opacity 0.3s;
        }
        #lightbox.open { display: flex; opacity: 1; }
        #lightbox img { 
            max-width: 90vw; max-height: 90vh; 
            border-radius: 16px; 
            box-shadow: 0 20px 50px rgba(0,0,0,0.5); 
            border: 1px solid rgba(255,255,255,0.1);
            transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #lightbox.open img { transform: scale(1); }

        /* --- NEW IMAGE STYLES --- */
        .node-image-wrapper {
            position: relative;
            border-radius: 16px;
            overflow: hidden;
            border: 2px solid rgba(255,255,255,0.1);
            cursor: zoom-in;
            transition: all 0.3s ease;
            background: rgba(0,0,0,0.2);
        }
        .node-image-wrapper:hover {
            border-color: var(--accent-blue);
            box-shadow: 0 0 25px rgba(56, 189, 248, 0.3);
            transform: scale(1.02);
        }
        .zoom-hint {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid var(--accent-blue);
            color: var(--accent-blue);
            width: 48px; height: 48px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
            backdrop-filter: blur(4px);
        }
        .node-image-wrapper:hover .zoom-hint {
            opacity: 1; transform: translate(-50%, -50%) scale(1);
        }

        @media (max-width: 900px) {
            .app-layout { grid-template-columns: 1fr; }
            .sidebar { display: none; } /* Hide sidebar on mobile for now */
            .header-bar { position: relative; padding: 20px; flex-direction: column; gap: 10px; align-items: flex-start; }
            .sound-board { bottom: 10px; right: 10px; }
        }
    </style>
</head>
<body>
    <canvas id="fireworks-canvas"></canvas>
    <canvas id="frost-canvas"></canvas> <!-- Frost Effect -->
    <div class="snow-container" id="snow-container"></div>
    
    <div class="garland-container" id="garland">
        <!-- Lights generated by JS -->
    </div>
    
    <div class="sound-board">
        <button class="tool-btn" onclick="game.playFestiveSound('jingle')" title="Джингл">🔔</button>
        <button class="tool-btn" onclick="game.playFestiveSound('hoho')" title="Хо-хо-хо">🎅</button>
        <button class="tool-btn blizzard-toggle" onclick="game.toggleBlizzard()" title="Режим Вьюги">🌪️</button>
        <button class="tool-btn" onclick="document.getElementById('wish-modal').style.display='flex'" title="Загадать желание">🌟</button>
    </div>

    <div class="app-layout">
        <!-- SIDEBAR -->
        <aside class="sidebar custom-scrollbar">
            <div class="avatar-card">
                <div class="avatar-img">⛄</div>
                <div class="char-name" id="char-name">Снеговик Борис</div>
                <div class="char-desc">Готов к приключениям!</div>
            </div>

            <div class="stats-grid">
                <div class="stat-row">
                    <span class="stat-icon">🌟</span>
                    <span class="stat-label">Счет</span>
                    <div class="flex items-center gap-2">
                        <span class="stat-value" id="score-val">0</span>
                         <div class="progress-bar"><div class="progress-fill" id="score-bar" style="width: 0%; background: var(--accent-gold);"></div></div>
                    </div>
                </div>
                <div class="stat-row">
                    <span class="stat-icon">⏰</span>
                    <span class="stat-label">Время</span>
                    <span class="stat-value text-blue-300" id="time-val">--:--</span>
                </div>
                 <div class="stat-row">
                    <span class="stat-icon">🙂</span>
                    <span class="stat-label">Настроение</span>
                    <span class="stat-value text-yellow-300">Боевое!</span>
                </div>
            </div>
            
            <!-- Extra Variables -->
            <div id="extra-vars-container" class="hidden">
                 <h4 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Состояние</h4>
                 <div id="extra-vars-list" class="bg-black/20 rounded-lg p-3"></div>
            </div>

            <div>
                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Инвентарь</h4>
                <div class="artifacts-grid" id="artifacts-grid">
                    <!-- Populated by JS -->
                </div>
            </div>

            <div>
                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Прогресс квеста</h4>
                <div class="quest-progress" id="quest-list">
                    <!-- JS populated -->
                </div>
            </div>

            <div class="advice-box">
                <div class="advice-header">
                    <span>💡 Совет от Бориса</span>
                </div>
                <div class="advice-text">
                    "Если не знаешь, что делать — делай с уверенным видом!"
                </div>
            </div>
        </aside>

        <!-- MAIN CONTENT -->
        <main class="main-area" id="main-area">
            <div class="header-bar">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl shadow-lg">🎈</div>
                    <div>
                        <div class="text-xs text-gray-400 uppercase tracking-wider">Текущий квест</div>
                        <div class="font-bold text-yellow-400" id="current-stage-title">Начало пути</div>
                    </div>
                </div>
                
                <div class="quiz-meta hidden md:flex">
                    <div class="meta-item">
                        <span class="text-green-400">🌟 Счет</span>
                        <div class="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div class="h-full bg-green-500" id="top-score-bar" style="width: 0%"></div>
                        </div>
                        <span id="top-score-val">0</span>
                    </div>
                    <div class="meta-item">
                        <span class="text-pink-400">⏰ Осталось</span>
                        <span class="text-white" id="top-time-val">--:--</span>
                    </div>
                </div>
                
                <div class="flex items-center gap-2 text-xs text-gray-500 md:hidden">
                    Рюкзак полон чудес...
                </div>
            </div>

            <div id="quiz-view" class="content-card">
                <!-- DYNAMIC CONTENT -->
                <h1 class="node-title">Загрузка...</h1>
            </div>
        </main>
    </div>

    <!-- Modals -->
    <div id="lightbox"><img id="lightbox-img"></div>
    
    <div id="gift-modal">
        <div id="gift-box-anim" class="gift-box" onclick="game.openGift()">
            <div class="gift-lid"></div>
            <div class="gift-ribbon"></div>
            <div class="gift-ribbon-h"></div>
        </div>
        <div id="gift-content" class="gift-content">
            <div class="text-4xl mb-4">🏆</div>
            <h3 class="text-2xl font-bold mb-2">Достижение!</h3>
            <p id="gift-text" class="mb-6 text-lg">Вы открыли новый секрет!</p>
            <button class="ny-btn primary" onclick="document.getElementById('gift-modal').style.display='none'">Ура!</button>
        </div>
    </div>
    
    <!-- Wish Modal -->
    <div id="wish-modal">
        <div class="bg-indigo-900 border-2 border-indigo-500 p-8 rounded-2xl max-w-md w-full text-center relative shadow-2xl">
            <button onclick="document.getElementById('wish-modal').style.display='none'" class="absolute top-2 right-2 text-indigo-300 hover:text-white text-2xl">&times;</button>
            <h3 class="text-2xl font-bold text-white mb-4">Загадай желание</h3>
            <p class="text-indigo-200 mb-4 text-sm">Напиши свою мечту, и мы отправим её Деду Морозу!</p>
            <input type="text" id="wish-input" class="ny-input mb-4" placeholder="Моя мечта..." />
            <button class="ny-btn primary" onclick="game.sendWish()">Отправить ✨</button>
        </div>
    </div>

    <audio id="bg-music" loop></audio>

    <script>
        const quizData = %%QUIZ_DATA_INJECTION%%;

        const sfx = {
            click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
            success: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
            error: new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'),
            jingle: new Audio('https://assets.mixkit.co/active_storage/sfx/2043/2043-preview.mp3'),
            hoho: new Audio('https://assets.mixkit.co/active_storage/sfx/2044/2044-preview.mp3'),
            snowball: new Audio('https://assets.mixkit.co/active_storage/sfx/2413/2413-preview.mp3'),
            magic: new Audio('https://assets.mixkit.co/active_storage/sfx/241/241-preview.mp3')
        };
        const bgMusic = document.getElementById('bg-music');
        let musicStarted = false;
        
        // Defined Artifacts
        const ARTIFACTS_DEF = [
            { id: 'tablecloth', icon: '🗺️', name: 'Скатерть' },
            { id: 'candy', icon: '🍬', name: 'Петушок' },
            { id: 'bell', icon: '🔔', name: 'Колокольчик' },
            { id: 'kokoshnik', icon: '👑', name: 'Кокошник' },
            { id: 'invis_hat', icon: '🎩', name: 'Невидимка' },
            { id: 'samovar', icon: '🫖', name: 'Самовар' },
            { id: 'magic_map', icon: '🗺️', name: 'Магическая Карта' },
            { id: 'scarf', icon: '🧣', name: 'Шарф' },
            { id: 'key', icon: '🗝️', name: 'Ключик' },
            { id: 'yarn', icon: '🧶', name: 'Клубок' },
            { id: 'boots', icon: '🥾', name: 'Валенки' },
            { id: 'staff', icon: '❄️', name: 'Посох' },
            { id: 'gusli', icon: '🪕', name: 'Гусли' },
            { id: 'feather', icon: '🪶', name: 'Перо' },
            { id: 'olivier', icon: '🥣', name: 'Оливье' },
            { id: 'egg', icon: '🥚', name: 'Яичко' },
            { id: 'broom', icon: '🧹', name: 'Помело' },
            { id: 'live_water', icon: '🍼', name: 'Живая вода' },
            { id: 'dead_water', icon: '🧪', name: 'Мертвая вода' },
            { id: 'accordion', icon: '🪗', name: 'Гармошка' }
        ];

        // --- PARTICLE EFFECTS ---
        class Sparkle {
            constructor(x, y) {
                this.el = document.createElement('div');
                this.el.className = 'sparkle';
                this.el.style.left = (x - 5) + 'px';
                this.el.style.top = (y - 5) + 'px';
                document.body.appendChild(this.el);
                setTimeout(() => this.el.remove(), 1000);
            }
        }
        
        // --- FIREWORKS ---
        class Firework {
            constructor(canvas) {
                this.canvas = canvas;
                this.ctx = canvas.getContext('2d');
                this.particles = [];
                this.resize();
                window.addEventListener('resize', () => this.resize());
            }
            resize() {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }
            createExplosion(x, y, color) {
                for(let i=0; i<50; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 5 + 2;
                    this.particles.push({
                        x: x, y: y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        color: color,
                        alpha: 1,
                        decay: Math.random() * 0.02 + 0.01
                    });
                }
            }
            animate() {
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.globalCompositeOperation = 'lighter';
                
                for(let i=this.particles.length-1; i>=0; i--) {
                    const p = this.particles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.05; // Gravity
                    p.alpha -= p.decay;
                    
                    if(p.alpha <= 0) {
                        this.particles.splice(i, 1);
                    } else {
                        this.ctx.beginPath();
                        this.ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
                        this.ctx.fillStyle = \`rgba(\${p.color}, \${p.alpha})\`;
                        this.ctx.fill();
                    }
                }
                
                if(Math.random() < 0.05 && this.active) {
                    this.createExplosion(
                        Math.random() * this.canvas.width, 
                        Math.random() * this.canvas.height * 0.7, 
                        \`\${Math.floor(Math.random()*255)},\${Math.floor(Math.random()*255)},\${Math.floor(Math.random()*255)}\`
                    );
                }
                
                if(this.active || this.particles.length > 0) requestAnimationFrame(() => this.animate());
            }
            start() { this.active = true; this.animate(); }
            stop() { this.active = false; }
        }

        const game = {
            state: { currentNodeId: null, score: 0, variables: {}, visitedNodes: [], temp: {}, timeLeft: 0, nodeTimer: null },
            nodes: new Map(), // Initialize map to store nodes for quick access
            timerInterval: null,
            fireworks: null,
            frostCanvas: null,
            
            init() {
                const lightbox = document.getElementById('lightbox');
                const lightboxImage = document.getElementById('lightbox-img');
                lightbox.addEventListener('click', () => this.closeLightbox());
                lightboxImage.addEventListener('click', (event) => event.stopPropagation());

                // Populate nodes map from quizData
                if (quizData && quizData.nodes) {
                    quizData.nodes.forEach(n => this.nodes.set(n.id, n));
                }
                
                // Initialize Grid
                const grid = document.getElementById('artifacts-grid');
                grid.innerHTML = '';
                ARTIFACTS_DEF.forEach(item => {
                    const div = document.createElement('div');
                    div.id = 'art-' + item.id;
                    div.className = 'artifact-slot';
                    div.title = item.name;
                    div.innerHTML = \`<div class="art-icon">\${item.icon}</div>\`;
                    grid.appendChild(div);
                });

                // Interactive Cursor & Snowball Interaction
                document.addEventListener('mousemove', (e) => {
                    if(Math.random() > 0.8) new Sparkle(e.clientX, e.clientY);
                    const snow = document.getElementById('snow-container');
                    const moveX = (e.clientX - window.innerWidth/2) * 0.02;
                    snow.style.transform = \`translateX(\${moveX}px)\`;
                });
                
                document.addEventListener('mousedown', (e) => {
                    if(e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && !e.target.closest('.content-card')) {
                         this.throwSnowball(e.clientX, e.clientY);
                    }
                });

                // Start Music on Click
                document.addEventListener('click', () => {
                    if(!musicStarted && quizData.designSettings?.sound?.backgroundMusic) {
                        bgMusic.src = quizData.designSettings.sound.backgroundMusic;
                        bgMusic.volume = (quizData.designSettings.sound.volume || 0.5) * 0.5;
                        bgMusic.play().catch(()=>{});
                        musicStarted = true;
                    }
                }, { once: true });
                
                // Fireworks
                this.fireworks = new Firework(document.getElementById('fireworks-canvas'));

                // Generate snow
                const snowContainer = document.getElementById('snow-container');
                for(let i=0; i<50; i++) {
                    const flake = document.createElement('div');
                    flake.className = 'snowflake';
                    flake.style.left = Math.random() * 100 + 'vw';
                    flake.style.animationDuration = Math.random() * 5 + 5 + 's';
                    flake.style.opacity = Math.random();
                    flake.style.fontSize = Math.random() * 15 + 10 + 'px';
                    flake.innerText = '❄';
                    snowContainer.appendChild(flake);
                }
                
                // Generate garland
                const garland = document.getElementById('garland');
                for(let i=0; i<30; i++) {
                    const bulb = document.createElement('div');
                    bulb.className = 'bulb';
                    const colors = ['red', 'gold', 'blue', 'green'];
                    bulb.classList.add(colors[Math.floor(Math.random() * colors.length)]);
                    // Random delay for blinking
                    bulb.style.animationDelay = (Math.random() * 2) + 's';
                    
                    bulb.onclick = (e) => {
                        e.target.classList.toggle('off');
                        sfx.click.play();
                    };
                    garland.appendChild(bulb);
                }
                
                // Feature: Gift Hunt
                this.startGiftHunt();
                
                // Init Frost Effect
                this.initFrost();

                if(quizData.currentQuizName) document.title = quizData.currentQuizName;
                
                // Custom Background Logic
                if (quizData.designSettings?.background?.imageUrl) {
                    document.body.style.background = \`url('\${quizData.designSettings.background.imageUrl}')\`;
                    document.body.style.backgroundSize = 'cover';
                    document.body.style.backgroundPosition = 'center';
                    document.body.style.backgroundAttachment = 'fixed';
                }
                
                // Default vars
                ARTIFACTS_DEF.forEach(a => {
                    this.state.variables['inv_' + a.id] = 0;
                });
                
                // Removed explicit 'playerName' init to fix collectInfoNode pre-fill issue

                // Setup Timer
                if (quizData.globalTimer && quizData.globalTimer.enabled) {
                    this.state.timeLeft = quizData.globalTimer.duration;
                    this.timerInterval = setInterval(() => {
                        this.state.timeLeft--;
                        this.updateHUD();
                        if (this.state.timeLeft <= 0) {
                            clearInterval(this.timerInterval);
                            if (quizData.globalTimer.onTimeoutNodeId) {
                                this.processNode(quizData.globalTimer.onTimeoutNodeId);
                            } else {
                                alert("Время вышло!");
                            }
                        }
                    }, 1000);
                } else {
                    this.state.timeLeft = -1; // Infinite
                }

                // Build Quest List based on Groups
                this.renderQuestList();
                this.updateHUD();

                if (quizData.startNodeId && !this.nodes.get(quizData.startNodeId)?.type.includes('startNode')) {
                     // PREVIEW FROM SPECIFIC NODE
                     this.processNode(quizData.startNodeId);
                } else {
                     const startNode = quizData.nodes.find(n => n.type === 'startNode') || quizData.nodes[0];
                     if(startNode) this.processNode(startNode.id);
                }
            },
            
            throwSnowball(x, y) {
                const ball = document.createElement('div');
                ball.className = 'snowball';
                // Start from bottom center
                ball.style.left = (window.innerWidth / 2) + 'px';
                ball.style.top = window.innerHeight + 'px';
                document.body.appendChild(ball);
                
                // Animate throw
                setTimeout(() => {
                    ball.style.left = x + 'px';
                    ball.style.top = y + 'px';
                }, 10);

                setTimeout(() => {
                    ball.remove();
                    const splat = document.createElement('div');
                    splat.className = 'snow-splat';
                    splat.style.left = (x - 20) + 'px';
                    splat.style.top = (y - 20) + 'px';
                    document.body.appendChild(splat);
                    sfx.snowball.currentTime = 0;
                    sfx.snowball.play().catch(()=>{});
                    setTimeout(() => splat.remove(), 500);
                }, 200);
            },
            
            startGiftHunt() {
                setInterval(() => {
                    if (Math.random() > 0.7) return; // 30% chance per interval
                    
                    const gift = document.createElement('div');
                    gift.className = 'floating-gift';
                    gift.innerText = ['🎁', '🍬', '🧸'][Math.floor(Math.random()*3)];
                    gift.style.left = Math.random() * 90 + 'vw';
                    gift.style.top = Math.random() * 80 + 'vh';
                    
                    gift.onclick = (e) => {
                        e.stopPropagation();
                        sfx.magic.play();
                        this.state.score += 5;
                        this.updateHUD();
                        gift.remove();
                        // Confetti burst
                        confetti({ particleCount: 30, spread: 50, origin: { x: e.clientX/window.innerWidth, y: e.clientY/window.innerHeight } });
                    };
                    
                    document.body.appendChild(gift);
                    setTimeout(() => gift.remove(), 4000);
                }, 10000);
            },
            
            sendWish() {
                const wish = document.getElementById('wish-input').value;
                if (!wish.trim()) return;
                
                document.getElementById('wish-modal').style.display = 'none';
                
                // Visual effect
                const star = document.createElement('div');
                star.className = 'sparkle';
                star.style.width = '20px'; star.style.height = '20px';
                star.style.left = '50%'; star.style.top = '50%';
                star.style.boxShadow = '0 0 20px gold';
                star.style.transition = 'all 2s ease-out';
                document.body.appendChild(star);
                
                setTimeout(() => {
                    star.style.top = '-100px';
                    star.style.opacity = '0';
                }, 100);
                
                sfx.magic.play();
                setTimeout(() => star.remove(), 2000);
            },
            
            showGift(text) {
                 const modal = document.getElementById('gift-modal');
                 const box = document.getElementById('gift-box-anim');
                 const content = document.getElementById('gift-content');
                 const desc = document.getElementById('gift-text');
                 
                 desc.innerText = text;
                 modal.style.display = 'flex';
                 box.style.display = 'block';
                 content.style.display = 'none';
                 sfx.jingle.play();
            },
            
            openGift() {
                 document.getElementById('gift-box-anim').style.display = 'none';
                 document.getElementById('gift-content').style.display = 'block';
                 confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                 sfx.success.play();
            },
            
            initFrost() {
                const c = document.getElementById('frost-canvas');
                this.frostCanvas = c;
                const ctx = c.getContext('2d');
                
                const resetFrost = () => {
                    c.width = document.querySelector('.content-card').offsetWidth;
                    c.height = document.querySelector('.content-card').offsetHeight;
                    // Position overlay correctly
                    const card = document.querySelector('.content-card');
                    const rect = card.getBoundingClientRect();
                    c.style.top = '0px';
                    c.style.left = '0px';
                    
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.fillRect(0, 0, c.width, c.height);
                    
                    // Add some noise
                    for(let i=0; i<1000; i++) {
                        ctx.fillStyle = \`rgba(200, 230, 255, \${Math.random() * 0.5})\`;
                        ctx.beginPath();
                        ctx.arc(Math.random()*c.width, Math.random()*c.height, Math.random()*2, 0, Math.PI*2);
                        ctx.fill();
                    }
                    
                    ctx.font = '24px Rubik';
                    ctx.fillStyle = 'rgba(30, 58, 138, 0.5)';
                    ctx.textAlign = 'center';
                    ctx.fillText("Потрите экран, чтобы убрать иней!", c.width/2, c.height/2);
                    
                    c.classList.remove('faded');
                    c.classList.add('active');
                };

                // Attach scratching logic
                let isDrawing = false;
                
                const scratch = (e) => {
                    if (!isDrawing) return;
                    const rect = c.getBoundingClientRect();
                    const x = (e.clientX || e.touches[0].clientX) - rect.left;
                    const y = (e.clientY || e.touches[0].clientY) - rect.top;
                    
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.beginPath();
                    ctx.arc(x, y, 40, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Simple check if mostly cleared (random check optimization)
                    if (Math.random() > 0.9) {
                        const data = ctx.getImageData(0, 0, c.width, c.height).data;
                        let alpha = 0;
                        for(let i=3; i<data.length; i+=400) alpha += data[i]; // sample
                        if (alpha < (data.length / 400) * 100) { // arbitrary threshold
                             c.classList.add('faded');
                             c.classList.remove('active');
                             // Play glass chime
                             this.playSound('success');
                        }
                    }
                };

                c.addEventListener('mousedown', () => isDrawing = true);
                c.addEventListener('touchstart', () => isDrawing = true);
                window.addEventListener('mouseup', () => isDrawing = false);
                window.addEventListener('touchend', () => isDrawing = false);
                c.addEventListener('mousemove', scratch);
                c.addEventListener('touchmove', scratch);
                
                // Expose to game for reset on new node
                this.resetFrost = resetFrost;
            },
            
            toggleBlizzard() {
                 document.body.classList.toggle('blizzard');
                 const btn = document.querySelector('.blizzard-toggle');
                 btn.classList.toggle('active');
            },
            
            playFestiveSound(key) {
                if (sfx[key]) {
                    sfx[key].currentTime = 0;
                    sfx[key].volume = 0.6;
                    sfx[key].play().catch(()=>{});
                }
            },
            
            formatTime(seconds) {
                if (seconds < 0) return '∞';
                const m = Math.floor(seconds / 60);
                const s = seconds % 60;
                return \`\${m}:\${s.toString().padStart(2, '0')}\`;
            },
            
            playSound(key) {
                if(sfx[key]) { sfx[key].currentTime = 0; sfx[key].play().catch(()=>{}); }
            },
            
            // Lightbox functions
            openLightbox(src) {
                 const img = document.getElementById('lightbox-img');
                 img.src = src;
                 document.getElementById('lightbox').classList.add('open');
            },
            closeLightbox() {
                 document.getElementById('lightbox').classList.remove('open');
            },

            processText(text) {
                if (!text) return '';
                let t = text.replace(/{{(.*?)}}/g, (m, k) => this.state.variables[k.trim()] !== undefined ? this.state.variables[k.trim()] : m);
                t = t.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
                t = t.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
                t = t.replace(/\\n/g, '<br>');
                return t;
            },

            updateHUD() {
                const score = this.state.score || 0;
                const playerName = this.state.variables['playerName'] || 'Снеговик Борис'; // Default display only
                const timeStr = this.formatTime(this.state.timeLeft);
                
                // Aurora Logic: Higher score = Aurora Active
                if (score > 10) document.body.classList.add('aurora-active');
                else document.body.classList.remove('aurora-active');

                const scoreVal = document.getElementById('score-val');
                if (scoreVal) scoreVal.innerText = score;
                
                const scoreBar = document.getElementById('score-bar');
                if (scoreBar) scoreBar.style.width = Math.min(score, 100) + '%';
                
                const timeVal = document.getElementById('time-val');
                if (timeVal) timeVal.innerText = timeStr;
                
                const topScoreVal = document.getElementById('top-score-val');
                if (topScoreVal) topScoreVal.innerText = score;
                
                const topScoreBar = document.getElementById('top-score-bar');
                if (topScoreBar) topScoreBar.style.width = Math.min(score, 100) + '%';
                
                const topTimeVal = document.getElementById('top-time-val');
                if (topTimeVal) topTimeVal.innerText = timeStr;
                
                const charName = document.getElementById('char-name');
                if (charName) charName.innerText = playerName;
                
                // Artifacts Logic
                ARTIFACTS_DEF.forEach(a => {
                    const slot = document.getElementById('art-'+a.id);
                    if (!slot) return;
                    const val = this.state.variables['inv_' + a.id];
                    if(val && val > 0) slot.classList.add('unlocked');
                    else slot.classList.remove('unlocked');
                });
                
                // Render Other Variables
                const varList = document.getElementById('extra-vars-list');
                const varContainer = document.getElementById('extra-vars-container');
                if (varList && varContainer) {
                    varList.innerHTML = '';
                    let hasVars = false;
                    Object.entries(this.state.variables).forEach(([k, v]) => {
                         const isArtifact = ARTIFACTS_DEF.some(a => 'inv_' + a.id === k);
                         if (!['playerName', 'score'].includes(k) && !isArtifact) {
                             hasVars = true;
                             varList.innerHTML += \`<div class="var-list-item"><span>\${k}</span><span class="text-white font-bold">\${v}</span></div>\`;
                         }
                    });
                    if (hasVars) varContainer.classList.remove('hidden'); else varContainer.classList.add('hidden');
                }
            },
            
            renderQuestList() {
                const groups = quizData.nodes
                    .filter(n => n.type === 'groupNode')
                    .sort((a, b) => a.position.y - b.position.y);
                
                const list = document.getElementById('quest-list');
                if (!list) return;
                list.innerHTML = '';
                
                if (groups.length === 0) {
                    list.innerHTML = '<div class="quest-step active"><div class="step-num">1</div><div>Основной сюжет</div></div>';
                    return;
                }

                const currentNode = this.nodes.get(this.state.currentNodeId);
                const currentGroupId = currentNode?.data?.parentId;
                
                let activeFound = false;

                groups.forEach((g, i) => {
                    const el = document.createElement('div');
                    let isActive = false;
                    let isDone = false;
                    
                    if (currentGroupId === g.id) {
                        isActive = true;
                        activeFound = true;
                    } else if (activeFound) {
                    } else if (currentGroupId) {
                         isDone = true; 
                    }
                    
                    if (!currentGroupId && i === 0 && !this.state.currentNodeId) isActive = true;

                    el.className = \`quest-step \${isActive ? 'active' : ''} \${isDone ? 'done' : ''}\`;
                    el.innerHTML = \`<div class="step-num">\${isDone ? '✓' : i+1}</div> <div>\${g.data.label || 'Глава ' + (i+1)}</div>\`;
                    list.appendChild(el);
                });
            },

            processNode(id) {
                // Clear previous node timer if any
                if (this.state.nodeTimer) {
                    clearInterval(this.state.nodeTimer);
                    this.state.nodeTimer = null;
                }

                const node = this.nodes.get(id); // Use map for O(1) access
                if(!node) return;
                this.state.currentNodeId = id;
                this.state.visitedNodes.push(id);
                
                const title = node.data.title || node.data.label || 'Событие';
                const titleEl = document.getElementById('current-stage-title');
                if (titleEl) titleEl.innerText = title;

                const logicTypes = ['scoreNode','variableNode','conditionNode','formulaNode','achievementNode','goToNode','startNode'];
                if(logicTypes.includes(node.type)) {
                    this.executeLogic(node);
                    return;
                }
                
                this.renderNode(node);
                this.updateHUD();
                this.renderQuestList();
            },
            
            executeLogic(node) {
                 const { type, data } = node;
                 let nextId = null;
                 
                 if (type === 'scoreNode') { 
                     const val = parseInt(data.value || 0);
                     if (data.operation === 'add') this.state.score += val;
                     else if (data.operation === 'subtract') this.state.score -= val;
                     else this.state.score = val;
                 }
                 else if (type === 'variableNode') {
                     const v = data.variableName; const val = data.value;
                     if (data.operation === 'add') this.state.variables[v] = (parseFloat(this.state.variables[v])||0) + parseFloat(val);
                     else if (data.operation === 'subtract') this.state.variables[v] = (parseFloat(this.state.variables[v])||0) - parseFloat(val);
                     else this.state.variables[v] = val;
                 }
                 else if (type === 'conditionNode') {
                     const curr = this.state.variables[data.variable] ?? this.state.score;
                     let res = false;
                     if (data.operator === 'eq') res = curr == data.value;
                     if (data.operator === 'gt') res = curr > data.value;
                     if (data.operator === 'lt') res = curr < data.value;

                     const tEdge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === 'true');
                     const fEdge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === 'false');
                     if(res && tEdge) nextId = tEdge.target; else if(!res && fEdge) nextId = fEdge.target;
                     if(nextId) { this.processNode(nextId); return; }
                 }
                 else if (type === 'achievementNode') {
                     // Trigger Gift Unboxing for Achievement
                     this.showGift(data.title || "Секретное достижение!");
                 }
                 
                 if (!nextId) {
                     const edge = quizData.edges.find(e => e.source === node.id);
                     if(edge) nextId = edge.target;
                 }
                 if(nextId) this.processNode(nextId);
            },

            renderNode(node) {
                const view = document.getElementById('quiz-view');
                if (!view) return;
                
                // --- FIX: Rescue frost canvas before clearing ---
                const existingFrost = document.getElementById('frost-canvas');
                if (existingFrost && view.contains(existingFrost)) {
                    document.body.appendChild(existingFrost);
                }
                
                view.innerHTML = '';
                
                const { type, data } = node;
                
                // --- ADD FROST EFFECT ---
                if (['questionNode', 'textInputNode'].includes(type) && this.resetFrost) {
                    const canvas = document.getElementById('frost-canvas');
                    view.appendChild(canvas);
                    setTimeout(this.resetFrost, 50);
                } else {
                     const canvas = document.getElementById('frost-canvas');
                     if(canvas) {
                        canvas.classList.add('faded');
                        canvas.classList.remove('active');
                     }
                }

                // Result Node - Activate Fireworks
                if (type === 'resultNode') {
                    this.fireworks.start();
                    const container = document.createElement('div');
                    container.style.textAlign = 'center';
                    
                    const trophy = document.createElement('div');
                    trophy.className = 'result-trophy';
                    trophy.innerText = '🎉';
                    
                    const h1 = document.createElement('h1');
                    h1.className = 'node-title';
                    h1.style.color = '#fbbf24'; // Gold
                    h1.innerText = this.processText(data.title || 'ЛЕГЕНДА СНЕГОВИКА!');
                    
                    const desc = document.createElement('div');
                    desc.className = 'node-desc md-content';
                    desc.innerHTML = this.processText(data.description);
                    
                    container.appendChild(trophy);
                    container.appendChild(h1);
                    container.appendChild(desc);
                    
                    if (data.showScore) {
                        const scoreBox = document.createElement('div');
                        scoreBox.className = 'bg-white/10 p-4 rounded-xl inline-block mt-4 border border-white/20';
                        scoreBox.innerHTML = \`<div class="text-sm text-gray-400">Итоговый счет</div><div class="text-3xl font-bold text-green-400">\${this.state.score}</div>\`;
                        container.appendChild(scoreBox);
                    }
                    
                    view.appendChild(container);
                    this.playSound('success');
                    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
                    return;
                } else {
                    this.fireworks.stop();
                }

                // Standard Content
                if (data.imageUrl) {
                    const imgDiv = document.createElement('div');
                    imgDiv.className = 'node-image-wrapper mb-6';
                    imgDiv.onclick = () => game.openLightbox(data.imageUrl);
                    imgDiv.innerHTML = \`
                        <img src="\${data.imageUrl}" class="w-full object-contain max-h-[50vh]" alt="Image">
                        <div class="zoom-hint">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                        </div>
                    \`;
                    view.appendChild(imgDiv);
                }

                const h1 = document.createElement('h1');
                h1.className = 'node-title';
                h1.innerText = this.processText(data.title || data.label);
                view.appendChild(h1);

                // --- FEEDBACK NODE SPECIFIC RENDERING ---
                if (type === 'feedbackNode') {
                     const feedbackBubble = document.createElement('div');
                     feedbackBubble.className = 'feedback-bubble';
                     feedbackBubble.innerHTML = this.processText(data.message || data.description || '...');
                     view.appendChild(feedbackBubble);
                } else {
                     const desc = document.createElement('div');
                     desc.className = 'node-desc md-content';
                     desc.innerHTML = this.processText(data.description || data.question || data.message || '');
                     view.appendChild(desc);
                }

                const controls = document.createElement('div');
                controls.style.marginTop = '24px';

                // --- MULTIPLE CHOICE & SINGLE CHOICE ---
                if (type === 'questionNode' || type === 'multipleChoiceNode') {
                     const isMulti = type === 'multipleChoiceNode';
                     const selected = new Set();
                     
                     (data.answers || []).forEach(ans => {
                         const btn = document.createElement('button');
                         btn.className = 'ny-btn';
                         // Snowflake checkbox look for ALL buttons
                         const checkIcon = '<div class="ny-check">❄</div>';
                         btn.innerHTML = \`\${checkIcon} <span>\${this.processText(ans.text)}</span>\`;
                         
                         btn.onclick = () => {
                             this.playSound('click');
                             if (isMulti) {
                                 if (selected.has(ans.id)) {
                                     selected.delete(ans.id);
                                     btn.classList.remove('selected');
                                 } else {
                                     selected.add(ans.id);
                                     btn.classList.add('selected');
                                 }
                             } else {
                                 // Single choice: Try specific edge, fallback to any generic edge
                                 const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === ans.id)
                                           || quizData.edges.find(e => e.source === node.id && !e.sourceHandle);
                                 
                                 if(edge) this.processNode(edge.target);
                             }
                         };
                         controls.appendChild(btn);
                     });
                     
                     if (isMulti) {
                         const confirmBtn = document.createElement('button');
                         confirmBtn.className = 'ny-btn primary mt-4';
                         confirmBtn.innerText = data.buttonText || 'Подтвердить';
                         confirmBtn.onclick = () => {
                             const correctIds = new Set(data.correctOptions || []);
                             const isCorrect = correctIds.size === selected.size && [...selected].every(id => correctIds.has(id));
                             
                             // Feedback Sound
                             if(isCorrect) this.playSound('success'); else this.playSound('error');

                             // Enhanced Logic: Try 'correct'/'incorrect' edge, then generic edge
                             const handle = isCorrect ? 'correct' : 'incorrect';
                             const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle)
                                       || quizData.edges.find(e => e.source === node.id && !e.sourceHandle);

                             if(edge) this.processNode(edge.target);
                         };
                         controls.appendChild(confirmBtn);
                     }
                } 
                // --- ALLOCATOR (DISTRIBUTION) ---
                else if (type === 'allocatorNode') {
                     const maxTotal = data.maxTotal || 100;
                     (data.items || []).forEach(item => {
                         if (this.state.variables[item.variableName] === undefined) {
                             this.state.variables[item.variableName] = item.defaultValue || 0;
                         }
                         
                         const wrapper = document.createElement('div');
                         wrapper.className = 'ny-slider-container';
                         
                         const label = document.createElement('div');
                         label.className = 'ny-slider-label';
                         label.innerHTML = \`<span>\${item.label}</span><span id="val-\${item.id}">\${this.state.variables[item.variableName]}</span>\`;
                         
                         const input = document.createElement('input');
                         input.type = 'range';
                         input.className = 'ny-slider';
                         input.min = 0; input.max = maxTotal;
                         input.value = this.state.variables[item.variableName];
                         input.oninput = (e) => {
                             this.state.variables[item.variableName] = parseInt(e.target.value);
                             document.getElementById(\`val-\${item.id}\`).innerText = e.target.value;
                             this.updateHUD();
                         };
                         
                         wrapper.appendChild(label);
                         wrapper.appendChild(input);
                         controls.appendChild(wrapper);
                     });
                     
                     const btn = document.createElement('button');
                     btn.className = 'ny-btn primary';
                     btn.innerText = data.buttonText || 'Распределить';
                     btn.onclick = () => {
                         this.playSound('click');
                         const edge = quizData.edges.find(e => e.source === node.id);
                         if(edge) this.processNode(edge.target);
                     };
                     controls.appendChild(btn);
                }
                else if (type === 'collectInfoNode') {
                     const form = document.createElement('div');
                     form.className = 'flex flex-col gap-4';
                     (data.fields || []).forEach(field => {
                         const fieldWrapper = document.createElement('div');
                         
                         // Visible label for the field
                         const label = document.createElement('label');
                         label.className = 'block text-indigo-200 text-sm font-bold mb-2';
                         label.innerText = field.label;
                         fieldWrapper.appendChild(label);

                         const inp = document.createElement('input');
                         inp.className = 'ny-input';
                         inp.placeholder = field.label;
                         // Removed default value pre-fill to show placeholder
                         inp.value = this.state.variables[field.variableName] || '';
                         inp.oninput = (e) => {
                             this.state.variables[field.variableName] = e.target.value;
                             this.updateHUD(); // Live update for playerName
                         };
                         fieldWrapper.appendChild(inp);
                         form.appendChild(fieldWrapper);
                     });
                     
                     const btn = document.createElement('button');
                     btn.className = 'ny-btn primary mt-2';
                     btn.innerText = data.buttonText || 'Далее';
                     btn.onclick = () => {
                         this.playSound('click');
                         const edge = quizData.edges.find(e => e.source === node.id);
                         if(edge) this.processNode(edge.target);
                     };
                     form.appendChild(btn);
                     controls.appendChild(form);
                }
                else if (type === 'infoNode' || type === 'feedbackNode') {
                     const btn = document.createElement('button');
                     btn.className = 'ny-btn primary';
                     btn.innerText = data.buttonText || 'Далее';
                     btn.onclick = () => {
                         this.playSound('click');
                         const edge = quizData.edges.find(e => e.source === node.id);
                         if(edge) this.processNode(edge.target);
                     };
                     controls.appendChild(btn);
                }
                else if (type === 'timerNode') {
                    // Timer Node logic
                    const time = data.duration || 5;
                    let left = time;
                    
                    const timerDisplay = document.createElement('div');
                    timerDisplay.className = 'text-center mb-6';
                    timerDisplay.innerHTML = \`
                        <div class="text-6xl font-bold text-white drop-shadow-lg" id="node-timer-val">\${left}</div>
                        <div class="text-indigo-200 text-sm mt-2">Секунд до чуда</div>
                    \`;
                    controls.appendChild(timerDisplay);
                
                    this.state.nodeTimer = setInterval(() => {
                        left--;
                        const valEl = document.getElementById('node-timer-val');
                        if(valEl) valEl.innerText = left;
                        
                        if(left <= 0) {
                            clearInterval(this.state.nodeTimer);
                            this.state.nodeTimer = null;
                            // Auto advance
                            const edge = quizData.edges.find(e => e.source === node.id);
                            if(edge) this.processNode(edge.target);
                        }
                    }, 1000);
                
                    const btn = document.createElement('button');
                    btn.className = 'ny-btn primary';
                    btn.innerText = data.buttonText || 'Пропустить';
                    btn.onclick = () => {
                        if (this.state.nodeTimer) {
                            clearInterval(this.state.nodeTimer);
                            this.state.nodeTimer = null;
                        }
                        this.playSound('click');
                        const edge = quizData.edges.find(e => e.source === node.id);
                        if(edge) this.processNode(edge.target);
                    };
                    controls.appendChild(btn);
                }
                else if (type === 'timelineNode') {
                    this.state.temp.timeline = [...(data.events || [])].sort(() => Math.random() - 0.5);
                    const listContainer = document.createElement('div');
                    listContainer.className = 'flex flex-col gap-2 mb-4';
                    
                    const renderTimeline = () => {
                        listContainer.innerHTML = '';
                        this.state.temp.timeline.forEach((item, i) => {
                            const row = document.createElement('div');
                            row.className = 'timeline-item';
                            row.innerHTML = \`<div class="flex flex-col gap-1"><div class="t-btn" onclick="game.moveTimeline(\${i},-1)">▲</div><div class="t-btn" onclick="game.moveTimeline(\${i},1)">▼</div></div><div class="text-white">\${item.text}</div>\`;
                            listContainer.appendChild(row);
                        });
                    };
                    
                    game.moveTimeline = (i, d) => {
                         if(i+d >= 0 && i+d < this.state.temp.timeline.length) {
                             [this.state.temp.timeline[i], this.state.temp.timeline[i+d]] = [this.state.temp.timeline[i+d], this.state.temp.timeline[i]];
                             renderTimeline();
                         }
                    };
                    
                    renderTimeline();
                    controls.appendChild(listContainer);
                    
                    const btn = document.createElement('button');
                    btn.className = 'ny-btn primary';
                    btn.innerText = data.buttonText || 'Проверить';
                    btn.onclick = () => {
                        const current = this.state.temp.timeline.map(t => t.id);
                        const correct = (data.events || []).map(t => t.id);
                        const isCorrect = JSON.stringify(current) === JSON.stringify(correct);
                        
                        if(isCorrect) this.playSound('success'); else this.playSound('error');
                        
                        const handle = isCorrect ? 'correct' : 'incorrect';
                        const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle)
                                  || quizData.edges.find(e => e.source === node.id && !e.sourceHandle);
                        if(edge) this.processNode(edge.target);
                    };
                    controls.appendChild(btn);
                }
                else if (type === 'matchingNode') {
                     // Matching Logic visual
                     this.state.temp.matching = { left: null, right: null, pairs: [] };
                     const grid = document.createElement('div'); grid.className = 'match-grid';
                     
                     const renderMatches = () => {
                         grid.innerHTML = '';
                         const leftCol = document.createElement('div'); leftCol.className = 'flex flex-col gap-2';
                         const rightCol = document.createElement('div'); rightCol.className = 'flex flex-col gap-2';
                         
                         data.leftColumn.forEach(l => {
                             const el = document.createElement('div');
                             const isSel = this.state.temp.matching.left === l.id;
                             const isMatched = this.state.temp.matching.pairs.find(p => p.left === l.id);
                             el.className = \`match-item \${isSel ? 'selected' : ''} \${isMatched ? 'matched' : ''}\`;
                             if (l.imageUrl) {
                                 const image = document.createElement('img');
                                 image.src = l.imageUrl;
                                 image.alt = l.text || '';
                                 image.style.cssText = 'width:100%;max-height:120px;object-fit:contain;margin-bottom:8px;cursor:zoom-in;';
                                 image.onclick = (event) => { event.stopPropagation(); this.openLightbox(l.imageUrl); };
                                 el.appendChild(image);
                             }
                             const label = document.createElement('span');
                             label.innerText = l.text || '';
                             el.appendChild(label);
                             if(!isMatched) el.onclick = () => { this.state.temp.matching.left = l.id; checkPair(); renderMatches(); };
                             leftCol.appendChild(el);
                         });
                         
                         data.rightColumn.forEach(r => {
                             const el = document.createElement('div');
                             const isSel = this.state.temp.matching.right === r.id;
                             const isMatched = this.state.temp.matching.pairs.find(p => p.right === r.id);
                             el.className = \`match-item \${isSel ? 'selected' : ''} \${isMatched ? 'matched' : ''}\`;
                             if (r.imageUrl) {
                                 const image = document.createElement('img');
                                 image.src = r.imageUrl;
                                 image.alt = r.text || '';
                                 image.style.cssText = 'width:100%;max-height:120px;object-fit:contain;margin-bottom:8px;cursor:zoom-in;';
                                 image.onclick = (event) => { event.stopPropagation(); this.openLightbox(r.imageUrl); };
                                 el.appendChild(image);
                             }
                             const label = document.createElement('span');
                             label.innerText = r.text || '';
                             el.appendChild(label);
                             if(!isMatched) el.onclick = () => { this.state.temp.matching.right = r.id; checkPair(); renderMatches(); };
                             rightCol.appendChild(el);
                         });
                         
                         grid.appendChild(leftCol); grid.appendChild(rightCol);
                     };
                     
                     const checkPair = () => {
                         const { left, right } = this.state.temp.matching;
                         if(left && right) {
                             this.state.temp.matching.pairs.push({left, right});
                             this.state.temp.matching.left = null; this.state.temp.matching.right = null;
                             this.playSound('click');
                         }
                     };
                     
                     renderMatches();
                     controls.appendChild(grid);
                     
                     const btn = document.createElement('button');
                     btn.className = 'ny-btn primary mt-4';
                     btn.innerText = 'Проверить магию';
                     btn.onclick = () => {
                         const correct = data.correctPairs || [];
                         const user = this.state.temp.matching.pairs;
                         const isCorrect = correct.length === user.length && user.every(u => correct.some(c => c.leftId === u.left && c.rightId === u.right));
                         
                         if(isCorrect) this.playSound('success'); else this.playSound('error');
                         
                         const handle = isCorrect ? 'correct' : 'incorrect';
                         const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle)
                                   || quizData.edges.find(e => e.source === node.id && !e.sourceHandle);
                         if(edge) this.processNode(edge.target);
                     };
                     controls.appendChild(btn);

                } else if (type === 'textInputNode') {
                     const input = document.createElement('input');
                     input.className = 'ny-input';
                     input.placeholder = 'Введи пароль...';
                     controls.appendChild(input);
                     
                     const btn = document.createElement('button');
                     btn.className = 'ny-btn primary mt-4';
                     btn.innerHTML = '<div class="ny-check">❄</div> <span>Открыть сейф</span>';
                     btn.onclick = () => {
                         const val = input.value.trim().toLowerCase();
                         const key = (data.keyword || '').toLowerCase();
                         const isCorrect = val.includes(key);
                         
                         if(isCorrect) this.playSound('success'); else this.playSound('error');
                         
                         const handle = isCorrect ? 'correct' : 'incorrect';
                         const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle)
                                   || quizData.edges.find(e => e.source === node.id && !e.sourceHandle);
                         if(edge) this.processNode(edge.target);
                     };
                     controls.appendChild(btn);

                } else {
                     const btn = document.createElement('button');
                     btn.className = 'ny-btn primary';
                     btn.innerText = data.buttonText || 'Продолжить путь';
                     btn.onclick = () => {
                         this.playSound('click');
                         const edge = quizData.edges.find(e => e.source === node.id);
                         if(edge) this.processNode(edge.target);
                     };
                     controls.appendChild(btn);
                }

                view.appendChild(controls);
            }
        };

        window.onload = () => game.init();
    </script>
</body>
</html>
`;
export default newyearTemplate;
