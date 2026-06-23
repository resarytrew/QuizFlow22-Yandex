
const yandexTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Квиз — Яндекс Учебник</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #FF5C00;
            --primary-hover: #E54D00;
            --bg-page: #F5F7F8;
            --text-main: #1A1D22;
            --text-muted: #707684;
            --border-light: #E6E8EB;
            --card-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            --font-main: 'Inter', sans-serif;
            --font-heading: 'Plus Jakarta Sans', sans-serif;
        }

        /* Utilities */
        .hidden { display: none !important; }

        body {
            font-family: var(--font-main);
            background-color: var(--bg-page);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Header Styles */
        .header-glass {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border-light);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .logo-box {
            width: 36px;
            height: 36px;
            background: #000;
            color: #fff;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-family: var(--font-heading);
        }

        /* Layout Grid */
        .quiz-container {
            max-width: 1100px;
            margin: 0 auto;
            padding: 32px 24px 120px;
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 32px;
            width: 100%;
        }

        @media (max-width: 900px) {
            .quiz-container { grid-template-columns: 1fr; }
            .sidebar { display: none; }
        }

        /* Cards */
        .content-card {
            background: #FFFFFF;
            border-radius: 24px;
            padding: 40px;
            border: 1px solid var(--border-light);
            box-shadow: var(--card-shadow);
        }

        /* Progress Bar */
        .progress-track { background: #EDEEF0; height: 6px; border-radius: 100px; overflow: hidden; }
        .progress-fill { background: var(--primary); height: 100%; transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }

        /* Typography */
        h2.quiz-title { font-family: var(--font-heading); font-weight: 700; font-size: 28px; line-height: 1.3; color: var(--text-main); margin-bottom: 16px; }
        .quiz-description { font-size: 17px; line-height: 1.6; color: var(--text-muted); margin-bottom: 24px; }

        /* Answer Options (Engine Output) */
        .options-grid { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }

        .option {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 18px 24px;
            background: #FFFFFF;
            border: 1px solid var(--border-light);
            border-radius: 16px;
            text-align: left;
            transition: all 0.2s ease;
            cursor: pointer;
            font-weight: 500;
            position: relative;
        }

        .option:hover {
            border-color: var(--primary);
            background: #FFF9F5;
            transform: translateY(-1px);
        }

        .option.selected {
            border-color: var(--primary);
            background: #FFF4ED;
            box-shadow: 0 0 0 1px var(--primary);
        }

        .option-key {
            width: 28px;
            height: 28px;
            background: #F2F3F5;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 700;
            color: var(--text-muted);
            flex-shrink: 0;
        }

        .option.selected .option-key {
            background: var(--primary);
            color: #FFFFFF;
        }

        /* Sidebar Elements */
        .metric-tile {
            background: #FFFFFF;
            border: 1px solid var(--border-light);
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 16px;
        }

        .metric-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }
        .metric-value { font-size: 24px; font-weight: 800; font-family: var(--font-heading); color: var(--text-main); }

        /* Action Bar */
        .action-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(20px);
            border-top: 1px solid var(--border-light);
            padding: 20px 0;
            z-index: 100;
        }

        /* Engine Buttons */
        .btn, .btn-primary, .btn-secondary {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            background: var(--primary);
            color: #FFFFFF;
            font-weight: 700;
            padding: 14px 40px;
            border-radius: 14px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 14px rgba(255, 92, 0, 0.2);
            border: none;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
            margin-top: 24px;
        }

        .btn:hover, .btn-primary:hover {
            background: var(--primary-hover);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 92, 0, 0.3);
        }
        
        .btn-secondary {
            background: #F2F3F5;
            color: var(--text-main);
            box-shadow: none;
        }
        .btn-secondary:hover {
            background: #E6E8EB;
            box-shadow: none;
        }

        /* Inputs */
        .input-group { margin-bottom: 20px; }
        .input-label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text-muted); }
        .input-field {
            width: 100%;
            padding: 14px 16px;
            background: #F9FAFB;
            border: 1px solid var(--border-light);
            border-radius: 14px;
            font-size: 16px;
            transition: all 0.2s;
        }
        .input-field:focus {
            outline: none;
            border-color: var(--primary);
            background: #FFF;
            box-shadow: 0 0 0 3px rgba(255, 92, 0, 0.1);
        }

        /* Image Handling */
        .node-image-container {
            border-radius: 20px;
            overflow: hidden;
            background: #F9FAFB;
            border: 1px solid var(--border-light);
            margin-bottom: 24px;
            display: flex;
            justify-content: center;
        }

        .node-image {
            width: 100%;
            max-height: 400px;
            object-fit: contain;
            display: block;
        }

        /* Complex Node Styles */
        .matching-container { margin-top: 20px; }
        .match-card {
            background: #fff; border: 1px solid var(--border-light);
            border-radius: 14px; padding: 16px;
            cursor: pointer; transition: all 0.2s; font-weight: 500;
            margin-bottom: 8px;
        }
        .match-card:hover { border-color: var(--primary); background: #FFF9F5; }
        .match-card.selected { border-color: var(--primary); background: #FFF4ED; box-shadow: 0 0 0 1px var(--primary); }
        .match-card.matched { border-color: #10B981; color: #10B981; background: #ECFDF5; opacity: 0.8; pointer-events: none; }

        .timeline-item {
            background: #fff; border: 1px solid var(--border-light);
            border-radius: 14px; padding: 12px 16px;
            margin-bottom: 8px; font-weight: 500;
            display: flex; align-items: center; gap: 12px;
        }

        /* Animations */
        .fade-slide-in { animation: fadeSlide 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        @keyframes fadeSlide {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        #image-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 2000; display: none; align-items: center; justify-content: center; padding: 24px; cursor: pointer; }
        #image-modal.open { display: flex; }
    </style>
</head>
<body>
    <header class="header-glass">
        <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <div id="header-logo" class="logo-box">Я</div>
                <div>
                    <div id="header-title" class="font-bold text-lg leading-none mb-1">Учебник</div>
                    <div class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Образовательный Поток</span>
                    </div>
                </div>
            </div>
            
            <div id="global-timer-container" class="hidden px-4 py-2 bg-gray-100 rounded-xl border border-gray-200 font-bold font-mono text-gray-600">00:00</div>
        </div>
    </header>

    <div class="max-w-7xl mx-auto w-full px-6 pt-6">
        <div class="flex items-center gap-4 mb-2">
            <div class="flex-1 progress-track"><div id="progress-bar" class="progress-fill" style="width: 0%"></div></div>
            <div class="text-[13px] font-bold text-gray-400"><span id="current-step">0</span>%</div>
        </div>
    </div>

    <main class="quiz-container">
        <div id="quiz-view" class="content-card fade-slide-in">
            <!-- Content will be injected here -->
        </div>

        <aside class="sidebar">
            <div class="metric-tile">
                <div class="metric-label mb-1">Текущий счет</div>
                <div id="hud-score" class="metric-value">0</div>
            </div>
            <div class="metric-tile">
                <div class="metric-label mb-1">Ученик</div>
                <div id="hud-name" class="font-bold truncate text-gray-700">Гость</div>
            </div>
            
            <!-- Metrics Container for Engine variables -->
            <div id="metrics-container" class="space-y-3 mt-4"></div>
            
            <!-- Hidden Elements for Engine -->
            <div id="history-list" class="hidden"></div>
        </aside>
    </main>

    <!-- Loading Screen -->
    <div id="loading-screen" style="position:fixed; inset:0; background:#fff; z-index:9999; display:flex; align-items:center; justify-content:center;">
        <div style="font-size: 24px; font-weight: 800;">
            <span style="color:#FF5C00">Я</span>Учебник...
        </div>
    </div>

    <div id="image-modal" aria-hidden="true">
        <img id="modal-img-src" class="max-w-full max-h-full rounded-2xl shadow-2xl" />
    </div>

    <div id="lightbox">
        <img id="lightbox-img" src="" alt="" />
    </div>

    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js" integrity="sha384-D1EB0F6891FE17D7AFA7696C258377E925BB5E445B698BE2BB217E3E99DB8C35C10BD8B50961A22721AB5C2CA2C86A99" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.min.js" integrity="sha384-4373D3C40FD427C0A09AD7647B286C33F34FC104F30FC33302FC105BE048DF37354FC7DD1A278F3FC54DE83E12C657A0" crossorigin="anonymous"></script>
    <script>%%QUIZ_SCRIPT%%</script>
</body>
</html>
`;
export default yandexTemplate;
