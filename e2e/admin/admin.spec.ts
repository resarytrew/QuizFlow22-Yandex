import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixtures = () =>
  JSON.parse(readFileSync(".cache/admin-e2e.json", "utf8"));
for (const role of ["owner", "admin", "moderator", "support"]) {
  test(`${role}: permitted sections and persistence`, async ({
    page,
    context,
    isMobile,
  }) => {
    const f = fixtures();
    await context.addCookies([
      {
        name: "qf_session",
        value: f[role].token,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/#/admin/users", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Пользователи", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("E2E user", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "E2E user", exact: true }).click();
    const card = page.getByRole("dialog", { name: "Карточка пользователя" });
    await expect(
      card.getByText("user@e2e.invalid", { exact: true }),
    ).toBeVisible();
    await expect(
      card.getByRole("heading", { name: "Общая история", exact: true }),
    ).toBeVisible();
    await expect(card.getByRole("alert")).toHaveCount(0);
    if (["owner", "admin"].includes(role)) {
      await card
        .getByRole("button", { name: "Проверить оплату", exact: true })
        .click();
      await expect(card.getByRole("status")).toContainText("Оплачен");
      page.once("dialog", (d) => d.accept());
      await card
        .getByRole("button", { name: "Восстановить доступ", exact: true })
        .click();
      await expect(card.getByRole("status")).toContainText(
        /восстановлен|уже учтён/,
      );
      await expect(
        card.getByText("В системе: Оплачен", { exact: false }),
      ).toBeVisible();
    }
    await card.screenshot({
      path: `.cache/card-${role}-${isMobile ? "mobile" : "desktop"}.png`,
    });
    await card.getByRole("button", { name: "Закрыть", exact: true }).click();
    if (isMobile) {
      await page.getByRole("button", { name: "Разделы", exact: true }).click();
      await expect(
        page.getByRole("navigation", { name: "Разделы администрации" }),
      ).toBeVisible();
    }
    if (["owner", "admin"].includes(role)) {
      const userRow = page
        .getByRole("row")
        .filter({ has: page.getByText("E2E user", { exact: true }) });
      await userRow.getByRole("button", { name: "PRO", exact: true }).click();
      await expect(
        page.getByRole("dialog", { name: "Выдача PRO" }),
      ).toBeVisible();
      const grantResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith("/admin/grant-pro") &&
          response.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Выдать PRO", exact: true })
        .click();
      expect((await grantResponse).status()).toBe(200);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      page.once("dialog", (dialog) => dialog.accept("E2E account block"));
      await userRow
        .getByRole("button", { name: "Заблокировать", exact: true })
        .click();
      await expect(
        userRow.getByRole("button", { name: "Разблокировать", exact: true }),
      ).toBeVisible();
      await page.reload({ waitUntil: "domcontentloaded" });
      page.once("dialog", (dialog) => dialog.accept());
      await userRow
        .getByRole("button", { name: "Разблокировать", exact: true })
        .click();
      await expect(
        userRow.getByRole("button", { name: "Заблокировать", exact: true }),
      ).toBeVisible();
      await page.goto("/#/admin/promocodes", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "Промокоды", exact: true }),
      ).toBeVisible();
      const created = await page.request.post("/api/admin/promocode-create", {
        headers: { origin: "http://127.0.0.1:4178" },
        data: { code: `E2E-${role}-${isMobile}`, plan_id: "pro_monthly" },
      });
      expect(created.status()).toBe(200);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.getByText(`E2E-${role}-${isMobile}`.toUpperCase(), {
          exact: true,
        }),
      ).toBeVisible();
    }
    if (role === "moderator") {
      await page.goto("/#/admin/reports", { waitUntil: "domcontentloaded" });
      page.once("dialog", (dialog) => dialog.accept("E2E resolution"));
      const reportResponse = page.waitForResponse(
        (r) =>
          r.url().endsWith("/admin/report-status") &&
          r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Подтвердить", exact: true })
        .first()
        .click();
      expect((await reportResponse).status()).toBe(200);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("cell", { name: "Подтверждена", exact: true }),
      ).toBeVisible();
      await page.goto("/#/admin/quizzes", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByText("E2E moderation", { exact: true }),
      ).toBeVisible();
      const moderationResponse = page.waitForResponse(
        (r) =>
          r.url().endsWith("/admin/quiz-moderation") &&
          r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Одобрить", exact: true })
        .first()
        .click();
      expect((await moderationResponse).status()).toBe(200);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByText("Одобрен", { exact: true })).toBeVisible();
      await page.goto("/#/admin/finances", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "Доступ закрыт" }),
      ).toBeVisible();
    }
    if (role === "support") {
      await page.goto("/#/admin/support", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByText("E2E support", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Ответить", exact: true })
        .first()
        .click();
      await page
        .getByLabel("Текст", { exact: true })
        .fill("E2E persisted reply");
      await page.getByRole("button", { name: "Предпросмотр ответа" }).click();
      await page.getByRole("button", { name: "Отправить ответ" }).click();
      await expect(
        page.getByText("E2E persisted reply", { exact: true }).first(),
      ).toBeVisible();
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.getByText("E2E persisted reply", { exact: true }).first(),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Ответить", exact: true })
        .first()
        .click();
      await page.getByLabel("Действие", { exact: true }).selectOption("note");
      await page.getByLabel("Текст", { exact: true }).fill("E2E internal note");
      await page
        .getByRole("button", { name: "Сохранить", exact: true })
        .click();
      await expect(
        page.getByText("E2E internal note", { exact: true }).first(),
      ).toBeVisible();
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.getByText("E2E internal note", { exact: true }).first(),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Ответить", exact: true })
        .first()
        .click();
      await page.getByLabel("Действие", { exact: true }).selectOption("assign");
      await page
        .getByRole("button", { name: "Сохранить", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Работа с обращением" }),
      ).toHaveCount(0);
      await page.getByLabel("Назначенные мне").check();
      await expect(
        page.getByText("E2E support", { exact: true }),
      ).toBeVisible();
      await page.goto("/#/admin/finances", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "Доступ закрыт" }),
      ).toBeVisible();
    }
    if (isMobile)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: `.cache/admin-${role}-${isMobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

test('gallery loads compact cards and full quiz remains playable',async({page})=>{
 const response=page.waitForResponse(r=>r.url().includes('/api/quizzes?public=true&summary=true'));
 await page.goto('/#/public',{waitUntil:'domcontentloaded'});
 expect((await response).status()).toBe(200);
 await expect(page.getByText('E2E moderation',{exact:true})).toBeVisible();
 await expect(page.getByText('Ошибка загрузки',{exact:true})).toHaveCount(0);
 const f=fixtures();const detail=await page.request.get('/api/quizzes/'+f.quiz.id);
 expect(detail.status()).toBe(200);expect((await detail.json()).quiz_data).toHaveProperty('nodes');
});
