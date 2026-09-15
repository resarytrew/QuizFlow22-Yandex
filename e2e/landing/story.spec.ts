import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // These scenarios exercise the public landing, without production data or login.
  await page.route("**/api/quizzes?*", (route) => route.fulfill({ json: [] }));
  await page.goto("/");
});

test('section interactions, pricing and empty gallery remain usable', async ({ page }) => {
  await page.getByRole('tab', { name: /Знания в действии/ }).click();
  const sample = page.getByRole('tabpanel');
  await sample.getByRole('button', { name: /Попробовать на практике/ }).click();
  await expect(sample).toContainText('Верно. Практика');
  await page.getByRole('tab', { name: /Знания в действии/ }).press('ArrowDown');
  await expect(page.getByRole('tab', { name: /Своя история/ })).toBeFocused();
  await expect(sample).toContainText('Какое настроение');
  await page.getByRole('button', { name: 'Для клиента' }).click();
  await expect(page.locator('#scenario-lab')).toContainText('Помогите найти свой вариант.');
  await expect(page.locator('#scenario-lab').getByRole('link', { name: /Подобрать шаблон/ })).toHaveAttribute('href', /\/templates$/);
  await expect(page.locator('.studio-plan')).toHaveCount(3);
  await expect(page.locator('#templates')).toContainText('Ваша история может оказаться здесь');
  await expect(page.locator('.studio-footer a[href="/legal/privacy-policy.html"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("keeps the headline and CTA visible and plays both branches", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Собирайте\.\s*Связывайте\.\s*Оживляйте/,
  );
  await expect(page.locator(".story-intro .potok-button")).toBeInViewport();
  await page.getByRole("button", { name: "Запустить демо" }).click();
  const player = page.getByTestId("story-player");
  await player.getByRole("button", { name: "В горах", exact: true }).click();
  await player.getByRole("button", { name: "Первый раз", exact: true }).click();
  await expect(player.getByRole("heading")).toHaveText("Маршрут выходного дня");
  await player.getByRole("button", { name: "Начать заново" }).click();
  await player.getByRole("button", { name: "У моря", exact: true }).click();
  await player.getByRole("button", { name: "Спокойный", exact: true }).click();
  await expect(player.getByRole("heading")).toHaveText("Тихая бухта");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("chapter navigation works in both directions and mobile menu opens pricing", async ({
  page,
  isMobile,
}, info) => {
  await page.getByRole("button", { name: "02 Развилки" }).click();
  await expect(
    page.getByRole("heading", { name: /Один вопрос\.\s*Разные истории\./ }),
  ).toBeInViewport();
  if (!isMobile && info.project.name !== "reduced-motion") {
    await expect(page.locator(".story-stage")).toHaveClass(/chapter-1/);
    await page.getByRole("button", { name: "01 Идея" }).click();
    await expect(page.locator(".story-stage")).toHaveClass(/chapter-0/);
  }
  if (isMobile) {
    await page.getByText("Меню", { exact: true }).click();
    await page
      .getByRole("navigation", { name: "Мобильная навигация" })
      .getByText("Тарифы")
      .click();
    await expect(page.locator(".potok-mobile-menu")).not.toHaveAttribute(
      "open",
    );
    await expect(page.locator("#pricing-heading")).toBeInViewport();
  }
});
