
const ww2Template = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Командный Пункт РККА — Интерактивный Квиз</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=PT+Serif:wght@400;700&family=PT+Sans:wght@400;700&family=Roboto+Condensed:wght@400;700&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.min.js" integrity="sha384-4373D3C40FD427C0A09AD7647B286C33F34FC104F30FC33302FC105BE048DF37354FC7DD1A278F3FC54DE83E12C657A0" crossorigin="anonymous"></script>
    <style>
        :root {
            /* Аутентичная палитра РККА */
            --color-red-army: #8b0000;
            --color-soviet-red: #cc0000;
            --color-gold-star: #d4af37;
            --color-military-khaki: #6b5d4b;
            --color-paper-old: #e8dcc4;
            --color-ink-black: #2a2418;
            --color-stamp-red: #a41e23;
            --color-map-green: #4a5c60;
        }
        /* Common styles can be added here if needed */
        body {
            background-color: var(--color-military-khaki);
            color: var(--color-ink-black);
            font-family: 'PT Serif', serif;
        }
        #quiz-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background-color: var(--color-paper-old);
            border: 2px solid var(--color-ink-black);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <div id="quiz-container">
        <div id="quiz-view"></div>
    </div>
    <div id="global-timer-display" style="display: none;"></div>
    
    <!-- Modal for Images -->
    <div id="image-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); align-items:center; justify-content:center;">
        <img id="modal-img-src" style="max-width:90%; max-height:90%;" />
    </div>

    <script>%%QUIZ_SCRIPT%%</script>
</body>
</html>
`;

export default ww2Template;
