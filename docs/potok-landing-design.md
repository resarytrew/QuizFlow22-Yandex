# Поток: главная страница

Палитра обновлена по референсу «Разговоры о важном»: фон #F5F5F5, белые поверхности, текст #383838, фуксия #EB058C, голубые связи #48A9F3. Для мелкого акцентного текста используется более контрастный #BD0875. Композиция и логика прокрутки сохранены.

FlowStory содержит закреплённое полотно из трёх глав. Прокрутка меняет главу; React Flow приближает ветку, затем открывается интерактивный пример. На ширине до 900 px и при prefers-reduced-motion главы идут обычным потоком. Прокрутка колёсиком не перехватывается графом. Невидимые главы исключены из фокуса через inert.

Ноды StartNode, QuestionNode и ResultNode импортируются из редактора, визуальная тема ограничена .story-canvas. storyData.ts — единый граф для полотна и демо. Демо локальное: не создаёт проекты и не отправляет ответы на сервер.

Проверки: npm run typecheck; npm test; npm run build; npm run test:landing:e2e. Браузерные проверки включены в общий verify workflow.

## Изображения

Созданы встроенным imagegen, преобразованы в WebP для сайта. Изображения UI не встроены: текст, ноды и кнопки рендерятся компонентами.

- public/assets/landing/mountains.webp — фон и горные результаты.
- public/assets/landing/coast.webp — морские результаты.
- public/assets/landing/potok-mark.svg — векторный знак по выбранному направлению.

### Промпт mountains

Create a single cinematic photorealistic landscape photograph, wide 16:9. Jagged alpine mountain ridges at warm amber sunrise, dark graphite rocky foreground lower left, layers of distant mountains and mist, magnificent natural light hitting upper peaks, subdued sage valleys. Premium travel editorial photography, credible natural geology, fine details, no fantasy, no text, no logo, no UI, no frame, no people. Dark left half suitable for white heading overlay, luminous mountain peak on right. Used as a full bleed background and photo inside a node for the Поток website.

### Промпт coast

Single realistic premium editorial landscape photograph, wide 16:9. Secluded Mediterranean cove, clear muted emerald water, cream rocks, dark coastal pines, warm late-afternoon sun, warm graphite shadows. Beautiful layered composition, small waves on sand, no people, no buildings, no text, no logo, no borders. Sophisticated cinematic travel photography used as an interactive travel quiz result image.

## Остальные секции

StudioSections: интерактивная витрина возможностей, переключаемые контексты сценариев, маршрут публикации, автор и финальный блок. Тарифы используют существующий buildAllPlans; тарифные условия и переходы в billing сохранены. Пустая подборка предлагает перейти к шаблонам, ошибка загрузки — к галерее.

Дополнительное изображение public/assets/landing/workshop.webp создано встроенным imagegen и оптимизировано в WebP. Промпт: Natural editorial photograph for a creative educational website. Overhead oblique close-up of a real working desk in daylight: an open cream notebook with a few abstract unlettered pencil lines, a coral pencil, a folded topographic paper map, two bright magenta index cards, a small blue translucent ruler and a plain glass of water partly outside frame. Offwhite matte table, asymmetrical composition, authentic subtle wear, tactile paper, restrained pink and blue accent, photographic realism, sophisticated magazine art direction, soft window shadows. No people, no hands, no readable text, no logos, no computer, no cartoon, no 3D render, no glowing effects. Wide horizontal photograph 3:2.
