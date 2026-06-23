const economicTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Интерактивный квиз</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&family=Tektur:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #0A0F1A;
            --grid-line: rgba(0, 255, 255, 0.08);
            --text-primary: #E0E0E0;
            --text-secondary: #8899A6;

            --glow-green: #00FF00;
            --glow-cyan: #00FFFF;
            --glow-magenta: #FF00FF;
            --glow-yellow: #FFFF00;

            --border-green: rgba(0, 255, 0, 0.4);
            --border-cyan: rgba(0, 255, 255, 0.4);
            --border-magenta: rgba(255, 0, 255, 0.4);

            --font-display: 'Tektur', sans-serif;
            --font-body: 'Roboto Mono', monospace;

            --shadow-green: 0 0 12px 2px rgba(0, 255, 0, 0.3);
            --shadow-cyan: 0 0 12px 2px rgba(0, 255, 255, 0.3);
            --shadow-magenta: 0 0 12px 2px rgba(255, 0, 255, 0.3);
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; border: 0; }
        html { scroll-behavior: smooth; font-size: 16px; line-height: 1.5; }

        body {
            font-family: var(--font-body);
            background-color: var(--bg-dark);
            color: var(--text-primary);
            background-image: 
                linear-gradient(var(--grid-line) 1px, transparent 1px),
                linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
            background-size: 40px 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 2rem;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        #quiz-container {
            width: 100%;
            max-width: 1400px;
            height: calc(100vh - 4rem);
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-display);
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .panel {
            background: rgba(10, 15, 26, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid;
            padding: 1rem;
        }

        /* Layout */
        #metrics-dashboard-container {
            display: flex;
            gap: 1rem;
            justify-content: space-between;
        }
        #main-content {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 1rem;
            flex-grow: 1;
            min-height: 0;
        }
        #mission-panel {
            grid-column: 1 / 2;
            border-color: var(--border-green);
            box-shadow: var(--shadow-green);
            display: flex;
            flex-direction: column;
        }
        #sidebar {
            grid-column: 2 / 3;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            min-height: 0;
        }
        
        /* Metrics Header */
        .metric-item {
            flex: 1;
            background: rgba(10, 15, 26, 0.8);
            border: 1px solid var(--border-magenta);
            box-shadow: var(--shadow-magenta);
            padding: 0.75rem 1rem;
            text-align: center;
        }
        .metric-label {
            font-size: 0.8rem;
            color: var(--text-secondary);
            text-transform: uppercase;
        }
        .metric-value {
            font-family: var(--font-display);
            font-size: 2rem;
            font-weight: 700;
            color: var(--glow-magenta);
            text-shadow: 0 0 8px var(--glow-magenta);
        }

        /* Mission Panel (Left) */
        #mission-panel h2 {
            font-size: 2.5rem;
            color: var(--glow-green);
            text-shadow: 0 0 8px var(--glow-green);
            margin-bottom: 0.5rem;
        }
        #mission-panel h3 {
            font-size: 1rem;
            color: var(--text-primary);
            margin-bottom: 1rem;
        }
        #mission-progress-container {
            width: 100%;
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid var(--border-green);
            padding: 2px;
            margin: 1rem 0;
            position: relative;
            height: 14px;
        }
        #mission-progress-bar {
            width: 0%;
            height: 10px;
            background: var(--glow-green);
            box-shadow: var(--shadow-green);
            transition: width 0.5s ease;
        }
        #mission-progress-container span {
            position: absolute;
            right: 5px;
            top: -2px;
            font-size: 0.7rem;
            color: var(--glow-green);
        }
        #quiz-view { flex-grow: 1; overflow-y: auto; padding-right: 1rem; }

        /* Sidebar Panels (Right) */
        #navigator-panel {
            border-color: var(--border-magenta);
            box-shadow: var(--shadow-magenta);
        }
        #statistics-panel {
            border-color: var(--border-cyan);
            box-shadow: var(--shadow-cyan);
        }
        #achievements-panel-container { /* Renamed for clarity */
            border-color: var(--border-green);
            box-shadow: var(--shadow-green);
            flex-grow: 1;
        }
        .sidebar-title {
            font-size: 1.2rem;
            margin-bottom: 1rem;
            color: var(--glow-cyan);
            text-shadow: 0 0 8px var(--glow-cyan);
        }
        #navigator-panel .sidebar-title { color: var(--glow-magenta); text-shadow: 0 0 8px var(--glow-magenta); }
        #achievements-panel-container .sidebar-title { color: var(--glow-green); text-shadow: 0 0 8px var(--glow-green); }

        /* Navigator Panel */
        .navigator-content { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
        #navigator-avatar { width: 80px; height: 80px; border-radius: 50%; border: 2px solid var(--glow-cyan); object-fit: cover; }
        #navigator-message { background: rgba(0,0,0,0.2); padding: 0.75rem; font-size: 0.9rem; flex: 1; }
        #timer-display {
            font-family: var(--font-display);
            font-size: 2.5rem;
            text-align: center;
            color: var(--glow-magenta);
            text-shadow: 0 0 10px var(--glow-magenta);
            background: rgba(255, 0, 255, 0.1);
            border: 1px solid var(--border-magenta);
            padding: 0.5rem;
        }

        /* Statistics Panel */
        .stat-input-group { margin-bottom: 1rem; }
        .stat-input-group label { display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; }
        .stat-input {
            width: 100%;
            background: rgba(0,0,0,0.3);
            border: 1px solid var(--border-cyan);
            padding: 0.5rem;
            color: var(--text-primary);
            font-family: var(--font-body);
        }
        .stat-actions { display: flex; justify-content: space-around; margin-top: 1rem; }
        .stat-actions button { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.5rem; }
        .stat-actions button:hover { color: var(--glow-cyan); }

        /* Achievements Panel */
        #achievements-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .achievement-item {
            background: rgba(0,0,0,0.2);
            border: 1px solid #30363d;
            padding: 0.75rem;
            text-align: center;
            transition: all 0.3s;
        }
        .achievement-item.locked { filter: grayscale(1) brightness(0.5); }
        .achievement-item.unlocked { border-color: var(--border-green); box-shadow: var(--shadow-green); }
        .achievement-item .icon { font-size: 2rem; }
        .achievement-item .title { font-size: 0.9rem; font-weight: bold; margin-top: 0.5rem; }
        .achievement-item .desc { font-size: 0.7rem; color: var(--text-secondary); }

        /* Quiz elements */
        .answer-grid { display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem; }
        .answer-card, .mcq-card {
            background: rgba(0, 255, 0, 0.05);
            border: 1px solid var(--border-green);
            padding: 1rem;
            cursor: pointer;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .answer-card:hover, .mcq-card:hover { background: rgba(0, 255, 0, 0.15); }
        
        .answer-card > span:first-of-type {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 1px solid var(--border-green);
            flex-shrink: 0;
        }

        .answer-card:hover > span:first-of-type {
            background: var(--glow-green);
        }

        .mcq-card .checkbox-custom {
            width: 20px; height: 20px; border: 1px solid var(--border-green); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .mcq-card.selected .checkbox-custom { background: var(--glow-green); }
        .mcq-card.selected { background: rgba(0, 255, 0, 0.2); }
        
        .btn {
            background: #0f3d0f;
            color: var(--glow-green);
            border: 1px solid var(--border-green);
            padding: 0.75rem 1.5rem;
            font-family: var(--font-display);
            font-size: 1.1rem;
            cursor: pointer;
            margin-top: 1.5rem;
            transition: all 0.2s;
            box-shadow: var(--shadow-green);
        }
        .btn:hover {
            background: var(--glow-green);
            color: var(--bg-dark);
            text-shadow: none;
        }
    </style>
</head>
<body>
    <div id="quiz-container">
        <header id="metrics-dashboard-container">
            <!-- This will be populated by the quiz engine -->
        </header>

        <main id="main-content">
            <div id="mission-panel" class="panel">
                 <div id="quiz-header">
                    <!-- Dynamic content here -->
                 </div>
                 <div id="quiz-view">
                    <!-- Dynamic question/answer content here -->
                 </div>
            </div>
            <div id="sidebar">
                <div id="navigator-panel" class="panel">
                    <h3 class="sidebar-title">Навигатор Миссии</h3>
                    <div class="navigator-content">
                        <img id="navigator-avatar" src="https://i.postimg.cc/Fs5p2F2B/avatar.png" alt="Navigator">
                        <p id="navigator-message">Приветствую, Командир! Наша экономика в критическом состоянии. Сделайте свой ход.</p>
                    </div>
                    <div id="timer-display">00:00</div>
                </div>
                <div id="statistics-panel" class="panel">
                    <h3 class="sidebar-title">Статистика Влияния</h3>
                    <div class="stat-input-group">
                        <label for="gdp-forecast">Прогнозируемый рост ВВП, %</label>
                        <input type="text" id="gdp-forecast" class="stat-input" value="0.0" readonly>
                    </div>
                    <div class="stat-input-group">
                        <label for="unemployment-target">Целевой уровень безработицы, %</label>
                        <input type="text" id="unemployment-target" class="stat-input" value="0.0" readonly>
                    </div>
                    <div class="stat-actions">
                        <button title="Инфляция">📈</button>
                        <button title="Рынок">💹</button>
                    </div>
                </div>
                <div id="achievements-panel-container" class="panel">
                    <h3 class="sidebar-title">Записи Миссии</h3>
                    <div id="achievements-grid">
                        <div class="achievement-item locked" data-achievement-title="Первый шаг">
                            <div class="icon">🥇</div>
                            <div class="title">"Первый шаг"</div>
                            <div class="desc">Завершить 1 раунд</div>
                        </div>
                        <div class="achievement-item locked" data-achievement-title="Эксперт">
                            <div class="icon">🛡️</div>
                            <div class="title">"Эксперт"</div>
                            <div class="desc">5 правильных ответов</div>
                        </div>
                        <div class="achievement-item locked" data-achievement-title="Стратег">
                            <div class="icon">♟️</div>
                            <div class="title">"Стратег"</div>
                            <div class="desc">Верный прогноз</div>
                        </div>
                        <div class="achievement-item locked" data-achievement-title="Визионер">
                            <div class="icon">🔮</div>
                            <div class="title">"Визионер"</div>
                            <div class="desc">Все раунды</div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
    
    <div id="image-modal" style="display:none;">
        <img id="modal-img-src" src="" alt="Zoomed image" />
    </div>
    
    <div id="achievements-panel"></div>
    <canvas id="fireworks-canvas"></canvas>

    <script>%%QUIZ_SCRIPT%%</script>
</body>
</html>
`;

export default economicTemplate;
