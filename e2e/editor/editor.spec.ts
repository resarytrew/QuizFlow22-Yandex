import { expect, test, type Page } from '@playwright/test';
const quizId = '11111111-1111-4111-8111-111111111111';
const user = { id: '22222222-2222-4222-8222-222222222222', email: 'owner@example.invalid', emailVerified: true, role: 'user', authLevel: 'normal' };
async function mockApi(page: Page, templateId: 'default' | 'screenQuiz' | 'importantTalks') {
  const quiz = { id: quizId, user_id: user.id, name: 'Проверка редактора', visibility: 'private', is_favorite: false, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', revision: 1,
    quiz_data: { templateId, currentQuizName: 'Проверка редактора', globalTimer: { enabled: false, duration: 0 }, designSettings: {},
      nodes: [
        { id: 'start', type: 'startNode', position: { x: 0, y: 0 }, data: { label: 'Старт' } },
        { id: 'question', type: 'questionNode', position: { x: 350, y: 0 }, data: { label: 'Вопрос', question: 'Какая планета красная?', answers: [{ id: 'mars', text: 'Марс', isCorrect: true }], correctAnswer: 'mars', ...(templateId === 'importantTalks' ? { importantTalks: { correctText: 'Старое объяснение' } } : {}) } },
        { id: 'result', type: 'resultNode', position: { x: 700, y: 0 }, data: { label: 'Результат', title: 'Готово' } },
      ], edges: [ { id: 's-q', source: 'start', target: 'question' }, { id: 'q-r', source: 'question', sourceHandle: 'mars', target: 'result' } ] } };
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { user } });
    if (path.endsWith('/billing/get-entitlement')) return route.fulfill({ json: { tier: 'pro', quizzes_limit: null, ai_questions_limit: 200 } });
    if (path.endsWith(`/quizzes/${quizId}`)) {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        if (body.quiz_data) quiz.quiz_data = body.quiz_data;
        quiz.revision += 1;
      }
      return route.fulfill({ json: quiz });
    }
    if (path.endsWith('/quizzes')) return route.fulfill({ json: [quiz] });
    return route.fulfill({ json: {} });
  });
  return () => JSON.stringify(quiz.quiz_data);
}

test('canvas, node inspector and design workspace', async ({ page }, info) => {
  await mockApi(page, 'default');
  await page.goto(`/#/editor/${quizId}`);
  await expect(page.getByRole('application', { name: 'Редактор квиза' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Представление редактора' })).toHaveCount(0);
  await expect(page.getByTestId('editor-settings-container')).toHaveAttribute('aria-hidden', 'true');
  await page.screenshot({ path: info.outputPath('canvas.png') });
  await page.locator('.react-flow__node[data-id="question"]').click();
  await expect(page.getByText('Настройки узла')).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Настройки блока' })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('inspector.png') });
  await page.getByRole('button', { name: 'Оформление', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Оформление квиза' })).toBeVisible();
  await expect(page.locator('iframe[title="Live Quiz Preview"]')).toBeVisible();
  await page.getByLabel('Экран предпросмотра').selectOption('question');
  const frame = page.locator('iframe[title="Live Quiz Preview"]').contentFrame();
  await expect(frame.locator('#quiz-view')).toContainText('Какая планета красная?');
  const observed = new Set<string>();
  for (const name of ['Светлый', 'Тёмный', 'Редакционный', 'Игровой', 'Строгий']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect.poll(async () => frame.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--bg-color').trim())).not.toBe('');
    await expect.poll(async () => frame.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--bg-color').trim())).not.toBe(Array.from(observed).at(-1) || '');
    observed.add(await frame.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--bg-color').trim()));
  }
  expect(observed.size).toBe(5);
  await page.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect.poll(async () => frame.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--bg-color').trim())).toBe('#edf0ff');
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect.poll(async () => frame.locator('html').evaluate(el => getComputedStyle(el).getPropertyValue('--bg-color').trim())).toBe('#eceff1');
  await page.getByLabel('Размер предпросмотра').selectOption('mobile');
  await expect.poll(async () => frame.locator('#quiz-view').evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(200);
  await page.screenshot({ path: info.outputPath('design.png') });
  await page.getByRole('button', { name: 'Вернуться к схеме', exact: true }).click();
  await expect(page.getByText('Настройки узла')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('screen quiz uses selected scene and local override', async ({ page }, info) => {
  const storedData = await mockApi(page, 'screenQuiz');
  await page.goto(`/#/editor/${quizId}`);
  await expect(page.getByRole('application', { name: 'Редактор квиза' })).toBeVisible();
  await page.getByRole('button', { name: 'Экранная викторина', exact: true }).click();
  const workspace = page.getByRole('region', { name: 'Редактор экранной викторины' });
  await expect(workspace).toBeVisible();
  await workspace.getByLabel('Область настроек').selectOption('question');
  await expect(workspace.getByText('Общая настройка', { exact: true }).first()).toBeVisible();
  await workspace.getByRole('button', { name: 'Переопределить: Длительность таймера' }).click();
  const duration = workspace.getByLabel('Длительность таймера', { exact: true });
  await duration.fill('45'); await duration.blur();
  await expect(duration).toHaveValue('45');
  await expect.poll(storedData, { timeout: 10000 }).toContain('\"timerSeconds\":45');
  await expect(workspace.locator('iframe[title="Live Quiz Preview"]').contentFrame().locator('#sq-scene')).toContainText('Какая планета красная?');
  if (info.project.name !== 'desktop') {
    await workspace.getByRole('button', { name: 'Показать предпросмотр' }).click();
    await expect(workspace.locator('iframe[title="Live Quiz Preview"]')).toBeInViewport();
  }
  await page.screenshot({ path: info.outputPath('screen-quiz.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Экранная викторина', exact: true }).click();
  const restored = page.getByRole('region', { name: 'Редактор экранной викторины' });
  await restored.getByLabel('Область настроек').selectOption('question');
  await expect(restored.getByLabel('Длительность таймера', { exact: true })).toHaveValue('45');
  await restored.getByRole('button', { name: 'Вернуть общее: Длительность таймера' }).click();
  await expect(restored.getByLabel('Длительность таймера', { exact: true })).toHaveValue('30');
  await expect.poll(storedData, { timeout: 10000 }).not.toContain('\"timerSeconds\":45');
});


test('legacy theme migration exposes an original backup', async ({ page }) => {
  const storedData = await mockApi(page, 'importantTalks');
  await page.goto(`/#/editor/${quizId}`);
  const warning = page.getByRole('alert').filter({ hasText: 'Проект перенесён на базовый шаблон' });
  await expect(warning).toBeVisible();
  await warning.getByText('Неперенесённые поля: 1').click();
  await expect(warning).toContainText('nodes.question.importantTalks.correctText');
  const download = page.waitForEvent('download');
  await warning.getByRole('button', { name: 'Скачать исходный JSON' }).click();
  expect((await download).suggestedFilename()).toBe('original-quiz-backup.json');
  await warning.getByRole('button', { name: 'Закрыть' }).click();
  await page.locator('.react-flow__node[data-id="question"]').click();
  const question = page.getByLabel('Текст вопроса', { exact: true });
  await question.fill('Изменённый вопрос');
  await expect.poll(storedData, { timeout: 10000 }).toContain('"legacyThemeMigration"');
  expect(storedData()).toContain('Старое объяснение');
  expect(storedData()).toContain('Изменённый вопрос');
});

