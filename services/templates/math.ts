
const mathTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chalkboard Challenge</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" integrity="sha384-1C01FBF57751BC7AFA6B1546878C505950A9D7891C777D9B364E17BB4B070C7B45438DA7E8100CF3292F078EDD1B3E83" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.min.js" integrity="sha384-4373D3C40FD427C0A09AD7647B286C33F34FC104F30FC33302FC105BE048DF37354FC7DD1A278F3FC54DE83E12C657A0" crossorigin="anonymous"></script>
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Neucha&display=swap" rel="stylesheet">
    <!-- MathJax -->
    <script>
    window.MathJax = {
      tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']] },
      svg: { fontCache: 'global' },
      startup: {
        ready: () => {
          MathJax.startup.defaultReady();
          MathJax.startup.promise.then(() => {
            console.log('MathJax initial typesetting complete');
          });
        }
      }
    };
    </script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" integrity="sha384-5AE8B1E81BA1AD66E30C1B36E1B5EB8DFE19439685785581B8A9057A43B6B7CC4553488D68B41FA762BAFF5371BDE7A2" crossorigin="anonymous"></script>
    
    <style>
        :root {
            --chalk-white: #fdfdfd;
            --chalk-yellow: #fef08a;
            --chalk-blue: #bfdbfe;
            --chalk-pink: #fbcfe8;
            --chalk-green: #86efac;
            --board-bg: #2b4a3c;
        }

        body {
            margin: 0;
            height: 100vh;
            overflow: hidden;
            background-color: var(--board-bg);
            background-image: 
                url("https://www.transparenttextures.com/patterns/blackboard.png"),
                radial-gradient(circle at center, #3a5f4d 0%, #1e332a 100%);
            background-size: auto, cover; 
            color: var(--chalk-white);
            font-family: 'Neucha', cursive;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            text-shadow: 
                2px 2px 2px rgba(0,0,0,0.2), 
                0 0 1px rgba(255,255,255,0.4),
                1px 1px 4px rgba(0,0,0,0.5);
            font-size: 1.2rem;
        }
        
        .chalk-dust {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-image: url("https://www.transparenttextures.com/patterns/dust.png");
            opacity: 0.3; pointer-events: none; z-index: 1;
        }

        /* --- UI Elements --- */
        .chalk-btn {
            background: transparent;
            border: 3px solid rgba(255,255,255,0.8);
            color: white;
            font-family: 'Neucha', cursive;
            font-size: 1.5rem;
            padding: 8px 30px;
            cursor: pointer;
            position: relative;
            transition: all 0.2s;
            border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
            box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
            text-shadow: inherit;
        }
        .chalk-btn:hover {
            transform: scale(1.02) rotate(-1deg);
            background: rgba(255,255,255,0.1);
            border-color: #fff;
        }
        .chalk-btn:active { transform: scale(0.98); }
        
        .chalk-input {
            background: transparent;
            border: none;
            border-bottom: 3px solid rgba(255,255,255,0.6);
            color: var(--chalk-yellow);
            font-family: 'Neucha', cursive;
            font-size: 2rem;
            text-align: center;
            outline: none;
            width: 100%;
            padding: 10px;
            text-shadow: inherit;
        }
        .chalk-input::placeholder { color: rgba(255,255,255,0.3); }

        /* --- LAYOUT --- */
        .main-frame {
            width: 95vw; height: 90vh;
            max-width: 1600px;
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 2rem;
            z-index: 2;
        }

        .board-area {
            position: relative;
            padding: 40px;
            display: flex; flex-direction: column;
            border: 12px solid #5d4037; /* Wood frame */
            border-radius: 10px;
            box-shadow: 
                inset 0 0 50px rgba(0,0,0,0.8), 
                0 10px 20px rgba(0,0,0,0.5);
            background-color: rgba(43, 74, 60, 0.9); /* Slight transparency for dynamic BG */
        }

        .hud-panel {
            display: flex; flex-direction: column; gap: 20px;
            padding: 20px;
            font-family: 'Neucha', cursive;
        }
        
        .hud-box {
            border: 2px solid rgba(255,255,255,0.4);
            border-radius: 15px 225px 15px 255px / 255px 15px 225px 15px;
            padding: 15px;
            text-align: center;
            background: rgba(0,0,0,0.2);
        }
        
        .score-circle {
            width: 100px; height: 100px;
            border: 3px solid var(--chalk-yellow);
            border-radius: 50% 45% 55% 50% / 50% 55% 45% 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 10px;
            font-size: 2.5rem;
            color: var(--chalk-yellow);
        }

        /* --- CONTENT STYLES --- */
        .content-scroll {
            flex: 1; overflow-y: auto; padding-right: 15px;
            display: flex; flex-direction: column; align-items: center; text-align: center;
        }
        
        .md-content {
            width: 100%;
            font-size: 1.6rem;
            line-height: 1.4;
            color: var(--chalk-white);
            text-align: center;
        }
        .md-content strong { color: var(--chalk-yellow); font-weight: bold; }
        .md-content em { color: var(--chalk-blue); font-style: italic; }
        .md-content h1 { font-size: 2.5rem; margin-bottom: 0.5em; text-transform: uppercase; }
        .md-content h2 { font-size: 2rem; margin-bottom: 0.5em; color: var(--chalk-green); }

        /* Timeline Styles */
        .timeline-container {
            width: 100%; max-width: 600px;
            display: flex; flex-direction: column; gap: 10px;
            margin: 20px 0;
        }
        .timeline-item {
            display: flex; align-items: center; gap: 15px;
            padding: 10px 20px;
            border: 2px dashed rgba(255,255,255,0.3);
            border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
            transition: background 0.2s;
            background: rgba(255,255,255,0.02);
        }
        .timeline-item:hover { background: rgba(255,255,255,0.1); }
        .timeline-ctrl { display: flex; flex-direction: column; gap: 5px; }
        .timeline-btn {
            cursor: pointer; font-size: 1rem; line-height: 1; opacity: 0.7;
            color: var(--chalk-yellow); border: 1px solid rgba(255,255,255,0.3);
            border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
        }
        .timeline-btn:hover { opacity: 1; transform: scale(1.1); background: rgba(255,255,255,0.1); }
        .timeline-text { font-size: 1.4rem; text-align: left; flex: 1; }

        /* Matching Styles */
        .match-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 40px; width: 100%; margin: 20px 0;
        }
        .match-col { display: flex; flex-direction: column; gap: 15px; }
        .match-item {
            padding: 15px; border: 2px dashed rgba(255,255,255,0.4);
            cursor: pointer; transition: all 0.2s; font-size: 1.2rem;
            border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
            position: relative;
        }
        .match-item:hover { border-color: white; background: rgba(255,255,255,0.05); }
        .match-item.selected { 
            border: 3px solid var(--chalk-yellow); color: var(--chalk-yellow); 
            transform: scale(1.02); 
            box-shadow: 0 0 15px rgba(254, 240, 138, 0.3); 
            border-style: solid;
        }
        .match-item.matched { 
            opacity: 0.5; border-color: var(--chalk-green); text-decoration: line-through; 
            pointer-events: none; border-style: solid; color: var(--chalk-green);
        }

        /* Allocator Styles */
        .allocator-container { width: 100%; max-width: 600px; margin: 20px auto; }
        .allocator-item { margin-bottom: 20px; }
        .allocator-header { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 1.2rem; }
        .chalk-range {
            -webkit-appearance: none; width: 100%; height: 8px; background: rgba(255,255,255,0.2);
            border-radius: 5px; outline: none; border: 1px dashed rgba(255,255,255,0.4);
        }
        .chalk-range::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none; width: 24px; height: 24px;
            border-radius: 50%; background: var(--chalk-yellow); cursor: pointer;
            box-shadow: 0 0 10px rgba(254, 240, 138, 0.5);
        }

        /* --- FEATURES: Calculator, Scratchpad, Plotter, Converter --- */
        .tool-panel {
            position: absolute; bottom: 20px; left: 20px; width: 280px;
            background: rgba(43, 43, 43, 0.95); border: 4px solid #8d6e63; border-radius: 10px;
            padding: 15px; display: none; box-shadow: 10px 10px 30px rgba(0,0,0,0.6);
            z-index: 50; font-family: monospace; color: white;
        }
        
        .calc-display {
            width: 100%; background: #9ca3af; color: #000; padding: 10px;
            font-size: 1.5rem; text-align: right; margin-bottom: 10px;
            font-family: 'Courier New', monospace; border: 4px solid #555;
        }
        .calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .calc-btn {
            background: #444; color: white; padding: 10px; border-radius: 4px;
            cursor: pointer; border: 1px solid #666; font-size: 1.2rem;
        }
        .calc-btn:hover { background: #555; }
        .calc-btn.op { background: #d97706; }
        
        /* Scratchpad */
        #scratchpad {
            position: absolute; inset: 0; pointer-events: none; z-index: 40;
        }
        #scratchpad.active { pointer-events: auto; cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="6"/></svg>') 12 12, crosshair; }
        
        #scratch-toolbar {
            position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
            display: none; gap: 10px; z-index: 45;
        }
        #scratch-toolbar.visible { display: flex; }
        .scratch-tool-btn {
            background: rgba(0,0,0,0.6); border: 2px solid white; color: white;
            padding: 8px 16px; border-radius: 20px; cursor: pointer; font-family: 'Neucha';
            font-size: 1.2rem; transition: transform 0.2s;
        }
        .scratch-tool-btn:hover { transform: scale(1.1); background: rgba(0,0,0,0.8); }

        /* Plotter */
        #plotter-panel {
            bottom: 20px; right: 320px; left: auto; width: 350px;
        }
        #plotter-canvas {
            background: #2b2b2b; border: 2px solid #555; width: 100%; height: 200px; margin-bottom: 10px;
        }

        /* Converter */
        #converter-panel {
            top: 100px; right: 20px; left: auto; bottom: auto;
        }
        .conv-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; }
        .conv-label { font-size: 0.8rem; color: var(--chalk-yellow); }
        .conv-input { 
            background: transparent; border: none; border-bottom: 1px dashed white; 
            color: white; width: 70%; text-align: right; font-family: monospace; 
        }

        /* Formula Sheet */
        #formulas-panel {
            position: fixed; right: -320px; top: 0; bottom: 0; width: 300px;
            background: rgba(30, 30, 30, 0.95); border-left: 4px solid #8d6e63;
            transition: right 0.3s; z-index: 60; padding: 20px; overflow-y: auto;
            box-shadow: -10px 0 30px rgba(0,0,0,0.5);
        }
        #formulas-panel.open { right: 0; }
        .formula-item { margin-bottom: 15px; border-bottom: 1px dashed gray; padding-bottom: 10px; }
        .formula-title { color: var(--chalk-yellow); font-size: 1rem; margin-bottom: 5px; }

        .polaroid {
            background: #fff;
            padding: 10px 10px 30px 10px;
            box-shadow: 2px 2px 10px rgba(0,0,0,0.3);
            transform: rotate(-2deg);
            max-width: 100%;
            display: inline-block;
            margin-bottom: 20px;
            transition: transform 0.3s;
            cursor: zoom-in;
        }
        .polaroid:hover { transform: rotate(0deg) scale(1.02); z-index: 10; }
        .polaroid img { display: block; max-height: 300px; filter: sepia(0.2); }

        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        
        mjx-container { font-size: 120% !important; color: white !important; }
        mjx-container svg path { stroke-width: 30px !important; }

        @media (max-width: 1024px) {
            .main-frame { grid-template-columns: 1fr; grid-template-rows: 1fr auto; height: auto; min-height: 100vh; }
            .hud-panel { flex-direction: row; flex-wrap: wrap; justify-content: center; }
            #plotter-panel { right: 20px; bottom: 80px; }
        }
    </style>
</head>
<body>
    <div class="chalk-dust"></div>
    <canvas id="scratchpad"></canvas>
    
    <!-- Scratchpad Toolbar (New) -->
    <div id="scratch-toolbar">
        <button class="scratch-tool-btn" onclick="game.clearScratchpad()">🗑️ Стереть</button>
        <button class="scratch-tool-btn" onclick="game.toggleScratchpad()" style="border-color: var(--chalk-pink); color: var(--chalk-pink);">❌ Закрыть</button>
    </div>

    <div class="main-frame">
        <main class="board-area">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:20px; border-bottom:2px solid rgba(255,255,255,0.2); padding-bottom:10px;">
                <h1 id="quiz-title" style="font-size:3rem; line-height:1; color:var(--chalk-white);">УРОК МАТЕМАТИКИ</h1>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button onclick="game.toggleCalculator()" class="chalk-btn" style="font-size:1rem; padding: 5px 10px;" title="Калькулятор">🧮</button>
                    <button onclick="game.togglePlotter()" class="chalk-btn" style="font-size:1rem; padding: 5px 10px;" title="График">📈</button>
                    <button onclick="game.toggleConverter()" class="chalk-btn" style="font-size:1rem; padding: 5px 10px;" title="Системы счисления">01</button>
                    <button onclick="game.toggleScratchpad()" id="scratch-btn" class="chalk-btn" style="font-size:1rem; padding: 5px 10px;" title="Черновик">✏️</button>
                    <button onclick="game.toggleFormulas()" class="chalk-btn" style="font-size:1rem; padding: 5px 10px;" title="Формулы">📜</button>
                </div>
            </div>

            <div id="game-view" class="content-scroll">
                <div class="animate-pulse" style="margin-top: 100px; font-size: 2rem;">Пишем на доске...</div>
            </div>
            
            <div style="height: 20px; background: #3e2723; margin-top: auto; border-radius: 2px; box-shadow: 0 -2px 5px rgba(0,0,0,0.5); display:flex; justify-content:center; gap:20px; align-items:center; padding: 0 20px;">
                 <div style="width:50px; height:8px; background:white; border-radius:2px; transform: rotate(5deg);"></div>
                 <div style="width:40px; height:8px; background:#bfdbfe; border-radius:2px; transform: rotate(-2deg);"></div>
                 <div style="width:60px; height:15px; background:#5d4037; border-radius:2px;"></div>
            </div>
        </main>

        <aside class="hud-panel">
            <div class="hud-box">
                <div style="font-size:1rem; opacity:0.8; margin-bottom:5px;">УЧЕНИК</div>
                <div id="player-name" style="font-size:1.5rem; font-weight:bold;">Student</div>
            </div>

            <div class="hud-box">
                <div style="font-size:1rem; opacity:0.8; margin-bottom:5px;">ОЦЕНКА (ОЧКИ)</div>
                <div class="score-circle">
                    <span id="score-val">0</span>
                </div>
            </div>

            <div class="hud-box" id="vars-container" style="text-align:left;"></div>

            <div style="text-align:center; margin-top:auto;">
                <div style="font-size:0.8rem; opacity:0.6;">Достижения</div>
                <div id="achievements-list" style="display:flex; flex-wrap:wrap; gap:5px; justify-content:center;"></div>
            </div>
        </aside>
    </div>

    <!-- CALCULATOR WIDGET -->
    <div id="calculator" class="tool-panel">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span>Калькулятор</span>
            <span style="cursor:pointer" onclick="game.toggleCalculator()">❌</span>
        </div>
        <div class="calc-display" id="calc-display">0</div>
        <div class="calc-grid">
            <div class="calc-btn" onclick="game.calcInput('7')">7</div>
            <div class="calc-btn" onclick="game.calcInput('8')">8</div>
            <div class="calc-btn" onclick="game.calcInput('9')">9</div>
            <div class="calc-btn op" onclick="game.calcInput('/')">/</div>
            <div class="calc-btn" onclick="game.calcInput('4')">4</div>
            <div class="calc-btn" onclick="game.calcInput('5')">5</div>
            <div class="calc-btn" onclick="game.calcInput('6')">6</div>
            <div class="calc-btn op" onclick="game.calcInput('*')">*</div>
            <div class="calc-btn" onclick="game.calcInput('1')">1</div>
            <div class="calc-btn" onclick="game.calcInput('2')">2</div>
            <div class="calc-btn" onclick="game.calcInput('3')">3</div>
            <div class="calc-btn op" onclick="game.calcInput('-')">-</div>
            <div class="calc-btn" onclick="game.calcInput('0')">0</div>
            <div class="calc-btn" onclick="game.calcInput('.')">.</div>
            <div class="calc-btn op" onclick="game.calcResult()">=</div>
            <div class="calc-btn op" onclick="game.calcInput('+')">+</div>
        </div>
        <button class="chalk-btn" style="width:100%; margin-top:10px; font-size:1rem;" onclick="game.calcClear()">Сброс</button>
    </div>

    <!-- PLOTTER WIDGET (New) -->
    <div id="plotter-panel" class="tool-panel">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span>Графопостроитель</span>
            <span style="cursor:pointer" onclick="game.togglePlotter()">❌</span>
        </div>
        <canvas id="plotter-canvas" width="280" height="200" style="background:#222; border:1px solid #555;"></canvas>
        <div style="display:flex; gap:5px;">
            <span style="font-family:serif; font-style:italic;">y =</span>
            <input type="text" id="plotter-input" class="chalk-input" style="font-size:1rem; padding:2px;" value="sin(x)">
        </div>
        <button class="chalk-btn" style="width:100%; margin-top:5px; font-size:0.9rem;" onclick="game.plotGraph()">Построить</button>
    </div>

    <!-- CONVERTER WIDGET (New) -->
    <div id="converter-panel" class="tool-panel">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span>Конвертер</span>
            <span style="cursor:pointer" onclick="game.toggleConverter()">❌</span>
        </div>
        <div class="conv-row">
            <span class="conv-label">DEC:</span>
            <input type="text" id="conv-dec" class="conv-input" oninput="game.convert(this.value, 10)">
        </div>
        <div class="conv-row">
            <span class="conv-label">BIN:</span>
            <input type="text" id="conv-bin" class="conv-input" oninput="game.convert(this.value, 2)">
        </div>
        <div class="conv-row">
            <span class="conv-label">HEX:</span>
            <input type="text" id="conv-hex" class="conv-input" oninput="game.convert(this.value, 16)">
        </div>
    </div>

    <!-- FORMULAS PANEL (New) -->
    <div id="formulas-panel">
        <div style="display:flex; justify-content:space-between; margin-bottom:20px; border-bottom:1px solid gray;">
            <h2 style="margin:0; font-size:1.5rem;">Шпаргалка</h2>
            <button onclick="game.toggleFormulas()" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <div id="formulas-content">
            <div class="formula-item">
                <div class="formula-title">Площадь круга</div>
                <div>$$S = \pi r^2$$</div>
            </div>
            <div class="formula-item">
                <div class="formula-title">Теорема Пифагора</div>
                <div>$$a^2 + b^2 = c^2$$</div>
            </div>
            <div class="formula-item">
                <div class="formula-title">Квадратное уравнение</div>
                <div>$$x = \frac{-b \pm \sqrt{D}}{2a}$$</div>
            </div>
            <div class="formula-item">
                <div class="formula-title">Тригонометрия</div>
                <div>$$\sin^2\alpha + \cos^2\alpha = 1$$</div>
            </div>
             <div class="formula-item">
                <div class="formula-title">Логарифм</div>
                <div>$$a^x = b \iff x = \log_a b$$</div>
            </div>
        </div>
    </div>

    <div id="lightbox" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:100; align-items:center; justify-content:center;">
        <img id="lightbox-img" src="" style="max-height:90vh; max-width:90vw; border: 10px solid white; box-shadow: 0 0 50px black;">
    </div>

    <audio id="bg-music" loop></audio>

    <script>
        const quizData = %%QUIZ_DATA_INJECTION%%;
        const sfx = {
            chalk: new Audio('https://assets.mixkit.co/active_storage/sfx/2413/2413-preview.mp3'),
            click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
            success: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
            error: new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3')
        };
        
        function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        const game = {
            state: { score: 0, variables: {}, currentNodeId: null, history: [], unlockedAchievements: [], temp: {} },
            calcValue: '',
            isScratchpadActive: false,
            
            init() {
                const lightbox = document.getElementById('lightbox');
                const lightboxImage = document.getElementById('lightbox-img');
                lightbox.addEventListener('click', () => { lightbox.style.display = 'none'; });
                lightboxImage.addEventListener('click', (event) => event.stopPropagation());

                if(quizData.currentQuizName) {
                    document.getElementById('quiz-title').innerText = quizData.currentQuizName;
                    document.title = quizData.currentQuizName;
                }
                this.state.variables['playerName'] = 'Ученик';
                
                // Dynamic Background Logic
                if (quizData.designSettings && quizData.designSettings.background && quizData.designSettings.background.imageUrl) {
                    document.body.style.backgroundImage = \`url("\${quizData.designSettings.background.imageUrl}")\`;
                    document.body.style.backgroundSize = 'cover';
                    document.body.style.backgroundPosition = 'center';
                }

                this.initScratchpad();
                this.initPlotter(); // Init graph tool
                
                const startId = quizData.startNodeId;
                if (startId) {
                     const node = quizData.nodes.find(n => n.id === startId);
                     if (node && node.type !== 'startNode') {
                         this.processNode(startId); // Direct preview
                     } else {
                         const startNode = quizData.nodes.find(n => n.type === 'startNode') || quizData.nodes[0];
                         if(startNode) this.processNode(startNode.id);
                     }
                } else {
                     const startNode = quizData.nodes.find(n => n.type === 'startNode') || quizData.nodes[0];
                     if(startNode) this.processNode(startNode.id);
                }
            },

            // --- Features ---
            toggleCalculator() {
                const calc = document.getElementById('calculator');
                calc.style.display = calc.style.display === 'block' ? 'none' : 'block';
            },
            togglePlotter() {
                const el = document.getElementById('plotter-panel');
                el.style.display = el.style.display === 'block' ? 'none' : 'block';
                if(el.style.display === 'block') this.plotGraph();
            },
            toggleConverter() {
                 const el = document.getElementById('converter-panel');
                 el.style.display = el.style.display === 'block' ? 'none' : 'block';
            },
            toggleFormulas() {
                 document.getElementById('formulas-panel').classList.toggle('open');
            },

            // Calculator Logic
            calcInput(val) {
                this.calcValue += val;
                document.getElementById('calc-display').innerText = this.calcValue;
            },
            calcClear() {
                this.calcValue = '';
                document.getElementById('calc-display').innerText = '0';
            },
            calcResult() {
                try {
                    const res = eval(this.calcValue); // Safe in this context
                    this.calcValue = String(res);
                    document.getElementById('calc-display').innerText = this.calcValue;
                } catch(e) {
                    document.getElementById('calc-display').innerText = 'Err';
                    this.calcValue = '';
                }
            },

            // Plotter Logic
            initPlotter() {
                 const input = document.getElementById('plotter-input');
                 input.addEventListener('keydown', (e) => { if(e.key === 'Enter') this.plotGraph(); });
            },
            plotGraph() {
                 const canvas = document.getElementById('plotter-canvas');
                 const ctx = canvas.getContext('2d');
                 const w = canvas.width; const h = canvas.height;
                 const exprStr = document.getElementById('plotter-input').value;
                 
                 ctx.clearRect(0, 0, w, h);
                 // Draw Axis
                 ctx.strokeStyle = '#666'; ctx.beginPath();
                 ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
                 ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h);
                 ctx.stroke();
                 
                 ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2; ctx.beginPath();
                 try {
                     const compiled = window.math.compile(exprStr);
                     for(let px = 0; px < w; px++) {
                         // Map pixel to x (-10 to 10)
                         const x = (px - w/2) / (w/20); 
                         const y = compiled.evaluate({x: x});
                         // Map y to pixel
                         const py = h/2 - (y * (h/20));
                         if(px===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                     }
                     ctx.stroke();
                 } catch(e) {
                     ctx.fillStyle = 'red'; ctx.fillText('Error', 10, 20);
                 }
            },

            // Converter Logic
            convert(val, base) {
                 const num = parseInt(val, base);
                 if (isNaN(num)) return;
                 if (base !== 10) document.getElementById('conv-dec').value = num.toString(10);
                 if (base !== 2) document.getElementById('conv-bin').value = num.toString(2);
                 if (base !== 16) document.getElementById('conv-hex').value = num.toString(16).toUpperCase();
            },
            
            // Scratchpad Logic (Updated)
            initScratchpad() {
                const canvas = document.getElementById('scratchpad');
                const ctx = canvas.getContext('2d');
                this.scratchCtx = ctx;
                let painting = false;

                const resize = () => {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.shadowBlur = 2;
                    ctx.shadowColor = 'white';
                };
                window.addEventListener('resize', resize);
                resize();

                const startPosition = (e) => { 
                    if(!this.isScratchpadActive) return;
                    painting = true; draw(e); 
                }
                const finishedPosition = () => { painting = false; ctx.beginPath(); }
                const draw = (e) => {
                    if(!painting || !this.isScratchpadActive) return;
                    ctx.lineTo(e.clientX, e.clientY);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(e.clientX, e.clientY);
                }

                canvas.addEventListener('mousedown', startPosition);
                canvas.addEventListener('mouseup', finishedPosition);
                canvas.addEventListener('mousemove', draw);
            },
            
            toggleScratchpad() {
                this.isScratchpadActive = !this.isScratchpadActive;
                const canvas = document.getElementById('scratchpad');
                const btn = document.getElementById('scratch-btn');
                const toolbar = document.getElementById('scratch-toolbar');
                
                if(this.isScratchpadActive) {
                    canvas.classList.add('active');
                    toolbar.classList.add('visible');
                    btn.style.color = 'var(--chalk-yellow)';
                    btn.style.borderColor = 'var(--chalk-yellow)';
                } else {
                    canvas.classList.remove('active');
                    toolbar.classList.remove('visible');
                    btn.style.color = 'white';
                    btn.style.borderColor = 'rgba(255,255,255,0.8)';
                }
            },
            
            clearScratchpad() {
                 const canvas = document.getElementById('scratchpad');
                 const ctx = canvas.getContext('2d');
                 ctx.clearRect(0, 0, canvas.width, canvas.height);
            },

            // --- Core Quiz Logic ---
            updateHUD() {
                document.getElementById('score-val').innerText = this.state.score;
                const name = this.state.variables['playerName'] || this.state.variables['name'];
                if(name) document.getElementById('player-name').innerText = name;
                
                const varsContainer = document.getElementById('vars-container');
                varsContainer.innerHTML = '';
                for(const [k, v] of Object.entries(this.state.variables)) {
                    if(['playerName', 'name', 'score'].includes(k)) continue;
                    varsContainer.innerHTML += \`
                        <div style="display:flex; justify-content:space-between; border-bottom:1px dashed rgba(255,255,255,0.3); padding:5px 0;">
                            <span>\${k}:</span>
                            <span style="color:var(--chalk-yellow);">\${v}</span>
                        </div>
                    \`;
                }
                const achContainer = document.getElementById('achievements-list');
                achContainer.innerHTML = this.state.unlockedAchievements.map(a => 
                    \`<div title="\${a}" style="font-size:1.5rem; cursor:help;">⭐</div>\`
                ).join('');
            },

            processNode(id) {
                const node = quizData.nodes.find(n => n.id === id);
                if(!node) return;
                this.state.currentNodeId = id;
                if(['scoreNode','variableNode','conditionNode','formulaNode','achievementNode','goToNode','startNode'].includes(node.type)) {
                    this.executeLogic(node); return;
                }
                this.renderNode(node);
                this.updateHUD();
            },

            executeLogic(node) {
                const { type, data } = node;
                let next = null;
                const edge = quizData.edges.find(e => e.source === node.id);

                if (type === 'scoreNode') {
                    const val = parseInt(data.value || 0);
                    if(data.operation === 'add') this.state.score += val;
                    else if(data.operation === 'subtract') this.state.score -= val;
                    else this.state.score = val;
                } else if (type === 'variableNode') {
                    const v = data.variableName; const val = data.value;
                    if(!this.state.variables[v]) this.state.variables[v] = 0;
                    if(data.operation === 'add') this.state.variables[v] = (parseFloat(this.state.variables[v])||0) + parseFloat(val);
                    else if(data.operation === 'subtract') this.state.variables[v] = (parseFloat(this.state.variables[v])||0) - parseFloat(val);
                    else this.state.variables[v] = val;
                } else if (type === 'achievementNode') {
                    if(!this.state.unlockedAchievements.includes(data.title)) {
                        this.state.unlockedAchievements.push(data.title);
                        sfx.success.play();
                        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                    }
                } else if (type === 'conditionNode') {
                    const current = this.state.variables[data.variable] ?? this.state.score;
                    const target = data.value;
                    let res = false;
                    if(data.operator === 'eq') res = current == target;
                    else if(data.operator === 'gt') res = current > target;
                    else if(data.operator === 'lt') res = current < target;
                    else if(data.operator === 'gte') res = current >= target;
                    else if(data.operator === 'lte') res = current <= target;
                    
                    const tEdge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === 'true');
                    const fEdge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === 'false');
                    if(res && tEdge) next = tEdge.target;
                    else if(!res && fEdge) next = fEdge.target;
                    if(next) { this.processNode(next); return; }
                } else if (type === 'formulaNode') {
                     if (window.math) {
                         try {
                             const scope = { ...this.state.variables, score: this.state.score };
                             let res = window.math.evaluate(data.expression, scope);
                             if (data.decimalPlaces !== undefined) res = parseFloat(res.toFixed(data.decimalPlaces));
                             this.state.variables[data.variableName] = res;
                         } catch(e) { console.error(e); }
                    }
                } else if (type === 'goToNode') {
                    if(data.targetNodeId) next = data.targetNodeId;
                }
                if(!next && edge) next = edge.target;
                if(next) this.processNode(next);
            },
            
            parseMarkdown(text) {
                if(!text) return '';
                return text
                    .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
                    .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
                    .replace(/\\n/g, '<br>');
            },

            moveTimelineItem(index, delta) {
                const list = this.state.temp.timeline;
                const newIndex = index + delta;
                if (newIndex >= 0 && newIndex < list.length) {
                    [list[index], list[newIndex]] = [list[newIndex], list[index]];
                    this.renderTimelineUI();
                    sfx.chalk.play();
                }
            },
            
            renderTimelineUI() {
                 const container = document.getElementById('timeline-container-inner');
                 if(!container) return;
                 container.innerHTML = '';
                 this.state.temp.timeline.forEach((item, i) => {
                     const div = document.createElement('div');
                     div.className = 'timeline-item';
                     div.innerHTML = \`
                         <div class="timeline-ctrl">
                             <div class="timeline-btn" onclick="game.moveTimelineItem(\${i}, -1)">▲</div>
                             <div class="timeline-btn" onclick="game.moveTimelineItem(\${i}, 1)">▼</div>
                         </div>
                         <div class="timeline-text">\${item.text}</div>
                     \`;
                     container.appendChild(div);
                 });
            },

            renderNode(node) {
                const view = document.getElementById('game-view');
                view.innerHTML = '';
                const { type, data } = node;
                
                if(data.title || data.label) {
                    const title = document.createElement('h1');
                    title.innerHTML = this.parseMarkdown(data.title || data.label);
                    view.appendChild(title);
                }
                
                if(data.imageUrl) {
                    const imageFrame = document.createElement('div');
                    const image = document.createElement('img');
                    imageFrame.className = 'polaroid';
                    image.src = data.imageUrl;
                    image.alt = data.title || data.label || '';
                    image.style.cursor = 'zoom-in';
                    image.onclick = () => {
                        document.getElementById('lightbox-img').src = data.imageUrl;
                        document.getElementById('lightbox').style.display = 'flex';
                    };
                    imageFrame.appendChild(image);
                    view.appendChild(imageFrame);
                }

                if(data.description || data.question || data.message) {
                    const desc = document.createElement('div');
                    desc.className = 'md-content';
                    desc.innerHTML = this.parseMarkdown(data.description || data.question || data.message);
                    view.appendChild(desc);
                }
                
                // MathJax re-render trigger
                if (window.MathJax) {
                    window.MathJax.typesetPromise && window.MathJax.typesetPromise([view]);
                }

                // Interactive Elements
                const controls = document.createElement('div');
                controls.style.width = '100%';
                controls.style.marginTop = '30px';
                controls.style.display = 'flex';
                controls.style.flexDirection = 'column';
                controls.style.alignItems = 'center';
                controls.style.gap = '15px';

                const createBtn = (txt, cb) => {
                    const btn = document.createElement('button');
                    btn.className = 'chalk-btn';
                    btn.innerText = txt;
                    btn.onclick = () => { sfx.click.play(); cb(); };
                    return btn;
                };

                if(type === 'questionNode' || type === 'multipleChoiceNode') {
                     const isMulti = type === 'multipleChoiceNode';
                     if(isMulti) this.state.temp.selected = new Set();
                     
                     (data.answers || []).forEach(ans => {
                         const btn = createBtn(ans.text, () => {
                             if(isMulti) {
                                 if(this.state.temp.selected.has(ans.id)) { this.state.temp.selected.delete(ans.id); btn.style.background = 'transparent'; btn.style.color = 'white'; }
                                 else { this.state.temp.selected.add(ans.id); btn.style.background = 'rgba(255,255,255,0.2)'; btn.style.color = 'var(--chalk-yellow)'; }
                             } else {
                                 const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === ans.id);
                                 if(edge) this.processNode(edge.target);
                             }
                         });
                         controls.appendChild(btn);
                     });
                     
                     if(isMulti) {
                         const submit = createBtn(data.buttonText || 'Ответить', () => {
                             const correct = new Set(data.correctOptions || []);
                             const sel = this.state.temp.selected;
                             const isOk = correct.size === sel.size && [...sel].every(id => correct.has(id));
                             const handle = isOk ? 'correct' : 'incorrect';
                             const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle);
                             if(edge) this.processNode(edge.target);
                         });
                         submit.style.marginTop = '20px';
                         submit.style.borderColor = 'var(--chalk-green)';
                         controls.appendChild(submit);
                     }
                } else if (type === 'textInputNode') {
                    const input = document.createElement('input');
                    input.className = 'chalk-input';
                    input.placeholder = 'Ответ...';
                    controls.appendChild(input);
                    controls.appendChild(createBtn(data.buttonText || 'Проверить', () => {
                        const val = input.value.trim().toLowerCase();
                        const key = (data.keyword || '').toLowerCase();
                        const isOk = val.includes(key);
                        if(isOk) sfx.success.play(); else sfx.error.play();
                        const handle = isOk ? 'correct' : 'incorrect';
                        const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle);
                        if(edge) this.processNode(edge.target);
                    }));
                } else if (type === 'matchingNode') {
                     // Matching Logic
                     this.state.temp.matching = { left: null, right: null, pairs: [] };
                     const grid = document.createElement('div');
                     grid.className = 'match-grid';
                     
                     const renderMatches = () => {
                         grid.innerHTML = '';
                         const leftCol = document.createElement('div'); leftCol.className = 'match-col';
                         const rightCol = document.createElement('div'); rightCol.className = 'match-col';
                         
                         // Helper for items
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
                                     document.getElementById('lightbox-img').src = item.imageUrl;
                                     document.getElementById('lightbox').style.display = 'flex';
                                 };
                                 el.appendChild(image);
                             }
                             const label = document.createElement('span');
                             label.innerText = item.text || '';
                             el.appendChild(label);
                             if(!isMatched) el.onclick = () => {
                                 sfx.chalk.play();
                                 if(side === 'left') this.state.temp.matching.left = item.id; else this.state.temp.matching.right = item.id;
                                 if(this.state.temp.matching.left && this.state.temp.matching.right) {
                                     this.state.temp.matching.pairs.push({left: this.state.temp.matching.left, right: this.state.temp.matching.right});
                                     this.state.temp.matching.left = null; this.state.temp.matching.right = null;
                                 }
                                 renderMatches();
                             };
                             return el;
                         };
                         
                         (data.leftColumn||[]).forEach(i => leftCol.appendChild(createItem(i, 'left')));
                         (data.rightColumn||[]).forEach(i => rightCol.appendChild(createItem(i, 'right')));
                         grid.appendChild(leftCol); grid.appendChild(rightCol);
                     };
                     renderMatches();
                     controls.appendChild(grid);
                     
                     controls.appendChild(createBtn(data.buttonText || 'Готово', () => {
                         const user = this.state.temp.matching.pairs;
                         const correct = data.correctPairs || [];
                         const isOk = user.length === correct.length && correct.every(c => user.some(u => u.left === c.leftId && u.right === c.rightId));
                         if(isOk) sfx.success.play(); else sfx.error.play();
                         const handle = isOk ? 'correct' : 'incorrect';
                         const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle);
                         if(edge) this.processNode(edge.target);
                     }));
                } else if (type === 'timelineNode') {
                     // Timeline Logic
                     if (!this.state.temp.timeline || this.state.temp.timelineNodeId !== node.id) {
                         this.state.temp.timeline = shuffle([...(data.events || [])]);
                         this.state.temp.timelineNodeId = node.id;
                     }
                     const container = document.createElement('div');
                     container.id = 'timeline-container-inner';
                     container.className = 'timeline-container';
                     controls.appendChild(container);
                     this.renderTimelineUI();
                     
                     controls.appendChild(createBtn(data.buttonText || 'Проверить', () => {
                         const current = this.state.temp.timeline.map(t => t.id);
                         const correct = (data.events || []).map(t => t.id);
                         const isOk = JSON.stringify(current) === JSON.stringify(correct);
                         if(isOk) sfx.success.play(); else sfx.error.play();
                         const handle = isOk ? 'correct' : 'incorrect';
                         const edge = quizData.edges.find(e => e.source === node.id && e.sourceHandle === handle);
                         if(edge) this.processNode(edge.target);
                     }));
                } else if (type === 'allocatorNode') {
                     const total = data.maxTotal || 100;
                     const container = document.createElement('div');
                     container.className = 'allocator-container';
                     
                     (data.items || []).forEach(item => {
                         if(this.state.variables[item.variableName] === undefined) this.state.variables[item.variableName] = item.defaultValue || 0;
                         const div = document.createElement('div');
                         div.className = 'allocator-item';
                         div.innerHTML = \`
                             <div class="allocator-header"><span>\${item.label}</span><span id="val-\${item.id}">\${this.state.variables[item.variableName]}</span></div>
                             <input type="range" class="chalk-range" min="0" max="\${total}" value="\${this.state.variables[item.variableName]}" 
                             oninput="game.state.variables['\${item.variableName}'] = parseInt(this.value); document.getElementById('val-\${item.id}').innerText = this.value; game.updateHUD();">
                         \`;
                         container.appendChild(div);
                     });
                     controls.appendChild(container);
                     controls.appendChild(createBtn(data.buttonText || 'Далее', () => {
                         const edge = quizData.edges.find(e => e.source === node.id);
                         if(edge) this.processNode(edge.target);
                     }));
                } else if (type === 'resultNode') {
                     if(data.showScore) {
                         const score = document.createElement('div');
                         score.className = 'score-circle';
                         score.style.margin = '20px auto';
                         score.innerText = this.state.score;
                         view.appendChild(score);
                     }
                     sfx.success.play();
                     confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                     controls.appendChild(createBtn('Заново', () => location.reload()));
                } else {
                     controls.appendChild(createBtn(data.buttonText || 'Далее', () => {
                         const edge = quizData.edges.find(e => e.source === node.id);
                         if(edge) this.processNode(edge.target);
                     }));
                }

                view.appendChild(controls);
            }
        };

        window.onload = () => game.init();
        window.game = game;
    </script>
</body>
</html>
`;
export default mathTemplate;
