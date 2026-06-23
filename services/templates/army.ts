
const armyTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Военно-исторический квиз</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" integrity="sha384-1C01FBF57751BC7AFA6B1546878C505950A9D7891C777D9B364E17BB4B070C7B45438DA7E8100CF3292F078EDD1B3E83" crossorigin="anonymous"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.min.js" integrity="sha384-4373D3C40FD427C0A09AD7647B286C33F34FC104F30FC33302FC105BE048DF37354FC7DD1A278F3FC54DE83E12C657A0" crossorigin="anonymous"><\/script>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Playfair+Display:wght@400;700&family=Old+Standard+TT:wght@400;700&family=Courier+Prime:wght@400;700&family=Ruslan+Display&family=Cinzel:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --olive-dark: #3d4a2d;
            --olive-medium: #586c48;
            --olive-light: #7a8b69;
            --gold-frame: #cba353;
            --gold-dark: #967432;
            --gold-bright: #d4af37;
            --parchment: #eaddcf;
            --paper-light: rgba(247, 243, 232, 0.92);
            --text-dark: #2b241e;
            --red-seal: #8a1c1c;
            --red-soviet: #cc0000;
            --medal-bronze: #cd7f32;
            --medal-silver: #c0c0c0;
            --medal-gold: #ffd700;
            --star-red: #c41e3a;
        }
        
        body {
            font-family: 'Old Standard TT', serif;
            background-color: #2a2a28;
            background-image: 
                url("https://www.transparenttextures.com/patterns/dark-leather.png"),
                linear-gradient(135deg, #3d4a2d 0%, #2a2a28 50%, #1a1a18 100%);
            background-attachment: fixed;
            color: var(--text-dark);
            height: 100vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        
        .custom-cursor { 
            cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23cba353' stroke='%232b241e' stroke-width='1'%3E%3Cpath d='M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z'/%3E%3C/svg%3E"), auto; 
        }
        
        /* Орнаментированные панели */
        .ornate-box { 
            background: var(--paper-light); 
            border: 3px solid var(--gold-frame); 
            border-radius: 8px; 
            position: relative; 
            box-shadow: 
                0 4px 20px rgba(0,0,0,0.4), 
                inset 0 0 60px rgba(165, 142, 100, 0.15),
                0 0 0 1px rgba(203, 163, 83, 0.3);
            backdrop-filter: blur(8px);
        }
        
        .ornate-box::before { 
            content: ''; 
            position: absolute; 
            top: 4px; left: 4px; right: 4px; bottom: 4px; 
            border: 1px solid var(--gold-dark); 
            pointer-events: none; 
            border-radius: 5px; 
        }
        
        .ornate-box::after {
            content: '';
            position: absolute;
            top: 8px; left: 8px; right: 8px; bottom: 8px;
            border: 1px dashed rgba(203, 163, 83, 0.3);
            pointer-events: none;
            border-radius: 3px;
        }
        
        /* Угловые орнаменты */
        .ornate-corner { 
            position: absolute; 
            width: 28px; 
            height: 28px; 
            z-index: 10;
            opacity: 0.9;
        }
        .ornate-corner svg { width: 100%; height: 100%; }
        .oc-tl { top: -2px; left: -2px; } 
        .oc-tr { top: -2px; right: -2px; transform: rotate(90deg); } 
        .oc-br { bottom: -2px; right: -2px; transform: rotate(180deg); } 
        .oc-bl { bottom: -2px; left: -2px; transform: rotate(270deg); }
        
        /* Военные кнопки */
        .military-btn { 
            background: linear-gradient(180deg, #5a6b4a 0%, #3d4a2d 50%, #2d3a1d 100%); 
            border: 2px solid var(--gold-frame); 
            color: #f0e6d3; 
            font-family: 'Cinzel', serif; 
            text-transform: uppercase; 
            letter-spacing: 0.12em; 
            padding: 12px 28px; 
            border-radius: 4px; 
            box-shadow: 
                0 4px 8px rgba(0,0,0,0.4), 
                inset 0 1px 0 rgba(255,255,255,0.15),
                inset 0 -2px 0 rgba(0,0,0,0.2);
            text-shadow: 0 2px 3px rgba(0,0,0,0.6); 
            transition: all 0.2s; 
            cursor: pointer; 
            position: relative;
            overflow: hidden;
        }
        
        .military-btn::before {
            content: '';
            position: absolute;
            top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            transition: left 0.4s;
        }
        
        .military-btn:hover::before { left: 100%; }
        
        .military-btn:hover { 
            background: linear-gradient(180deg, #6a7b5a 0%, #4d5a3d 50%, #3d4a2d 100%); 
            transform: translateY(-2px); 
            box-shadow: 0 6px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        
        .military-btn:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .military-btn.red {
            background: linear-gradient(180deg, #9a2c2c 0%, #7a1c1c 50%, #5a0c0c 100%);
        }
        
        .military-btn.red:hover {
            background: linear-gradient(180deg, #aa3c3c 0%, #8a2c2c 50%, #6a1c1c 100%);
        }
        
        .military-btn.secondary {
            background: linear-gradient(180deg, #8a7a6a 0%, #6a5a4a 50%, #4a3a2a 100%);
        }
        
        /* Военные поля ввода */
        .military-input { 
            width: 100%; 
            background: rgba(255, 253, 245, 0.95); 
            border: 2px solid var(--olive-medium);
            border-bottom-width: 4px;
            padding: 12px 15px; 
            font-family: 'Courier Prime', monospace; 
            font-size: 1.1rem; 
            color: #2b241e; 
            border-radius: 4px; 
            outline: none; 
            box-shadow: inset 0 2px 6px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        
        .military-input:focus { 
            border-color: var(--gold-frame); 
            background: #fff;
            box-shadow: 0 0 0 3px rgba(203, 163, 83, 0.2), inset 0 2px 6px rgba(0,0,0,0.05);
        }
        
        .military-slider { 
            -webkit-appearance: none; 
            width: 100%; 
            height: 10px; 
            background: linear-gradient(180deg, #4a4a4a, #3a3a3a);
            border-radius: 5px; 
            outline: none; 
            margin: 12px 0;
            border: 1px solid #5a5a5a;
        }
        
        .military-slider::-webkit-slider-thumb { 
            -webkit-appearance: none; 
            width: 26px; 
            height: 26px; 
            border-radius: 50%; 
            background: linear-gradient(135deg, #cc0000 0%, #8a0000 100%);
            border: 3px solid var(--gold-frame); 
            cursor: pointer; 
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            transition: transform 0.2s;
        }
        
        .military-slider::-webkit-slider-thumb:hover {
            transform: scale(1.15);
        }
        
        /* Контейнер приложения */
        .app-container { 
            max-width: 1500px; 
            margin: 0 auto; 
            height: 100%; 
            display: flex; 
            flex-direction: column; 
            padding: 12px; 
        }
        
        /* Шапка */
        .top-header { 
            background: 
                linear-gradient(180deg, rgba(253, 251, 247, 0.98) 0%, rgba(240, 235, 220, 0.95) 100%);
            border-bottom: 5px solid var(--olive-dark); 
            padding: 18px 50px; 
            position: relative; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            box-shadow: 0 6px 20px rgba(0,0,0,0.3); 
            margin-bottom: 12px; 
            flex-shrink: 0;
        }
        
        .top-header::before {
            content: '';
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 3px;
            background: linear-gradient(90deg, transparent, var(--gold-frame), transparent);
        }
        
        /* Звезда */
        .soviet-star {
            width: 50px;
            height: 50px;
            position: absolute;
            left: 30px;
            top: 50%;
            transform: translateY(-50%);
        }
        
        .soviet-star-right {
            right: 30px;
            left: auto;
        }
        
        /* Прогресс-бар */
        .progress-ribbon { 
            background: 
                linear-gradient(180deg, #4a5a3a 0%, #3a4a2a 50%, #2a3a1a 100%);
            padding: 14px 25px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 25px; 
            border: 2px solid var(--olive-light);
            box-shadow: 
                0 4px 10px rgba(0,0,0,0.3),
                inset 0 1px 0 rgba(255,255,255,0.1);
            margin-bottom: 15px; 
            border-radius: 4px; 
            color: #eaddcf; 
            flex-shrink: 0;
        }
        
        .progress-label {
            font-family: 'Cinzel', serif;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            font-size: 0.85rem;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        
        .top-progress-bar-bg { 
            width: 50%; 
            max-width: 500px; 
            height: 16px; 
            background: rgba(20, 25, 15, 0.8); 
            border: 2px solid var(--olive-light);
            border-radius: 8px; 
            position: relative; 
            overflow: hidden; 
            box-shadow: inset 0 3px 8px rgba(0,0,0,0.6);
        }
        
        .top-progress-fill { 
            height: 100%; 
            background: linear-gradient(180deg, #d4af37 0%, #b8860b 50%, #8b6914 100%);
            width: 0%; 
            transition: width 0.6s ease-out;
            border-radius: 6px;
            box-shadow: 0 0 15px rgba(212, 175, 55, 0.5);
            position: relative;
        }
        
        .top-progress-fill::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 50%;
            background: linear-gradient(180deg, rgba(255,255,255,0.3), transparent);
            border-radius: 6px 6px 0 0;
        }
        
        /* Основная сетка */
        .main-grid { 
            display: grid; 
            grid-template-columns: 300px minmax(600px, 1fr) 320px; 
            gap: 20px; 
            flex: 1; 
            overflow: hidden; 
            padding-bottom: 12px; 
            min-height: 0;
        }
        
        /* Боковые панели */
        .journal-panel { 
            display: flex; 
            flex-direction: column; 
            height: 100%; 
            gap: 12px;
        }
        
        .panel-header { 
            text-align: center; 
            border-bottom: 2px solid var(--gold-dark); 
            padding: 12px; 
            font-family: 'Cinzel', serif;
            font-weight: 700; 
            text-transform: uppercase; 
            letter-spacing: 0.15em;
            font-size: 0.9rem;
            background: linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.06));
            color: var(--olive-dark);
            position: relative;
        }
        
        .panel-header::after {
            content: '★';
            position: absolute;
            left: 50%;
            bottom: -10px;
            transform: translateX(-50%);
            font-size: 0.7rem;
            color: var(--gold-frame);
            background: var(--paper-light);
            padding: 0 8px;
        }
        
        .journal-scroll { 
            background: rgba(255, 255, 255, 0.6); 
            flex: 1; 
            overflow-y: auto; 
            padding: 20px; 
            box-shadow: inset 0 0 30px rgba(0,0,0,0.08);
            font-family: 'Courier Prime', monospace; 
            font-size: 0.88rem;
        }
        
        /* Статус-строки */
        .status-section {
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(203, 163, 83, 0.3);
        }
        
        .status-section:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        
        .status-section-title {
            font-family: 'Cinzel', serif;
            font-size: 0.75rem;
            color: var(--olive-dark);
            text-transform: uppercase;
            letter-spacing: 0.15em;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .status-section-title::before,
        .status-section-title::after {
            content: '';
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--gold-frame), transparent);
        }
        
        .status-row { 
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            font-size: 0.85rem;
        }
        
        .status-label { 
            color: #666;
            font-size: 0.8rem;
        }
        
        .status-value { 
            font-weight: bold;
            color: var(--text-dark);
        }
        
        .status-value.highlight {
            color: var(--red-seal);
        }
        
        /* Профиль офицера */
        .profile-panel { 
            text-align: center; 
            padding: 20px; 
            height: 100%; 
            overflow-y: auto;
        }
        
        .avatar-frame { 
            width: 130px; 
            height: 130px; 
            border-radius: 50%; 
            border: 5px solid var(--gold-frame);
            margin: 0 auto 12px; 
            overflow: hidden; 
            background: rgba(255,255,255,0.9);
            box-shadow: 
                0 0 0 3px var(--olive-dark),
                0 6px 20px rgba(0,0,0,0.4);
            position: relative;
        }
        
        .avatar-frame::before {
            content: '';
            position: absolute;
            inset: -3px;
            border: 2px dashed var(--gold-dark);
            border-radius: 50%;
            opacity: 0.5;
        }
        
        .avatar-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .rank-badge { 
            display: inline-block;
            background: linear-gradient(180deg, #cc0000 0%, #8a0000 100%);
            color: #fff;
            padding: 5px 18px;
            border-radius: 20px;
            font-family: 'Cinzel', serif;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            border: 2px solid var(--gold-frame);
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            margin-top: 8px;
        }
        
        .player-name {
            font-family: 'Playfair Display', serif;
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--text-dark);
            margin: 12px 0 5px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .player-title {
            font-family: 'Cormorant Garamond', serif;
            font-size: 0.95rem;
            color: #666;
            font-style: italic;
        }
        
        /* Медали */
        .medals-section {
            margin: 15px 0;
            padding: 12px;
            background: rgba(0,0,0,0.03);
            border-radius: 8px;
            border: 1px solid rgba(203, 163, 83, 0.2);
        }
        
        .medals-title {
            font-family: 'Cinzel', serif;
            font-size: 0.7rem;
            color: var(--olive-dark);
            text-transform: uppercase;
            letter-spacing: 0.15em;
            margin-bottom: 10px;
        }
        
        .medals-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
        }
        
        .medal {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--medal-gold), #b8860b);
            border: 2px solid #8b6914;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: help;
            transition: transform 0.2s;
        }
        
        .medal:hover {
            transform: scale(1.15);
        }
        
        /* Ресурсы */
        .resources-section {
            margin-top: 15px;
            text-align: left;
        }
        
        .resource-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: rgba(255,255,255,0.5);
            border-radius: 6px;
            margin-bottom: 6px;
            border-left: 3px solid var(--gold-frame);
        }
        
        .resource-label {
            font-size: 0.85rem;
            color: #555;
        }
        
        .resource-value {
            font-family: 'Courier Prime', monospace;
            font-weight: bold;
            font-size: 1.1rem;
            color: var(--red-seal);
        }
        
        /* Контент */
        .content-panel { 
            display: flex; 
            flex-direction: column; 
            overflow: hidden; 
            height: 100%;
            background: linear-gradient(180deg, rgba(255,253,245,0.95), rgba(247,243,232,0.9));
        }
        
        .content-scroll { 
            padding: 35px 45px; 
            overflow-y: auto; 
            height: 100%;
        }
        
        /* Заголовок узла */
        .node-title {
            font-family: 'Playfair Display', serif;
            font-size: 2.2rem;
            color: var(--text-dark);
            text-align: center;
            margin-bottom: 25px;
            position: relative;
            padding-bottom: 20px;
        }
        
        .node-title::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 120px;
            height: 3px;
            background: linear-gradient(90deg, transparent, var(--gold-frame), transparent);
        }
        
        /* Изображения */
        .node-image-container {
            max-width: 600px;
            margin: 0 auto 30px;
            position: relative;
            cursor: zoom-in;
        }
        
        .node-image-frame {
            position: relative;
            border: 4px solid var(--gold-frame);
            border-radius: 8px;
            overflow: hidden;
            background: #1a1a1a;
            box-shadow: 
                0 8px 30px rgba(0,0,0,0.4),
                inset 0 0 0 2px rgba(255,255,255,0.1);
            transition: all 0.4s ease;
        }
        
        .node-image-frame:hover {
            transform: scale(1.02);
            box-shadow: 
                0 12px 40px rgba(0,0,0,0.5),
                0 0 0 4px var(--gold-bright),
                inset 0 0 0 2px rgba(255,255,255,0.2);
        }
        
        .node-image-frame::before {
            content: '';
            position: absolute;
            top: 6px; left: 6px; right: 6px; bottom: 6px;
            border: 1px solid rgba(203, 163, 83, 0.4);
            border-radius: 4px;
            pointer-events: none;
            z-index: 2;
        }
        
        .node-image {
            width: 100%;
            height: auto;
            display: block;
            transition: transform 0.5s ease;
        }
        
        .node-image-frame:hover .node-image {
            transform: scale(1.05);
        }
        
        .image-caption {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.85));
            color: #eee;
            padding: 30px 15px 12px;
            font-family: 'Courier Prime', monospace;
            font-size: 0.85rem;
            text-align: center;
            opacity: 0;
            transform: translateY(100%);
            transition: all 0.3s ease;
        }
        
        .node-image-frame:hover .image-caption {
            opacity: 1;
            transform: translateY(0);
        }
        
        /* Видео */
        .video-container { 
            position: relative; 
            width: 100%; 
            max-width: 700px; 
            margin: 0 auto 30px; 
            border: 4px solid var(--gold-frame);
            border-radius: 8px; 
            overflow: hidden; 
            background: #0a0a0a;
            box-shadow: 0 8px 30px rgba(0,0,0,0.4);
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
            background: linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5));
            cursor: pointer; 
            transition: all 0.3s; 
        }
        
        .video-cover:hover { 
            background: linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3));
        }
        
        .play-btn-circle { 
            width: 90px; 
            height: 90px; 
            border-radius: 50%; 
            background: linear-gradient(135deg, #cc0000, #8a0000);
            border: 4px solid var(--gold-frame); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            box-shadow: 0 6px 25px rgba(0,0,0,0.5);
            transition: all 0.3s;
        }
        
        .video-cover:hover .play-btn-circle { 
            transform: scale(1.1);
            box-shadow: 0 8px 35px rgba(204, 0, 0, 0.4);
        }
        
        .play-triangle { 
            width: 0; 
            height: 0; 
            border-left: 28px solid white; 
            border-top: 16px solid transparent; 
            border-bottom: 16px solid transparent; 
            margin-left: 8px;
        }
        
        /* Блокировка */
        .locked-controls { 
            opacity: 0.35; 
            pointer-events: none; 
            filter: grayscale(0.8) blur(1px); 
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
            background: rgba(253, 251, 247, 0.95);
            border-radius: 6px; 
            z-index: 100; 
            color: var(--red-seal);
            font-family: 'Cinzel', serif;
            text-align: center; 
            padding: 25px; 
            pointer-events: auto;
            border: 3px solid var(--gold-frame);
        }
        
        .lock-icon { 
            font-size: 3rem; 
            margin-bottom: 12px;
            animation: pulse-lock 2s ease-in-out infinite;
        }
        
        @keyframes pulse-lock {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
        }
        
        .lock-title {
            font-size: 1.1rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 8px;
        }
        
        .lock-message { 
            font-size: 0.9rem; 
            color: #666; 
            font-family: 'Old Standard TT', serif;
        }
        
        .manual-unlock-btn { 
            margin-top: 18px; 
            padding: 12px 25px; 
            background: linear-gradient(180deg, #5a6b4a, #3d4a2d);
            color: white; 
            border: 2px solid var(--gold-frame); 
            border-radius: 6px; 
            cursor: pointer; 
            font-family: 'Cinzel', serif;
            font-weight: 700;
            text-transform: uppercase; 
            letter-spacing: 0.1em;
            transition: all 0.3s;
        }
        
        .manual-unlock-btn:hover { 
            background: linear-gradient(180deg, #6a7b5a, #4d5a3d);
            transform: translateY(-2px);
        }
        
        /* Описание */
        .node-description {
            font-family: 'Cormorant Garamond', serif;
            font-size: 1.25rem;
            line-height: 1.8;
            color: #3a3a3a;
            text-align: justify;
            margin-bottom: 30px;
        }
        
        .node-description b,
        .node-description strong {
            color: var(--red-seal);
            font-weight: 700;
        }
        
        .node-description em,
        .node-description i {
            color: var(--olive-dark);
        }
        
        /* Варианты ответов */
        .option-card { 
            background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(247,243,232,0.9));
            border: 2px solid #ccc; 
            padding: 18px 25px; 
            margin-bottom: 12px; 
            border-radius: 6px; 
            cursor: pointer; 
            transition: all 0.25s; 
            font-family: 'Cormorant Garamond', serif; 
            font-size: 1.15rem; 
            font-weight: 600; 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            position: relative;
            overflow: hidden;
        }
        
        .option-card::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: var(--gold-frame);
            transform: scaleY(0);
            transition: transform 0.3s;
        }
        
        .option-card:hover::before {
            transform: scaleY(1);
        }
        
        .option-card:hover { 
            border-color: var(--gold-dark); 
            transform: translateX(8px); 
            background: linear-gradient(180deg, #fff, #f8f5f0);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .option-card.selected { 
            background: linear-gradient(180deg, #e8f0e0, #d8e8c8);
            border-color: var(--olive-dark);
            box-shadow: inset 0 0 15px rgba(88, 108, 72, 0.15);
        }
        
        .option-card.selected::before {
            background: var(--olive-dark);
            transform: scaleY(1);
        }
        
        .option-marker {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid #999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.85rem;
            color: #999;
            transition: all 0.3s;
            flex-shrink: 0;
        }
        
        .option-card:hover .option-marker {
            border-color: var(--gold-dark);
            color: var(--gold-dark);
        }
        
        .option-card.selected .option-marker {
            background: var(--olive-dark);
            border-color: var(--olive-dark);
            color: white;
        }
        
        /* Сопоставление */
        .match-container { margin-top: 25px; }
        
        .match-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 25px; 
            margin-bottom: 20px; 
        }
        
        .match-column { 
            background: rgba(255,255,255,0.7); 
            border: 2px solid var(--gold-frame); 
            border-radius: 8px; 
            padding: 18px;
        }
        
        .match-column-title { 
            font-family: 'Cinzel', serif; 
            font-size: 0.9rem; 
            color: var(--olive-dark); 
            text-transform: uppercase; 
            letter-spacing: 0.12em; 
            margin-bottom: 15px; 
            padding-bottom: 12px; 
            border-bottom: 2px solid var(--gold-frame);
            text-align: center;
        }
        
        .match-card { 
            background: linear-gradient(180deg, #fdfcfa, #f5f2eb);
            border: 2px solid #cba353; 
            padding: 14px 18px; 
            border-radius: 6px; 
            cursor: pointer; 
            transition: all 0.25s; 
            margin-bottom: 10px; 
            font-family: 'Cormorant Garamond', serif; 
            font-weight: 600; 
            text-align: center;
        }
        
        .match-card:last-child { margin-bottom: 0; }
        
        .match-card:hover { 
            border-color: var(--olive-dark); 
            background: #fff;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .match-card.selected { 
            border-color: var(--red-seal); 
            background: linear-gradient(180deg, #fff0f0, #ffe8e8);
            box-shadow: 0 0 0 3px rgba(138, 28, 28, 0.2);
        }
        
        .match-card.matched { 
            opacity: 0.5; 
            border-color: var(--olive-dark); 
            background: linear-gradient(180deg, #e8f0e0, #d8e8c8);
            pointer-events: none;
        }
        
        .match-card img { 
            max-width: 100%; 
            max-height: 80px; 
            object-fit: contain; 
            margin-bottom: 10px; 
            border-radius: 4px;
            border: 1px solid #ddd;
        }
        
        .match-pairs-box { 
            background: rgba(255,255,255,0.8); 
            border: 2px dashed var(--gold-frame); 
            border-radius: 8px; 
            padding: 18px; 
            margin-top: 20px;
        }
        
        .match-pairs-title { 
            font-family: 'Cinzel', serif;
            font-size: 0.85rem; 
            color: var(--olive-dark); 
            margin-bottom: 12px; 
            text-transform: uppercase; 
            letter-spacing: 0.1em;
            text-align: center;
        }
        
        .match-pair-row { 
            display: grid; 
            grid-template-columns: 1fr auto 1fr; 
            gap: 15px; 
            padding: 10px 0; 
            border-bottom: 1px dotted #ccc; 
            align-items: center; 
            font-family: 'Courier Prime', monospace; 
            font-size: 0.9rem;
        }
        
        .match-pair-row:last-child { border-bottom: none; }
        
        .match-arrow { 
            color: var(--gold-dark); 
            font-weight: bold;
            font-size: 1.2rem;
        }
        
        .match-empty { 
            color: #999; 
            font-style: italic;
            text-align: center;
        }
        
        /* Хронология */
        .timeline-container { margin-top: 25px; }
        
        .timeline-item { 
            background: linear-gradient(180deg, #fff, #f8f5f0);
            border: 2px solid var(--gold-frame); 
            padding: 18px; 
            border-radius: 6px; 
            display: flex; 
            align-items: center; 
            gap: 18px; 
            box-shadow: 0 3px 10px rgba(0,0,0,0.08);
            transition: all 0.3s; 
            margin-bottom: 12px;
            position: relative;
        }
        
        .timeline-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 5px;
            background: linear-gradient(180deg, var(--gold-frame), var(--gold-dark));
            border-radius: 3px 0 0 3px;
        }
        
        .timeline-item:last-child { margin-bottom: 0; }
        
        .timeline-controls { 
            display: flex; 
            flex-direction: column; 
            gap: 6px;
        }
        
        .timeline-btn { 
            background: linear-gradient(180deg, #f0ebe0, #e0dbd0);
            border: 2px solid var(--gold-dark); 
            color: var(--olive-dark); 
            font-size: 14px; 
            cursor: pointer; 
            width: 32px; 
            height: 28px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            border-radius: 4px; 
            transition: all 0.2s;
            font-weight: bold;
        }
        
        .timeline-btn:hover { 
            background: var(--gold-frame); 
            color: white;
            transform: scale(1.1);
        }
        
        .timeline-content { 
            flex: 1; 
            font-family: 'Cormorant Garamond', serif; 
            font-size: 1.1rem; 
            font-weight: 600;
            padding-left: 10px;
        }
        
        .timeline-number {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: var(--olive-dark);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Cinzel', serif;
            font-size: 0.85rem;
            font-weight: bold;
            flex-shrink: 0;
        }
        
        /* Распределитель */
        .allocator-item { 
            margin-bottom: 25px; 
            padding: 20px; 
            background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(247,243,232,0.7));
            border: 2px solid var(--gold-frame); 
            border-radius: 8px;
        }
        
        .allocator-label { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 12px; 
            font-family: 'Cinzel', serif; 
            font-weight: bold;
            font-size: 1rem;
        }
        
        .allocator-value { 
            color: var(--red-seal); 
            font-size: 1.3rem;
            font-family: 'Courier Prime', monospace;
        }
        
        /* Результат */
        .result-decree { 
            background-color: rgba(255, 251, 240, 0.98); 
            background-image: url("https://www.transparenttextures.com/patterns/parchment.png"); 
            border: 10px double var(--text-dark); 
            padding: 50px; 
            position: relative; 
            box-shadow: 
                0 15px 50px rgba(0,0,0,0.3),
                inset 0 0 100px rgba(165, 142, 100, 0.1);
            text-align: center; 
            margin-bottom: 25px;
        }
        
        .result-decree::before { 
            content: ''; 
            position: absolute; 
            top: 15px; left: 15px; right: 15px; bottom: 15px; 
            border: 3px solid var(--gold-frame); 
            pointer-events: none;
        }
        
        .decree-header { 
            font-family: 'Ruslan Display', cursive; 
            font-size: 3.5rem; 
            color: var(--text-dark); 
            margin-bottom: 15px; 
            text-transform: uppercase; 
            letter-spacing: 4px;
        }
        
        .decree-subtitle {
            font-family: 'Cinzel', serif;
            font-size: 1.2rem;
            color: var(--olive-dark);
            text-transform: uppercase;
            letter-spacing: 0.2em;
            margin-bottom: 25px;
        }
        
        .wax-seal { 
            position: absolute; 
            bottom: 35px; 
            right: 35px; 
            width: 110px; 
            height: 110px; 
            background: linear-gradient(135deg, #cc0000, #8a0000);
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: rgba(255,255,255,0.9);
            font-weight: bold; 
            font-family: 'Cinzel', serif; 
            font-size: 0.7rem; 
            text-align: center; 
            border: 5px solid #6d1212;
            box-shadow: 
                3px 5px 15px rgba(0,0,0,0.5),
                inset 0 0 20px rgba(0,0,0,0.3);
            transform: rotate(-12deg);
            text-transform: uppercase;
            letter-spacing: 0.1em;
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
        
        /* New helper classes for font families to avoid inline style quote escaping issues */
        .result-text-title {
            font-family: 'Playfair Display', serif; 
            font-size: 1.3rem; 
            margin-bottom: 20px; 
            color: #2b241e;
        }
        .result-text-desc {
            font-family: 'Cormorant Garamond', serif; 
            font-size: 1.1rem; 
            line-height: 1.7; 
            margin-bottom: 25px;
        }
        
        /* Модальное окно досье */
        #dossier-modal { 
            display: none; 
            position: fixed; 
            inset: 0; 
            background: rgba(0,0,0,0.85); 
            z-index: 9000; 
            align-items: center; 
            justify-content: center; 
            padding: 20px;
        }
        
        .dossier-paper { 
            background: rgba(253, 251, 247, 0.98) url("https://www.transparenttextures.com/patterns/aged-paper.png"); 
            max-width: 650px; 
            width: 100%; 
            max-height: 90vh; 
            overflow-y: auto; 
            border: 5px double var(--red-seal);
            box-shadow: 0 0 60px rgba(0,0,0,0.6); 
            padding: 45px; 
            position: relative; 
            font-family: 'Courier Prime', monospace;
        }
        
        .dossier-title { 
            text-align: center; 
            font-family: 'Cinzel', serif; 
            font-size: 1.8rem; 
            color: var(--red-seal); 
            border-bottom: 3px double var(--red-seal); 
            padding-bottom: 15px; 
            margin-bottom: 25px; 
            text-transform: uppercase;
            letter-spacing: 0.15em;
        }
        
        .stamp-secret { 
            position: absolute; 
            top: 25px; 
            right: 25px; 
            border: 4px solid #cc0000; 
            color: #cc0000; 
            padding: 8px 15px; 
            font-weight: bold; 
            transform: rotate(-12deg); 
            opacity: 0.85; 
            font-size: 1rem;
            font-family: 'Cinzel', serif;
            letter-spacing: 0.1em;
        }
        
        .dossier-section {
            margin-bottom: 20px;
        }
        
        .dossier-section-title {
            font-family: 'Cinzel', serif;
            font-size: 0.85rem;
            color: var(--olive-dark);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ccc;
        }
        
        .dossier-row { 
            display: flex; 
            border-bottom: 1px dotted #999; 
            padding: 10px 0; 
            font-size: 0.95rem;
        }
        
        .dossier-label { 
            font-weight: bold; 
            width: 160px; 
            color: #444;
            flex-shrink: 0;
        }
        
        .dossier-value {
            color: #222;
        }
        
        /* Лайтбокс */
        #lightbox {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.95);
            z-index: 9001;
            align-items: center;
            justify-content: center;
            cursor: zoom-out;
        }
        
        #lightbox img {
            max-width: 92%;
            max-height: 92%;
            border: 5px solid var(--gold-frame);
            box-shadow: 0 0 50px rgba(0,0,0,0.8);
            animation: lightbox-appear 0.3s ease;
        }
        
        @keyframes lightbox-appear {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        
        /* Тост достижений */
        .achievement-toast { 
            position: fixed; 
            bottom: 25px; 
            right: 25px; 
            background: linear-gradient(135deg, rgba(203, 163, 83, 0.98), rgba(150, 116, 50, 0.98)); 
            color: white; 
            padding: 18px 28px; 
            border-radius: 8px; 
            border: 3px solid var(--red-seal); 
            box-shadow: 0 8px 30px rgba(0,0,0,0.4); 
            z-index: 9999; 
            font-family: 'Cinzel', serif; 
            animation: toast-slide 0.5s ease-out;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        @keyframes toast-slide { 
            from { transform: translateX(120%); opacity: 0; } 
            to { transform: translateX(0); opacity: 1; } 
        }
        
        .toast-icon {
            font-size: 2rem;
        }
        
        .toast-content {
            text-align: left;
        }
        
        .toast-title {
            font-weight: bold;
            font-size: 1.1rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .toast-desc {
            font-size: 0.85rem;
            opacity: 0.9;
            margin-top: 3px;
            font-family: 'Old Standard TT', serif;
        }
        
        /* Анимации */
        .fade-in { 
            animation: fadeIn 0.5s ease-out; 
        }
        
        @keyframes fadeIn { 
            from { opacity: 0; transform: translateY(15px); } 
            to { opacity: 1; transform: translateY(0); } 
        }
        
        /* Адаптивность */
        @media (max-width: 1200px) { 
            .main-grid { grid-template-columns: 260px 1fr 280px; gap: 15px; }
            .soviet-star { display: none; }
        }
        
        @media (max-width: 900px) { 
            .main-grid { 
                grid-template-columns: 1fr; 
                grid-template-rows: auto 1fr auto; 
                overflow-y: auto; 
            }
            .journal-panel { max-height: 200px; }
            .profile-panel { max-height: 250px; }
            .top-header { padding: 12px 20px; }
            .match-grid { grid-template-columns: 1fr; }
            body { height: auto; overflow: auto; }
        }
    </style>
</head>
<body class="custom-cursor">

    <div id="loading-screen" style="position:fixed;inset:0;background:linear-gradient(135deg, #3d4a2d, #2a2a28);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10000;">
        <div style="font-size:4rem; margin-bottom:20px;">⭐</div>
        <h2 style="font-family:'Cinzel',serif; font-size:1.5rem; color:#cba353; text-transform:uppercase; letter-spacing:0.3em;">Инициализация</h2>
        <p style="font-family:'Old Standard TT',serif; color:#888; margin-top:10px;">Загрузка данных командования...</p>
    </div>
    
    <div class="app-container">
        <header class="top-header ornate-box">
            <div class="oc-tl ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/><path d="M8,8 L8,20 L12,20 L12,12 L20,12 L20,8 Z" opacity="0.5"/></svg></div>
            <div class="oc-tr ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/><path d="M8,8 L8,20 L12,20 L12,12 L20,12 L20,8 Z" opacity="0.5"/></svg></div>
            <div class="oc-bl ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/><path d="M8,8 L8,20 L12,20 L12,12 L20,12 L20,8 Z" opacity="0.5"/></svg></div>
            <div class="oc-br ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/><path d="M8,8 L8,20 L12,20 L12,12 L20,12 L20,8 Z" opacity="0.5"/></svg></div>
            
            <svg class="soviet-star" viewBox="0 0 50 50">
                <polygon points="25,2 31,18 49,18 35,29 40,47 25,37 10,47 15,29 1,18 19,18" fill="#cc0000" stroke="#ffd700" stroke-width="1.5"/>
                <polygon points="25,8 29,18 39,18 31,25 34,36 25,30 16,36 19,25 11,18 21,18" fill="#ff3333" opacity="0.5"/>
            </svg>
            
            <svg class="soviet-star soviet-star-right" viewBox="0 0 50 50">
                <polygon points="25,2 31,18 49,18 35,29 40,47 25,37 10,47 15,29 1,18 19,18" fill="#cc0000" stroke="#ffd700" stroke-width="1.5"/>
                <polygon points="25,8 29,18 39,18 31,25 34,36 25,30 16,36 19,25 11,18 21,18" fill="#ff3333" opacity="0.5"/>
            </svg>
            
            <div style="text-align:center; z-index:10;">
                <h1 id="quiz-title" style="font-family:'Playfair Display',serif; font-size:2.2rem; color:#2b241e; text-transform:uppercase; letter-spacing:0.08em; margin:0; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">Офицеры России</h1>
                <h2 id="quiz-subtitle" style="font-family:'Cinzel',serif; font-size:0.95rem; color:#586c48; text-transform:uppercase; letter-spacing:0.25em; margin-top:8px;">Военно-исторический курс</h2>
            </div>
        </header>

        <div class="progress-ribbon">
            <span class="progress-label">Выполнение задания</span>
            <div class="top-progress-bar-bg">
                <div id="campaign-progress-bar" class="top-progress-fill"></div>
            </div>
            <span id="campaign-progress-text" style="font-family:'Courier Prime',monospace; font-weight:bold; font-size:1.1rem; min-width:50px;">0%</span>
        </div>

        <div class="main-grid">
            <!-- Левая панель -->
            <aside class="journal-panel ornate-box">
                <div class="oc-tl ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/></svg></div>
                <div class="oc-tr ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/></svg></div>
                <div class="oc-bl ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/></svg></div>
                <div class="oc-br ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/></svg></div>
                
                <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                    <div class="panel-header">Оперативная сводка</div>
                    <div class="journal-scroll" id="status-display"></div>
                </div>
            </aside>

            <!-- Центральная панель -->
            <main class="content-panel ornate-box">
                <div class="oc-tl ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/></svg></div>
                <div class="oc-tr ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/></svg></div>
                <div class="oc-bl ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/></svg></div>
                <div class="oc-br ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/></svg></div>
                
                <div class="content-scroll" id="game-view">
                    <h2 class="node-title" id="node-title"></h2>
                    <div id="node-video-wrapper" class="hidden"></div>
                    <div id="node-image-wrapper" class="hidden"></div>
                    <div class="node-description" id="node-description"></div>
                    <div id="interactive-area" style="position: relative;"></div>
                </div>
            </main>

            <!-- Правая панель -->
            <aside class="profile-panel ornate-box">
                <div class="oc-tl ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/></svg></div>
                <div class="oc-tr ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/></svg></div>
                <div class="oc-bl ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/></svg></div>
                <div class="oc-br ornate-corner"><svg viewBox="0 0 28 28" fill="#cba353"><path d="M0,0 L0,28 L4,28 L4,4 L28,4 L28,0 Z"/></svg></div>
                
                <div class="panel-header">Личное дело</div>
                
                <div class="avatar-frame">
                    <img id="player-avatar" src="" alt="Фото">
                </div>
                
                <div class="player-name" id="player-name">Курсант</div>
                <div class="player-title" id="player-title">Военная академия</div>
                <div class="rank-badge" id="rank-badge">Рядовой</div>
                
                <div class="medals-section">
                    <div class="medals-title">Награды и знаки отличия</div>
                    <div class="medals-container" id="medals-container">
                        <span style="color:#999; font-size:0.85rem;">Пока нет наград</span>
                    </div>
                </div>
                
                <div class="resources-section" id="resources-container"></div>
                
                <button class="military-btn w-full mt-4" style="font-size:0.8rem;" onclick="game.openDossier()">
                    📋 Полное досье
                </button>
            </aside>
        </div>
    </div>

    <!-- Модальное окно досье -->
    <div id="dossier-modal" onclick="this.style.display='none'">
        <div class="dossier-paper" onclick="event.stopPropagation()">
            <div class="stamp-secret">СЕКРЕТНО</div>
            <h2 class="dossier-title">Личное дело</h2>
            <div id="dossier-content"></div>
            <div style="margin-top:35px; text-align:center;">
                <button class="military-btn" onclick="document.getElementById('dossier-modal').style.display='none'">Закрыть</button>
            </div>
        </div>
    </div>

    <!-- Лайтбокс -->
    <div id="lightbox">
        <img id="lightbox-img" src="" alt="Увеличенное изображение" />
    </div>

    <script>
        var quizData = %%QUIZ_DATA_INJECTION%%;

        var sfx = {
            click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
            success: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
            page: new Audio('https://assets.mixkit.co/active_storage/sfx/2413/2413-preview.mp3'),
            error: new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'),
            medal: new Audio('https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3')
        };
        
        // Стандартные звания (используются если нет progressionNode)
        var defaultRanks = [
            { level: 0, name: 'Рядовой', minScore: 0 },
            { level: 1, name: 'Ефрейтор', minScore: 10 },
            { level: 2, name: 'Младший сержант', minScore: 20 },
            { level: 3, name: 'Сержант', minScore: 35 },
            { level: 4, name: 'Старший сержант', minScore: 50 },
            { level: 5, name: 'Старшина', minScore: 65 },
            { level: 6, name: 'Прапорщик', minScore: 80 },
            { level: 7, name: 'Младший лейтенант', minScore: 100 },
            { level: 8, name: 'Лейтенант', minScore: 120 },
            { level: 9, name: 'Старший лейтенант', minScore: 145 },
            { level: 10, name: 'Капитан', minScore: 170 },
            { level: 11, name: 'Майор', minScore: 200 },
            { level: 12, name: 'Подполковник', minScore: 240 },
            { level: 13, name: 'Полковник', minScore: 280 },
            { level: 14, name: 'Генерал-майор', minScore: 350 },
            { level: 15, name: 'Генерал-лейтенант', minScore: 450 },
            { level: 16, name: 'Генерал-полковник', minScore: 600 },
            { level: 17, name: 'Генерал армии', minScore: 800 },
            { level: 18, name: 'Маршал', minScore: 1000 }
        ];
        
        var avatars = [
            "https://upload.wikimedia.org/wikipedia/commons/e/ea/Kutuzov_by_Volkov.jpg",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Bagration_Peter_Ivanovich.jpg/440px-Bagration_Peter_Ivanovich.jpg",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Barclay-de-Tolly_by_Dawe.jpg/440px-Barclay-de-Tolly_by_Dawe.jpg",
            "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Suvorov_Alex_V.jpg/440px-Suvorov_Alex_V.jpg"
        ];

        var game = {
            initialized: false,
            nodes: {},
            resultsApiBase: '',
            progressionRules: null,
            
            state: { 
                currentNodeId: null, 
                score: 0, 
                variables: {}, 
                visitedNodes: {},
                visitedInteractiveNodes: {},
                history: [], 
                unlockedAchievements: [], 
                temp: {}, 
                isResultSaved: false, 
                pathData: [], 
                sessionId: null,
                currentRank: 'Рядовой',
                currentLevel: 0
            },
            
            videoLockState: {
                controlsElement: null,
                overlayElement: null,
                unlockTimer: null,
                manualUnlockTimer: null,
                isLocked: false
            },
            rutubeOnMessage: null,
            totalInteractiveNodes: 0,
            
            init: function() {
                var self = this;
                if (this.initialized) return;
                var lightbox = document.getElementById('lightbox');
                var lightboxImage = document.getElementById('lightbox-img');
                lightbox.addEventListener('click', function() { lightbox.style.display = 'none'; });
                lightboxImage.addEventListener('click', function(event) { event.stopPropagation(); });
                
                this.resultsApiBase = (quizData.apiBaseUrl || '').replace(/\/$/, '');

                if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                    this.state.sessionId = crypto.randomUUID();
                } else {
                    this.state.sessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                }

                if (!quizData || !quizData.nodes) { 
                    alert("Ошибка загрузки данных."); 
                    return; 
                }
                this.initialized = true;

                for (var i = 0; i < quizData.nodes.length; i++) {
                    var n = quizData.nodes[i];
                    this.nodes[n.id] = n;
                    
                    // Извлекаем правила прогрессии
                    if (n.type === 'progressionNode' && n.data && n.data.rules) {
                        this.progressionRules = n.data;
                    }
                }
                
                this.calculateTotalInteractiveNodes();
                
                if(quizData.currentQuizName) {
                    document.getElementById('quiz-title').innerText = quizData.currentQuizName;
                }
                
                if (!this.loadState()) {
                    this.state.variables['avatar_url'] = avatars[Math.floor(Math.random() * avatars.length)];
                    this.start();
                } else {
                    this.updateProfile();
                    var node = this.nodes[this.state.currentNodeId];
                    if(node) this.renderNode(node);
                    this.renderStatus(node);
                }
                
                this.updateProgressBar();
                document.getElementById('loading-screen').style.display = 'none';
            },

            // Получение звания на основе progressionNode или дефолтных значений
            getRankFromProgression: function(score) {
                var rules = this.progressionRules;
                
                if (rules && rules.rules && rules.rules.length > 0) {
                    // Используем правила из progressionNode
                    var sortedRules = rules.rules.slice().sort(function(a, b) { 
                        return b.level - a.level; 
                    });
                    
                    for (var i = 0; i < sortedRules.length; i++) {
                        var rule = sortedRules[i];
                        var requirements = rule.requirements || [];
                        var passes = true;
                        
                        for (var j = 0; j < requirements.length; j++) {
                            var req = requirements[j];
                            var val = 0;
                            
                            if (req.type === 'minScore' || req.type === 'maxScore') {
                                val = score;
                            } else if (req.variable) {
                                val = this.state.variables[req.variable] || 0;
                            }
                            
                            if (req.type === 'minScore' || req.type === 'minVar') {
                                if (val < req.value) passes = false;
                            } else if (req.type === 'maxScore' || req.type === 'maxVar') {
                                if (val > req.value) passes = false;
                            }
                            
                            if (!passes) break;
                        }
                        
                        if (passes) {
                            return { name: rule.name, level: rule.level };
                        }
                    }
                    
                    // Если ничего не подошло, возвращаем первое правило
                    if (sortedRules.length > 0) {
                        var lastRule = sortedRules[sortedRules.length - 1];
                        return { name: lastRule.name, level: lastRule.level };
                    }
                }
                
                // Используем дефолтные звания
                for (var k = defaultRanks.length - 1; k >= 0; k--) {
                    if (score >= defaultRanks[k].minScore) {
                        return { name: defaultRanks[k].name, level: defaultRanks[k].level };
                    }
                }
                
                return { name: 'Рядовой', level: 0 };
            },

            calculateTotalInteractiveNodes: function() {
                var interactiveTypes = ['questionNode', 'multipleChoiceNode', 'matchingNode', 'timelineNode', 'textInputNode', 'collectInfoNode', 'allocatorNode'];
                var count = 0;
                for (var i = 0; i < quizData.nodes.length; i++) {
                    if (interactiveTypes.indexOf(quizData.nodes[i].type) !== -1) count++;
                }
                this.totalInteractiveNodes = count;
            },

            updateProgressBar: function() {
                var progressBar = document.getElementById('campaign-progress-bar');
                var progressText = document.getElementById('campaign-progress-text');
                if (!progressBar || !progressText) return;

                var visitedCount = Object.keys(this.state.visitedInteractiveNodes).length;
                var pct = 0;
                if (this.totalInteractiveNodes > 0) {
                    pct = Math.round((visitedCount / this.totalInteractiveNodes) * 100);
                    pct = Math.min(pct, 100);
                }

                progressBar.style.width = pct + '%';
                progressText.innerText = pct + '%';
            },

            getRutubeId: function(url) {
                if (!url) return null;
                var regex = /(?:rutube\\.ru\\/(?:video|play\\/embed)\\/)([a-zA-Z0-9]+)/;
                var match = url.match(regex);
                return match ? match[1] : null;
            },

            unlockVideoControls: function() {
                if (!this.videoLockState.isLocked) return;

                var ctrls = this.videoLockState.controlsElement || document.getElementById('interactive-area');
                var overlay = this.videoLockState.overlayElement || document.querySelector('.video-lock-overlay');

                if (ctrls) ctrls.classList.remove('locked-controls');
                if (overlay) {
                    overlay.style.transition = 'opacity 0.5s ease';
                    overlay.style.opacity = '0';
                    setTimeout(function() {
                        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    }, 500);
                }

                if (this.videoLockState.unlockTimer) clearTimeout(this.videoLockState.unlockTimer);
                if (this.videoLockState.manualUnlockTimer) clearTimeout(this.videoLockState.manualUnlockTimer);

                this.videoLockState.isLocked = false;
                this.videoLockState.controlsElement = null;
                this.videoLockState.overlayElement = null;
                this.cleanupRutubeListener();
                this.playSound('success');
            },

            cleanupRutubeListener: function() {
                if (this.rutubeOnMessage) {
                    window.removeEventListener('message', this.rutubeOnMessage);
                    this.rutubeOnMessage = null;
                }
            },

            cleanupMediaOnNodeChange: function() {
                this.cleanupRutubeListener();
                if (this.videoLockState.unlockTimer) clearTimeout(this.videoLockState.unlockTimer);
                if (this.videoLockState.manualUnlockTimer) clearTimeout(this.videoLockState.manualUnlockTimer);
                this.videoLockState = { controlsElement: null, overlayElement: null, unlockTimer: null, manualUnlockTimer: null, isLocked: false };
            },

            setupRutubeListener: function() {
                var self = this;
                this.cleanupRutubeListener();

                var onMessage = function(ev) {
                    try {
                        var data = ev.data;
                        if (typeof data === 'string') {
                            try { data = JSON.parse(data); } 
                            catch (e) {
                                if (data.indexOf('ended') !== -1 || data.indexOf('complete') !== -1) {
                                    self.unlockVideoControls();
                                }
                                return;
                            }
                        }
                        if (!data || typeof data !== 'object') return;

                        var isEnded = data.type === 'player:ended' ||
                            (data.type === 'player:changeState' && data.data && data.data.state === 'ended') ||
                            data.event === 'ended' || data.event === 'complete' ||
                            data.state === 'ended' || data.state === 'complete' ||
                            (data.data && data.data.ended === true) ||
                            (data.info && data.info.playerState === 0);

                        if (isEnded) self.unlockVideoControls();

                        if (data.type === 'player:currentTime' || data.type === 'player:progress') {
                            var currentTime = (data.data && data.data.currentTime) || data.currentTime || 0;
                            var duration = (data.data && data.data.duration) || data.duration || 0;
                            if (duration > 0 && currentTime > 0 && (currentTime / duration) >= 0.95) {
                                self.unlockVideoControls();
                            }
                        }
                    } catch (err) { console.error('Message handler error:', err); }
                };

                this.rutubeOnMessage = onMessage;
                window.addEventListener('message', this.rutubeOnMessage);
            },

            start: function(specificNodeId) {
                this.state.score = 0;
                this.state.variables = {};
                this.state.variables['avatar_url'] = avatars[Math.floor(Math.random() * avatars.length)];
                this.state.visitedNodes = {};
                this.state.visitedInteractiveNodes = {};
                this.state.history = [];
                this.state.unlockedAchievements = [];
                this.state.isResultSaved = false;
                this.state.pathData = [];
                this.state.currentRank = 'Рядовой';
                this.state.currentLevel = 0;
                this.updateProgressBar();
                
                var startId = specificNodeId;
                if (!startId) {
                    for (var i = 0; i < quizData.nodes.length; i++) {
                        if (quizData.nodes[i].type === 'startNode') { startId = quizData.nodes[i].id; break; }
                    }
                }
                if (startId) this.goToNext(startId);
            },

            saveState: function() {
                var save = JSON.parse(JSON.stringify(this.state));
                localStorage.setItem('army_quiz_save_v2', JSON.stringify(save));
            },

            loadState: function() {
                var saveStr = localStorage.getItem('army_quiz_save_v2');
                if(!saveStr) return false;
                try {
                    var save = JSON.parse(saveStr);
                    if (!save.currentNodeId || !this.nodes[save.currentNodeId]) return false;
                    this.state = save;
                    if (!this.state.visitedInteractiveNodes) this.state.visitedInteractiveNodes = {};
                    return true;
                } catch(e) { return false; }
            },

            trackPath: function(node, details) {
                if (!details) details = {};
                this.state.pathData.push({
                    nodeId: node.id,
                    nodeType: node.type,
                    nodeLabel: (node.data && (node.data.label || node.data.title)) || 'Step',
                    timestamp: new Date().toISOString(),
                    details: details
                });
            },

            saveResults: function(finalNodeTitle) {
                var self = this;
                if (!this.resultsApiBase || !quizData.quizId || this.state.isResultSaved) return;
                
                var participantName = this.state.variables.playerName || this.state.variables.name || 'Курсант';
                var payload = {
                    quiz_id: quizData.quizId,
                    session_id: this.state.sessionId,
                    score: this.state.score,
                    final_node_title: finalNodeTitle,
                    participant_name: participantName,
                    results_data: { 
                        variables: this.state.variables, 
                        achievements: this.state.unlockedAchievements,
                        finalRank: this.state.currentRank
                    },
                    path_data: this.state.pathData
                };

                fetch(this.resultsApiBase + '/results', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    keepalive: true
                }).then(function(res) {
                    if (!res.ok) {
                        console.error("Save error:", res.status);
                    } else {
                        self.state.isResultSaved = true;
                    }
                }).catch(function(err) { console.error("Critical save error:", err); });
            },

            playSound: function(type) { 
                if(sfx[type]) { sfx[type].currentTime = 0; sfx[type].play().catch(function(){}); } 
            },

            openLightbox: function(src) {
                if(src) { 
                    document.getElementById('lightbox-img').src = src; 
                    document.getElementById('lightbox').style.display = 'flex'; 
                    this.playSound('page');
                }
            },

            openDossier: function() {
                var self = this;
                var modal = document.getElementById('dossier-modal');
                var content = document.getElementById('dossier-content');
                var name = this.state.variables['playerName'] || this.state.variables['name'] || 'Не указано';
                var rankInfo = this.getRankFromProgression(this.state.score);
                
                var html = '';
                
                // Основные данные
                html += '<div class="dossier-section">';
                html += '<div class="dossier-section-title">Основные сведения</div>';
                html += '<div class="dossier-row"><span class="dossier-label">Ф.И.О.:</span><span class="dossier-value">' + name + '</span></div>';
                html += '<div class="dossier-row"><span class="dossier-label">Воинское звание:</span><span class="dossier-value">' + rankInfo.name + '</span></div>';
                html += '<div class="dossier-row"><span class="dossier-label">Уровень:</span><span class="dossier-value">' + rankInfo.level + '</span></div>';
                html += '<div class="dossier-row"><span class="dossier-label">Боевые заслуги:</span><span class="dossier-value">' + this.state.score + ' очков</span></div>';
                html += '<div class="dossier-row"><span class="dossier-label">Статус:</span><span class="dossier-value">Действующий</span></div>';
                html += '</div>';
                
                // Награды
                if (this.state.unlockedAchievements.length > 0) {
                    html += '<div class="dossier-section">';
                    html += '<div class="dossier-section-title">Награды и отличия</div>';
                    for (var i = 0; i < this.state.unlockedAchievements.length; i++) {
                        html += '<div class="dossier-row"><span class="dossier-label">🎖️ Награда:</span><span class="dossier-value">' + this.state.unlockedAchievements[i] + '</span></div>';
                    }
                    html += '</div>';
                }
                
                // Переменные
                var varsHtml = '';
                var varCount = 0;
                for (var k in this.state.variables) {
                    if (['playerName', 'name', 'avatar_url'].indexOf(k) !== -1) continue;
                    varCount++;
                    varsHtml += '<div class="dossier-row"><span class="dossier-label">' + k + ':</span><span class="dossier-value">' + this.state.variables[k] + '</span></div>';
                }
                
                if (varCount > 0) {
                    html += '<div class="dossier-section">';
                    html += '<div class="dossier-section-title">Дополнительные сведения</div>';
                    html += varsHtml;
                    html += '</div>';
                }
                
                // Служебная информация
                html += '<div class="dossier-section">';
                html += '<div class="dossier-section-title">Служебная информация</div>';
                html += '<div class="dossier-row"><span class="dossier-label">ID сессии:</span><span class="dossier-value" style="font-size:0.75rem;">' + (this.state.sessionId || 'N/A').substring(0, 18) + '...</span></div>';
                html += '<div class="dossier-row"><span class="dossier-label">Пройдено этапов:</span><span class="dossier-value">' + Object.keys(this.state.visitedNodes).length + '</span></div>';
                html += '</div>';
                    
                content.innerHTML = html;
                modal.style.display = 'flex';
                this.playSound('page');
            },

            showAchievementToast: function(title, description) {
                var toast = document.createElement('div');
                toast.className = 'achievement-toast';
                toast.innerHTML = '<div class="toast-icon">🎖️</div><div class="toast-content"><div class="toast-title">' + title + '</div>' + (description ? '<div class="toast-desc">' + description + '</div>' : '') + '</div>';
                document.body.appendChild(toast);
                
                this.playSound('medal');
                
                setTimeout(function() { 
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(120%)';
                    setTimeout(function() { toast.remove(); }, 500);
                }, 4000);
                
                confetti({ particleCount: 120, spread: 80, origin: { y: 0.65 }, colors: ['#cba353', '#cc0000', '#586c48', '#ffd700'] });
            },

            showRankUpToast: function(oldRank, newRank) {
                var toast = document.createElement('div');
                toast.className = 'achievement-toast';
                toast.style.background = 'linear-gradient(135deg, rgba(88, 108, 72, 0.98), rgba(61, 74, 45, 0.98))';
                toast.innerHTML = '<div class="toast-icon">⭐</div><div class="toast-content"><div class="toast-title">Повышение в звании!</div><div class="toast-desc">' + oldRank + ' → ' + newRank + '</div></div>';
                document.body.appendChild(toast);
                
                this.playSound('success');
                
                setTimeout(function() { 
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(120%)';
                    setTimeout(function() { toast.remove(); }, 500);
                }, 4000);
                
                confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ['#ffd700', '#cc0000', '#ffffff'] });
            },

            processText: function(text) {
                if (!text) return '';
                var self = this;
                var processed = text.replace(/{{(.*?)}}/g, function(match, key) {
                    var k = key.trim();
                    if(k === 'score') return self.state.score;
                    if(k === 'rank') return self.state.currentRank;
                    return self.state.variables[k] !== undefined ? self.state.variables[k] : match;
                });
                processed = processed.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
                processed = processed.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
                processed = processed.replace(/\\n/g, '<br>');
                return processed;
            },

            goToNext: function(sourceId, handleId) {
                var edge = null;
                var fallbackEdge = null;
                
                for (var i = 0; i < quizData.edges.length; i++) {
                    var e = quizData.edges[i];
                    if (e.source === sourceId) {
                        if (!fallbackEdge) fallbackEdge = e;
                        if (handleId && e.sourceHandle === handleId) { edge = e; break; }
                        if (!handleId) { edge = e; break; }
                    }
                }
                
                var targetId = edge ? edge.target : (fallbackEdge ? fallbackEdge.target : null);
                
                if(targetId) {
                    this.state.visitedNodes[targetId] = true;
                    var node = this.nodes[targetId];
                    this.processNode(node);
                    this.saveState();
                } else {
                    console.warn("End of branch");
                }
            },

            processNode: function(node) {
                if(!node) return;
                this.cleanupMediaOnNodeChange();
                this.trackPath(node);
                
                var interactiveTypes = ['questionNode', 'multipleChoiceNode', 'matchingNode', 'timelineNode', 'textInputNode', 'collectInfoNode', 'allocatorNode'];
                if (interactiveTypes.indexOf(node.type) !== -1) {
                    this.state.visitedInteractiveNodes[node.id] = true;
                    this.updateProgressBar();
                }
                
                var logicTypes = ['scoreNode', 'variableNode', 'startNode', 'conditionNode', 'formulaNode', 'achievementNode', 'goToNode', 'progressionNode'];
                if(logicTypes.indexOf(node.type) !== -1) {
                    this.executeLogic(node); 
                    return;
                }
                
                this.renderNode(node);
                this.updateProfile();
                this.renderStatus(node);
            },

            executeLogic: function(node) {
                var self = this;
                var type = node.type;
                var data = node.data || {};
                
                if (type === 'scoreNode') {
                    var oldScore = this.state.score;
                    var val = parseInt(data.value || 0);
                    if(data.operation === 'add') this.state.score += val; 
                    else if(data.operation === 'subtract') this.state.score -= val; 
                    else this.state.score = val;
                    
                    // Проверяем повышение в звании
                    var oldRankInfo = this.getRankFromProgression(oldScore);
                    var newRankInfo = this.getRankFromProgression(this.state.score);
                    
                    if (newRankInfo.level > oldRankInfo.level) {
                        this.state.currentRank = newRankInfo.name;
                        this.state.currentLevel = newRankInfo.level;
                        this.showRankUpToast(oldRankInfo.name, newRankInfo.name);
                    }
                } 
                else if (type === 'variableNode') {
                    var name = data.variableName; 
                    var varVal = data.value;
                    var numVal = parseFloat(varVal);
                    
                    if (this.state.variables[name] === undefined) this.state.variables[name] = 0;
                    
                    if(data.operation === 'add' && !isNaN(numVal)) {
                        this.state.variables[name] = parseFloat(this.state.variables[name] || 0) + numVal;
                    } else if(data.operation === 'subtract' && !isNaN(numVal)) {
                        this.state.variables[name] = parseFloat(this.state.variables[name] || 0) - numVal;
                    } else {
                        this.state.variables[name] = varVal;
                    }
                } 
                else if (type === 'achievementNode') {
                    if (this.state.unlockedAchievements.indexOf(data.title || 'Награда') === -1) {
                        this.state.unlockedAchievements.push(data.title || 'Награда');
                        this.showAchievementToast(data.title || 'Награда', data.description);
                    }
                } 
                else if (type === 'conditionNode') {
                    var checkVal = this.state.variables[data.variable] !== undefined ? this.state.variables[data.variable] : this.state.score;
                    var targetVal = data.value;
                    var result = false;
                    
                    var numCheck = parseFloat(checkVal);
                    var numTarget = parseFloat(targetVal);
                    var isNumeric = !isNaN(numCheck) && !isNaN(numTarget);
                    
                    if(data.operator === 'eq') result = checkVal == targetVal;
                    else if(data.operator === 'neq') result = checkVal != targetVal;
                    else if(data.operator === 'gt' && isNumeric) result = numCheck > numTarget;
                    else if(data.operator === 'lt' && isNumeric) result = numCheck < numTarget;
                    else if(data.operator === 'gte' && isNumeric) result = numCheck >= numTarget;
                    else if(data.operator === 'lte' && isNumeric) result = numCheck <= numTarget;
                    else if(data.operator === 'contains') result = String(checkVal).indexOf(String(targetVal)) !== -1;
                    
                    this.goToNext(node.id, result ? 'true' : 'false'); 
                    return;
                }
                else if (type === 'formulaNode') {
                    if (window.math && data.expression && data.variableName) {
                        try {
                            var scope = {};
                            for (var k in this.state.variables) scope[k] = this.state.variables[k];
                            scope.score = this.state.score;
                            var formulaResult = window.math.evaluate(data.expression, scope);
                            if (typeof data.decimalPlaces === 'number') {
                                formulaResult = parseFloat(formulaResult.toFixed(data.decimalPlaces));
                            }
                            this.state.variables[data.variableName] = formulaResult;
                        } catch (e) { console.error('Formula error:', e); }
                    }
                }
                else if (type === 'goToNode') {
                    if (data.targetNodeId) {
                        this.state.visitedNodes[data.targetNodeId] = true;
                        var targetNode = this.nodes[data.targetNodeId];
                        this.processNode(targetNode);
                        return;
                    }
                }
                else if (type === 'progressionNode') {
                    // Обрабатываем узел прогрессии
                    var rules = data.rules || [];
                    var levelVar = data.levelVar || 'level';
                    var nameVar = data.nameVar || 'rankName';
                    
                    var currentLevel = this.state.variables[levelVar] || 0;
                    var bestRule = null;
                    
                    var sortedRules = rules.slice().sort(function(a, b) { return b.level - a.level; });
                    
                    for (var i = 0; i < sortedRules.length; i++) {
                        var rule = sortedRules[i];
                        var requirements = rule.requirements || [];
                        var passes = true;
                        
                        for (var j = 0; j < requirements.length; j++) {
                            var req = requirements[j];
                            var reqVal = 0;
                            
                            if (req.type === 'minScore' || req.type === 'maxScore') {
                                reqVal = this.state.score;
                            } else if (req.variable) {
                                reqVal = this.state.variables[req.variable] || 0;
                            }
                            
                            if (req.type === 'minScore' || req.type === 'minVar') {
                                if (reqVal < req.value) passes = false;
                            } else if (req.type === 'maxScore' || req.type === 'maxVar') {
                                if (reqVal > req.value) passes = false;
                            }
                            
                            if (!passes) break;
                        }
                        
                        if (passes) {
                            bestRule = rule;
                            break;
                        }
                    }
                    
                    var handleToUse = 'default';
                    
                    if (bestRule) {
                        if (bestRule.level > currentLevel) {
                            handleToUse = 'levelUp';
                            var oldRank = this.state.variables[nameVar] || 'Рядовой';
                            this.state.variables[levelVar] = bestRule.level;
                            this.state.variables[nameVar] = bestRule.name;
                            this.state.currentRank = bestRule.name;
                            this.state.currentLevel = bestRule.level;
                            this.showRankUpToast(oldRank, bestRule.name);
                        } else if (!data.lockDegrade && bestRule.level < currentLevel) {
                            this.state.variables[levelVar] = bestRule.level;
                            this.state.variables[nameVar] = bestRule.name;
                            this.state.currentRank = bestRule.name;
                            this.state.currentLevel = bestRule.level;
                        }
                    }
                    
                    // Ищем соответствующий edge
                    var foundEdge = null;
                    for (var ei = 0; ei < quizData.edges.length; ei++) {
                        if (quizData.edges[ei].source === node.id && quizData.edges[ei].sourceHandle === handleToUse) {
                            foundEdge = quizData.edges[ei];
                            break;
                        }
                    }
                    
                    if (!foundEdge) {
                        for (var ej = 0; ej < quizData.edges.length; ej++) {
                            if (quizData.edges[ej].source === node.id) {
                                foundEdge = quizData.edges[ej];
                                break;
                            }
                        }
                    }
                    
                    if (foundEdge) {
                        this.state.visitedNodes[foundEdge.target] = true;
                        this.processNode(this.nodes[foundEdge.target]);
                    }
                    return;
                }
                
                this.goToNext(node.id);
            },

            renderNode: function(node) {
                var self = this;
                this.state.currentNodeId = node.id;
                
                var titleEl = document.getElementById('node-title');
                var videoWrapper = document.getElementById('node-video-wrapper');
                var imgWrapper = document.getElementById('node-image-wrapper');
                var descEl = document.getElementById('node-description');
                var areaEl = document.getElementById('interactive-area');

                areaEl.innerHTML = ''; 
                videoWrapper.innerHTML = '';
                videoWrapper.classList.add('hidden');
                imgWrapper.innerHTML = '';
                imgWrapper.classList.add('hidden');
                
                var data = node.data || {};
                var rutubeId = this.getRutubeId(data.videoUrl);
                var hasRequiredVideo = data.isRequiredWatch && rutubeId;
                
                // ===== RESULT NODE =====
                if (node.type === 'resultNode') {
                    for (var i = 0; i < quizData.nodes.length; i++) {
                        var n = quizData.nodes[i];
                        var interactiveTypes = ['questionNode', 'multipleChoiceNode', 'matchingNode', 'timelineNode', 'textInputNode', 'collectInfoNode', 'allocatorNode'];
                        if (interactiveTypes.indexOf(n.type) !== -1) {
                            this.state.visitedInteractiveNodes[n.id] = true;
                        }
                    }
                    this.updateProgressBar();
                    
                    var rankInfo = this.getRankFromProgression(this.state.score);
                    
                    titleEl.innerText = ""; 
                    descEl.innerHTML = 
                        '<div class="result-decree">' +
                            '<div class="decree-header">ПРИКАЗЪ</div>' +
                            '<div class="decree-subtitle">По итогам прохождения курса</div>' +
                            '<div class="result-text-title">' + this.processText(data.title || 'Курс завершён') + '</div>' +
                            '<div class="result-text-desc">' + this.processText(data.description || '') + '</div>' +
                            (data.showScore ? '<div style="font-size:1.4rem; font-weight:bold; border-top:2px solid #cba353; padding-top:20px; margin-top:20px;">Итоговые заслуги: <span style="color:#cc0000;">' + this.state.score + '</span> очков</div><div style="font-size:1.1rem; color:#586c48; margin-top:10px;">Присвоено звание: <strong>' + rankInfo.name + '</strong></div>' : '') +
                            '<div class="wax-seal"><span>УТВЕРЖДЕНО</span></div>' +
                        '</div>';

                    var btn = document.createElement('button'); 
                    btn.className = 'military-btn red w-full mt-4'; 
                    btn.innerText = 'Завершить службу';
                    btn.onclick = function() { localStorage.removeItem('army_quiz_save_v2'); location.reload(); };
                    areaEl.appendChild(btn); 
                     
                    this.saveResults(data.title);
                    this.playSound('success'); 
                    confetti({ particleCount: 200, spread: 100, origin: { y: 0.55 }, colors: ['#cba353', '#cc0000', '#ffd700', '#586c48'] });
                    return;
                }

                titleEl.innerText = this.processText(data.title || data.label || 'Задание');
                descEl.innerHTML = this.processText(data.description || data.question || data.message || '');

                // ===== RENDER VIDEO =====
                if (rutubeId) {
                    videoWrapper.classList.remove('hidden');
                    
                    var videoContainer = document.createElement('div');
                    videoContainer.className = 'video-container';
                    
                    var videoAspect = document.createElement('div');
                    videoAspect.className = 'video-aspect';
                    
                    var cover = document.createElement('div');
                    cover.className = 'video-cover';
                    if (data.imageUrl) {
                        cover.style.backgroundImage = "url('" + data.imageUrl + "')";
                        cover.style.backgroundSize = 'cover';
                        cover.style.backgroundPosition = 'center';
                    }
                    cover.innerHTML = '<div class="play-btn-circle"><div class="play-triangle"></div></div>';
                    
                    cover.onclick = function(e) {
                        e.stopPropagation();
                        videoAspect.innerHTML = '<iframe src="https://rutube.ru/play/embed/' + rutubeId + '?autoplay=1" frameborder="0" allow="clipboard-write; autoplay" webkitAllowFullScreen mozallowfullscreen allowFullScreen style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe>';
                        
                        if (hasRequiredVideo) {
                            self.setupRutubeListener();
                            if (data.videoDuration) {
                                self.videoLockState.unlockTimer = setTimeout(function() {
                                    if (self.videoLockState.isLocked) self.unlockVideoControls();
                                }, (data.videoDuration + 5) * 1000);
                            }
                        }
                    };
                    
                    videoAspect.appendChild(cover);
                    videoContainer.appendChild(videoAspect);
                    videoWrapper.appendChild(videoContainer);
                    
                } else if(data.imageUrl) {
                    // ===== RENDER IMAGE =====
                    imgWrapper.classList.remove('hidden');
                    
                    var imgContainer = document.createElement('div');
                    imgContainer.className = 'node-image-container';
                    
                    var imgFrame = document.createElement('div');
                    imgFrame.className = 'node-image-frame';
                    
                    var img = document.createElement('img');
                    img.className = 'node-image';
                    img.src = data.imageUrl;
                    img.alt = data.title || 'Изображение';
                    
                    var caption = document.createElement('div');
                    caption.className = 'image-caption';
                    caption.innerText = '🔍 Нажмите для увеличения';
                    
                    imgFrame.appendChild(img);
                    imgFrame.appendChild(caption);
                    imgContainer.appendChild(imgFrame);
                    
                    imgContainer.onclick = function() {
                        self.openLightbox(data.imageUrl);
                    };
                    
                    imgWrapper.appendChild(imgContainer);
                }

                // ===== IMMEDIATE LOCK =====
                if (hasRequiredVideo) {
                    areaEl.classList.add('locked-controls');
                    
                    var lockOverlay = document.createElement('div');
                    lockOverlay.className = 'video-lock-overlay';
                    lockOverlay.innerHTML = '<div class="lock-icon">🔒</div><div class="lock-title">Просмотр обязателен</div><div class="lock-message">Для продолжения необходимо просмотреть видеоматериал</div>';
                    areaEl.appendChild(lockOverlay);
                    
                    this.videoLockState = {
                        controlsElement: areaEl,
                        overlayElement: lockOverlay,
                        unlockTimer: null,
                        manualUnlockTimer: null,
                        isLocked: true
                    };
                    
                    var manualUnlockDelay = (data.videoDuration || 30) * 1000;
                    this.videoLockState.manualUnlockTimer = setTimeout(function() {
                        if (self.videoLockState.isLocked && lockOverlay && lockOverlay.parentNode) {
                            var lockMessage = lockOverlay.querySelector('.lock-message');
                            if (lockMessage) lockMessage.innerText = 'Видеоматериал просмотрен?';
                            
                            var manualBtn = document.createElement('button');
                            manualBtn.className = 'manual-unlock-btn';
                            manualBtn.innerText = '✓ Подтвердить просмотр';
                            manualBtn.onclick = function(ev) {
                                ev.stopPropagation();
                                self.unlockVideoControls();
                            };
                            lockOverlay.appendChild(manualBtn);
                        }
                    }, manualUnlockDelay);
                }

                // ===== QUESTION NODE =====
                if (node.type === 'questionNode' || node.type === 'multipleChoiceNode') {
                    var isMulti = node.type === 'multipleChoiceNode';
                    var selected = {};
                    var answers = data.answers || [];
                    
                    for (var i = 0; i < answers.length; i++) {
                        (function(ans, idx) {
                            var card = document.createElement('div'); 
                            card.className = 'option-card';
                            var ansText = self.processText(ans.text);
                            card.innerHTML = '<span>' + ansText + '</span><div class="option-marker">' + (isMulti ? (selected[ans.id] ? '✓' : '') : String.fromCharCode(65 + idx)) + '</div>';
                            
                            card.onclick = function() {
                                if (isMulti) {
                                    if (selected[ans.id]) { 
                                        delete selected[ans.id]; 
                                        card.classList.remove('selected');
                                        card.querySelector('.option-marker').innerText = '';
                                    } else { 
                                        selected[ans.id] = true; 
                                        card.classList.add('selected');
                                        card.querySelector('.option-marker').innerText = '✓';
                                    }
                                    self.playSound('click');
                                } else {
                                    self.playSound('click'); 
                                    card.classList.add('selected');
                                    var children = areaEl.querySelectorAll('.option-card');
                                    for (var j = 0; j < children.length; j++) {
                                        children[j].style.pointerEvents = 'none';
                                    }
                                    setTimeout(function() { self.goToNext(node.id, ans.id); }, 500);
                                }
                            };
                            areaEl.appendChild(card);
                        })(answers[i], i);
                    }
                    
                    if (isMulti) {
                        var confirmBtn = document.createElement('button'); 
                        confirmBtn.className = 'military-btn w-full mt-4';
                        confirmBtn.innerText = data.buttonText || 'Подтвердить выбор';
                        confirmBtn.onclick = function() {
                            var correctIds = data.correctOptions || [];
                            var selectedKeys = Object.keys(selected);
                            var isCorrect = correctIds.length === selectedKeys.length;
                            if (isCorrect) {
                                for (var k = 0; k < correctIds.length; k++) {
                                    if (!selected[correctIds[k]]) { isCorrect = false; break; }
                                }
                            }
                            self.playSound(isCorrect ? 'success' : 'error');
                            self.goToNext(node.id, isCorrect ? 'correct' : 'incorrect');
                        };
                        areaEl.appendChild(confirmBtn);
                    }
                } 
                // ===== MATCHING NODE =====
                else if (node.type === 'matchingNode') {
                    var left = data.leftColumn || [];
                    var right = data.rightColumn || [];
                    var correct = data.correctPairs || [];
                    
                    this.state.temp.matching = { left: null, right: null, pairs: [] };
                    
                    var leftMap = {};
                    var rightMap = {};
                    for (var i = 0; i < left.length; i++) leftMap[left[i].id] = left[i];
                    for (var i = 0; i < right.length; i++) rightMap[right[i].id] = right[i];
                    
                    var matchContainer = document.createElement('div');
                    matchContainer.className = 'match-container';
                    
                    var matchGrid = document.createElement('div');
                    matchGrid.className = 'match-grid';
                    
                    var leftCol = document.createElement('div');
                    leftCol.className = 'match-column';
                    leftCol.id = 'left-col';
                    
                    var rightCol = document.createElement('div');
                    rightCol.className = 'match-column';
                    rightCol.id = 'right-col';
                    
                    var pairsBox = document.createElement('div');
                    pairsBox.className = 'match-pairs-box';
                    pairsBox.innerHTML = '<div class="match-pairs-title">Установленные соответствия</div><div id="match-pairs-list"></div>';
                    
                    function isUsed(id, side) {
                        var pairs = self.state.temp.matching.pairs;
                        for (var i = 0; i < pairs.length; i++) {
                            if (side === 'left' && pairs[i].leftId === id) return true;
                            if (side === 'right' && pairs[i].rightId === id) return true;
                        }
                        return false;
                    }
                    
                    function tryCommitPair() {
                        var l = self.state.temp.matching.left;
                        var r = self.state.temp.matching.right;
                        if (l && r) {
                            self.state.temp.matching.pairs.push({ leftId: l, rightId: r });
                            self.state.temp.matching.left = null;
                            self.state.temp.matching.right = null;
                            self.playSound('click');
                            renderMatching();
                        }
                    }
                    
                    function renderMatching() {
                        leftCol.innerHTML = '<div class="match-column-title">Объекты</div>';
                        rightCol.innerHTML = '<div class="match-column-title">Определения</div>';
                        
                        for (var i = 0; i < left.length; i++) {
                            (function(item) {
                                var card = document.createElement('div');
                                card.className = 'match-card';
                                
                                var used = isUsed(item.id, 'left');
                                var sel = self.state.temp.matching.left === item.id;
                                
                                if (used) card.classList.add('matched');
                                if (sel) card.classList.add('selected');
                                
                                if (item.imageUrl) {
                                    card.innerHTML = '<img src="' + item.imageUrl + '" alt=""><div>' + (item.text || '') + '</div>';
                                } else {
                                    card.innerText = item.text || item.id;
                                }
                                
                                if (!used) {
                                    card.onclick = function() {
                                        self.state.temp.matching.left = item.id;
                                        self.playSound('click');
                                        tryCommitPair();
                                        renderMatching();
                                    };
                                }
                                
                                leftCol.appendChild(card);
                            })(left[i]);
                        }
                        
                        for (var i = 0; i < right.length; i++) {
                            (function(item) {
                                var card = document.createElement('div');
                                card.className = 'match-card';
                                
                                var used = isUsed(item.id, 'right');
                                var sel = self.state.temp.matching.right === item.id;
                                
                                if (used) card.classList.add('matched');
                                if (sel) card.classList.add('selected');
                                
                                if (item.imageUrl) {
                                    card.innerHTML = '<img src="' + item.imageUrl + '" alt=""><div>' + (item.text || '') + '</div>';
                                } else {
                                    card.innerText = item.text || item.id;
                                }
                                
                                if (!used) {
                                    card.onclick = function() {
                                        self.state.temp.matching.right = item.id;
                                        self.playSound('click');
                                        tryCommitPair();
                                        renderMatching();
                                    };
                                }
                                
                                rightCol.appendChild(card);
                            })(right[i]);
                        }
                        
                        var pairsList = document.getElementById('match-pairs-list');
                        if (self.state.temp.matching.pairs.length === 0) {
                            pairsList.innerHTML = '<div class="match-empty">Выберите элемент слева, затем справа для создания пары</div>';
                        } else {
                            var html = '';
                            for (var i = 0; i < self.state.temp.matching.pairs.length; i++) {
                                var p = self.state.temp.matching.pairs[i];
                                var l = leftMap[p.leftId];
                                var r = rightMap[p.rightId];
                                html += '<div class="match-pair-row"><div>' + (l ? l.text : p.leftId) + '</div><div class="match-arrow">⟷</div><div>' + (r ? r.text : p.rightId) + '</div></div>';
                            }
                            pairsList.innerHTML = html;
                        }
                    }
                    
                    matchGrid.appendChild(leftCol);
                    matchGrid.appendChild(rightCol);
                    matchContainer.appendChild(matchGrid);
                    matchContainer.appendChild(pairsBox);
                    
                    var btnRow = document.createElement('div');
                    btnRow.style.cssText = 'display:flex; gap:12px; margin-top:20px;';
                    
                    var resetBtn = document.createElement('button');
                    resetBtn.className = 'military-btn secondary';
                    resetBtn.innerText = 'Сбросить';
                    resetBtn.onclick = function() {
                        self.state.temp.matching = { left: null, right: null, pairs: [] };
                        self.playSound('click');
                        renderMatching();
                    };
                    
                    var checkBtn = document.createElement('button');
                    checkBtn.className = 'military-btn';
                    checkBtn.style.flex = '1';
                    checkBtn.innerText = data.buttonText || 'Проверить';
                    checkBtn.onclick = function() {
                        var pairs = self.state.temp.matching.pairs;
                        if (pairs.length !== correct.length) {
                            self.playSound('error');
                            alert('Необходимо установить все соответствия (' + pairs.length + '/' + correct.length + ')');
                            return;
                        }
                        
                        var isOk = true;
                        for (var i = 0; i < correct.length; i++) {
                            var found = false;
                            for (var j = 0; j < pairs.length; j++) {
                                if (pairs[j].leftId === correct[i].leftId && pairs[j].rightId === correct[i].rightId) {
                                    found = true; break;
                                }
                            }
                            if (!found) { isOk = false; break; }
                        }
                        
                        self.playSound(isOk ? 'success' : 'error');
                        self.goToNext(node.id, isOk ? 'correct' : 'incorrect');
                    };
                    
                    btnRow.appendChild(resetBtn);
                    btnRow.appendChild(checkBtn);
                    matchContainer.appendChild(btnRow);
                    
                    areaEl.appendChild(matchContainer);
                    renderMatching();
                }
                // ===== TIMELINE NODE =====
                else if (node.type === 'timelineNode') {
                    var events = data.events || [];
                    if (!this.state.temp.timeline || this.state.temp.timelineNodeId !== node.id) {
                        this.state.temp.timeline = events.slice().sort(function() { return Math.random() - 0.5; });
                        this.state.temp.timelineNodeId = node.id;
                    }
                    
                    var timelineContainer = document.createElement('div');
                    timelineContainer.className = 'timeline-container';
                    timelineContainer.id = 'timeline-container';
                    
                    function renderTimeline() {
                        timelineContainer.innerHTML = '';
                        var list = self.state.temp.timeline;
                        
                        for (var i = 0; i < list.length; i++) {
                            (function(item, idx) {
                                var el = document.createElement('div');
                                el.className = 'timeline-item';
                                
                                var numEl = document.createElement('div');
                                numEl.className = 'timeline-number';
                                numEl.innerText = (idx + 1);
                                
                                var controls = document.createElement('div');
                                controls.className = 'timeline-controls';
                                
                                var upBtn = document.createElement('button');
                                upBtn.className = 'timeline-btn';
                                upBtn.innerHTML = '▲';
                                upBtn.onclick = function() { moveItem(idx, -1); };
                                
                                var downBtn = document.createElement('button');
                                downBtn.className = 'timeline-btn';
                                downBtn.innerHTML = '▼';
                                downBtn.onclick = function() { moveItem(idx, 1); };
                                
                                controls.appendChild(upBtn);
                                controls.appendChild(downBtn);
                                
                                var content = document.createElement('div');
                                content.className = 'timeline-content';
                                content.innerText = item.text;
                                
                                el.appendChild(numEl);
                                el.appendChild(controls);
                                el.appendChild(content);
                                timelineContainer.appendChild(el);
                            })(list[i], i);
                        }
                    }
                    
                    function moveItem(i, d) {
                        var list = self.state.temp.timeline;
                        var newIdx = i + d;
                        if (newIdx >= 0 && newIdx < list.length) {
                            var temp = list[i];
                            list[i] = list[newIdx];
                            list[newIdx] = temp;
                            self.playSound('click');
                            renderTimeline();
                        }
                    }
                    
                    renderTimeline();
                    areaEl.appendChild(timelineContainer);
                    
                    var checkBtn = document.createElement('button');
                    checkBtn.className = 'military-btn w-full mt-4';
                    checkBtn.innerText = data.buttonText || 'Проверить хронологию';
                    checkBtn.onclick = function() {
                        var currentIds = [];
                        var correctIds = [];
                        for (var i = 0; i < self.state.temp.timeline.length; i++) {
                            currentIds.push(self.state.temp.timeline[i].id);
                        }
                        for (var i = 0; i < events.length; i++) {
                            correctIds.push(events[i].id);
                        }
                        var isOk = JSON.stringify(currentIds) === JSON.stringify(correctIds);
                        self.playSound(isOk ? 'success' : 'error');
                        self.goToNext(node.id, isOk ? 'correct' : 'incorrect');
                    };
                    areaEl.appendChild(checkBtn);
                }
                // ===== TEXT INPUT NODE =====
                else if (node.type === 'textInputNode') {
                    var input = document.createElement('input'); 
                    input.className = 'military-input'; 
                    input.placeholder = 'Введите ответ...';
                    input.style.marginBottom = '15px';
                    areaEl.appendChild(input);
                    
                    var btn = document.createElement('button'); 
                    btn.className = 'military-btn w-full'; 
                    btn.innerText = data.buttonText || 'Проверить';
                    btn.onclick = function() {
                        var val = input.value.trim().toLowerCase(); 
                        var keyword = (data.keyword || '').toLowerCase();
                        var isCorrect = val.indexOf(keyword) !== -1; 
                        self.playSound(isCorrect ? 'success' : 'error');
                        self.goToNext(node.id, isCorrect ? 'correct' : 'incorrect');
                    };
                    areaEl.appendChild(btn);
                } 
                // ===== COLLECT INFO NODE =====
                else if (node.type === 'collectInfoNode') {
                    var fields = data.fields || [];
                    for (var i = 0; i < fields.length; i++) {
                        (function(field) {
                            var wrapper = document.createElement('div'); 
                            wrapper.style.marginBottom = '18px';
                            
                            var label = document.createElement('label'); 
                            label.style.cssText = 'display:block; font-family:Cinzel,serif; font-size:0.9rem; color:#586c48; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.1em;';
                            label.innerText = field.label;
                            
                            var input = document.createElement('input'); 
                            input.className = 'military-input'; 
                            input.type = field.type || 'text'; 
                            input.placeholder = field.label;
                            
                            if (self.state.variables[field.variableName]) {
                                input.value = self.state.variables[field.variableName];
                            }
                            
                            input.onchange = function(e) { 
                                self.state.variables[field.variableName] = e.target.value; 
                            };
                            
                            wrapper.appendChild(label); 
                            wrapper.appendChild(input); 
                            areaEl.appendChild(wrapper);
                        })(fields[i]);
                    }
                    
                    var btn = document.createElement('button'); 
                    btn.className = 'military-btn w-full'; 
                    btn.innerText = data.buttonText || 'Продолжить';
                    btn.onclick = function() { 
                        self.playSound('click'); 
                        self.updateProfile(); 
                        self.goToNext(node.id); 
                    };
                    areaEl.appendChild(btn);
                }
                // ===== ALLOCATOR NODE =====
                else if (node.type === 'allocatorNode') {
                    var maxTotal = data.maxTotal || 100;
                    var items = data.items || [];
                    
                    for (var i = 0; i < items.length; i++) {
                        (function(item) {
                            if (self.state.variables[item.variableName] === undefined) {
                                self.state.variables[item.variableName] = item.defaultValue || 0;
                            }
                            
                            var wrapper = document.createElement('div');
                            wrapper.className = 'allocator-item';
                            
                            var labelRow = document.createElement('div');
                            labelRow.className = 'allocator-label';
                            labelRow.innerHTML = '<span>' + self.processText(item.label) + '</span><span class="allocator-value" id="alloc-val-' + item.id + '">' + self.state.variables[item.variableName] + '</span>';
                            
                            var slider = document.createElement('input');
                            slider.type = 'range';
                            slider.className = 'military-slider';
                            slider.min = 0;
                            slider.max = maxTotal;
                            slider.value = self.state.variables[item.variableName];
                            
                            slider.oninput = function(e) {
                                self.state.variables[item.variableName] = parseInt(e.target.value);
                                var valEl = document.getElementById('alloc-val-' + item.id);
                                if (valEl) valEl.innerText = e.target.value;
                            };
                            
                            wrapper.appendChild(labelRow);
                            wrapper.appendChild(slider);
                            areaEl.appendChild(wrapper);
                        })(items[i]);
                    }
                    
                    var btn = document.createElement('button');
                    btn.className = 'military-btn w-full';
                    btn.innerText = data.buttonText || 'Подтвердить распределение';
                    btn.onclick = function() {
                        self.playSound('click');
                        self.goToNext(node.id);
                    };
                    areaEl.appendChild(btn);
                }
                // ===== FEEDBACK NODE =====
                else if (node.type === 'feedbackNode') {
                    if (data.isCorrect !== undefined) {
                        var feedbackBox = document.createElement('div');
                        feedbackBox.style.cssText = 'padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; ' + 
                            (data.isCorrect ? 'background: linear-gradient(180deg, #e8f5e9, #c8e6c9); border: 2px solid #4caf50;' : 'background: linear-gradient(180deg, #ffebee, #ffcdd2); border: 2px solid #f44336;');
                        feedbackBox.innerHTML = '<div style="font-family:Cinzel,serif; font-size:1.3rem; font-weight:bold; margin-bottom:10px;">' + 
                            (data.isCorrect ? '✓ Верно!' : '✗ Неверно') + '</div>';
                        areaEl.insertBefore(feedbackBox, areaEl.firstChild);
                    }
                    
                    var btn = document.createElement('button');
                    btn.className = 'military-btn w-full';
                    btn.innerText = data.buttonText || 'Продолжить';
                    btn.onclick = function() {
                        self.playSound('click');
                        self.goToNext(node.id);
                    };
                    areaEl.appendChild(btn);
                }
                // ===== DEFAULT (INFO NODE, etc.) =====
                else {
                    var btn = document.createElement('button'); 
                    btn.className = 'military-btn w-full'; 
                    btn.innerText = data.buttonText || 'Продолжить';
                    btn.onclick = function() { 
                        self.playSound('click'); 
                        self.goToNext(node.id); 
                    };
                    areaEl.appendChild(btn);
                }
            },

            updateProfile: function() {
                var self = this;
                var playerName = this.state.variables['playerName'] || this.state.variables['name'] || 'Курсант';
                document.getElementById('player-name').innerText = playerName;
                
                var rankInfo = this.getRankFromProgression(this.state.score);
                this.state.currentRank = rankInfo.name;
                this.state.currentLevel = rankInfo.level;
                
                document.getElementById('rank-badge').innerText = rankInfo.name;
                
                // Определяем должность/звание
                var title = 'Военная академия';
                if (rankInfo.level >= 14) title = 'Высшее командование';
                else if (rankInfo.level >= 10) title = 'Старший офицерский состав';
                else if (rankInfo.level >= 7) title = 'Младший офицерский состав';
                else if (rankInfo.level >= 5) title = 'Сержантский состав';
                else if (rankInfo.level >= 1) title = 'Рядовой состав';
                
                document.getElementById('player-title').innerText = title;
                
                var avatarUrl = this.state.variables['avatar_url'] || avatars[0];
                document.getElementById('player-avatar').src = avatarUrl;

                // Ресурсы
                var container = document.getElementById('resources-container');
                container.innerHTML = '';
                
                // Очки
                var scoreRow = document.createElement('div');
                scoreRow.className = 'resource-row';
                scoreRow.innerHTML = '<span class="resource-label">⭐ Боевые заслуги</span><span class="resource-value">' + this.state.score + '</span>';
                container.appendChild(scoreRow);
                
                // Уровень
                var levelRow = document.createElement('div');
                levelRow.className = 'resource-row';
                levelRow.innerHTML = '<span class="resource-label">📊 Уровень</span><span class="resource-value">' + rankInfo.level + '</span>';
                container.appendChild(levelRow);
                
                // Дополнительные переменные
                var varCount = 0;
                for (var k in this.state.variables) {
                    if (['playerName', 'name', 'avatar_url', 'score', 'level', 'rankName'].indexOf(k) !== -1) continue;
                    var v = this.state.variables[k];
                    if (v === undefined || v === null) continue;
                    if (varCount >= 3) break;
                    
                    var row = document.createElement('div');
                    row.className = 'resource-row';
                    row.innerHTML = '<span class="resource-label">' + k + '</span><span class="resource-value" style="color:#586c48;">' + v + '</span>';
                    container.appendChild(row);
                    varCount++;
                }
                
                // Медали
                var medalsContainer = document.getElementById('medals-container'); 
                medalsContainer.innerHTML = '';
                
                if (this.state.unlockedAchievements.length === 0) {
                    medalsContainer.innerHTML = '<span style="color:#999; font-size:0.85rem; font-style:italic;">Пока нет наград</span>';
                } else {
                    for (var i = 0; i < this.state.unlockedAchievements.length; i++) {
                        var ach = this.state.unlockedAchievements[i];
                        var m = document.createElement('div'); 
                        m.className = 'medal';
                        m.innerText = '🎖️'; 
                        m.title = ach;
                        medalsContainer.appendChild(m); 
                    }
                }
            },

            renderStatus: function(currentNode) {
                var display = document.getElementById('status-display');
                if (!currentNode) return;
                
                var nodeTitle = (currentNode.data && (currentNode.data.label || currentNode.data.title)) || 'Секретный объект';
                var rankInfo = this.getRankFromProgression(this.state.score);
                
                var html = '';
                
                // Текущая позиция
                html += '<div class="status-section">';
                html += '<div class="status-section-title">Текущая дислокация</div>';
                html += '<div class="status-row"><span class="status-label">Объект:</span><span class="status-value">' + this.processText(nodeTitle).substring(0, 30) + '</span></div>';
                
                var interactiveTypes = ['questionNode', 'multipleChoiceNode', 'textInputNode', 'matchingNode', 'timelineNode', 'allocatorNode'];
                if (interactiveTypes.indexOf(currentNode.type) !== -1) {
                    html += '<div class="status-row"><span class="status-label">Статус:</span><span class="status-value highlight">Ожидает решения</span></div>';
                }
                html += '</div>';
                
                // Личные данные
                html += '<div class="status-section">';
                html += '<div class="status-section-title">Личные данные</div>';
                html += '<div class="status-row"><span class="status-label">Звание:</span><span class="status-value">' + rankInfo.name + '</span></div>';
                html += '<div class="status-row"><span class="status-label">Уровень:</span><span class="status-value">' + rankInfo.level + '</span></div>';
                html += '<div class="status-row"><span class="status-label">Очки:</span><span class="status-value highlight">' + this.state.score + '</span></div>';
                html += '</div>';
                
                // Боевая статистика
                html += '<div class="status-section">';
                html += '<div class="status-section-title">Боевая статистика</div>';
                html += '<div class="status-row"><span class="status-label">Пройдено этапов:</span><span class="status-value">' + Object.keys(this.state.visitedNodes).length + '</span></div>';
                html += '<div class="status-row"><span class="status-label">Заданий выполнено:</span><span class="status-value">' + Object.keys(this.state.visitedInteractiveNodes).length + '</span></div>';
                
                if (this.state.unlockedAchievements.length > 0) {
                    html += '<div class="status-row"><span class="status-label">Награды:</span><span class="status-value">' + this.state.unlockedAchievements.length + ' 🎖️</span></div>';
                }
                html += '</div>';
                
                // Ключевые переменные
                var varsHtml = '';
                var varCount = 0;
                for (var k in this.state.variables) {
                    if (['playerName', 'name', 'avatar_url', 'level', 'rankName'].indexOf(k) !== -1) continue;
                    var v = this.state.variables[k];
                    if (v === undefined || v === null) continue;
                    if (typeof v === 'number' || (typeof v === 'string' && v.length < 20)) {
                        varsHtml += '<div class="status-row"><span class="status-label">' + k + ':</span><span class="status-value">' + v + '</span></div>';
                        varCount++;
                    }
                    if (varCount >= 5) break;
                }
                
                if (varCount > 0) {
                    html += '<div class="status-section">';
                    html += '<div class="status-section-title">Оперативные данные</div>';
                    html += varsHtml;
                    html += '</div>';
                }
                
                display.innerHTML = html;
                this.updateProgressBar();
            }
        };

        window.game = game;
        window.onload = function() { game.init(); };
    <\/script>
</body>
</html>
`;

export default armyTemplate;
