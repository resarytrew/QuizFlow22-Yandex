import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("editor preserves metadata, edits transitions and previews the saved scenario", async ({
  page,
  context,
  isMobile,
}) => {
  test.setTimeout(60000);
  const fixtures = JSON.parse(readFileSync(".cache/admin-e2e.json", "utf8"));
  await context.addCookies([
    {
      name: "qf_session",
      value: fixtures.user.token,
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
  await page.goto("/", { waitUntil: "networkidle" });
  const create = await page.request.post("/api/quizzes", {
    headers: { Origin: "http://127.0.0.1:4178" },
    data: {
      name: "Editor reliability",
      quiz_data: {
        description: "Description survives",
        keywords: ["editor-test"],
        nodes: [
          {
            id: "s",
            type: "startNode",
            position: { x: 0, y: 0 },
            data: { label: "Start" },
          },
          {
            id: "q",
            type: "questionNode",
            position: { x: 300, y: 0 },
            data: {
              label: "Question",
              question: "Test question",
              answers: [{ id: "a", text: "Yes" }],
            },
          },
          {
            id: "r",
            type: "resultNode",
            position: { x: 600, y: 0 },
            data: { label: "Finish", message: "Done" },
          },
        ],
        edges: [
          { id: "sq", source: "s", target: "q" },
          { id: "qr", source: "q", sourceHandle: "a", target: "r" },
        ],
      },
    },
  });
  expect(create.status()).toBe(201);
  const quiz = await create.json();
  await page.goto("/#/editor/" + quiz.id, { waitUntil: "networkidle" });
  const name = page.getByPlaceholder("Без названия", { exact: true });
  await name.fill("Editor renamed");
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/quizzes/" + quiz.id)).json()).name,
    )
    .toBe("Editor renamed");
  const saved = await (
    await page.request.get("/api/quizzes/" + quiz.id)
  ).json();
  expect(saved.quiz_data.description).toBe("Description survives");
  expect(saved.quiz_data.keywords).toEqual(["editor-test"]);
  await page.getByRole("tab", { name: "Вопросы", exact: true }).click();
  await page
    .getByRole("button", { name: /Test question/ })
    .filter({ has: page.locator("strong") })
    .click();
  await page.getByRole("tab", { name: "Переходы", exact: true }).click();
  await expect(page.getByLabel("Переход: Yes", { exact: true })).toHaveValue(
    "r",
  );
  await page
    .getByRole("button", { name: "Вставить вопрос между блоками", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/quizzes/" + quiz.id)).json())
          .quiz_data.nodes.length,
    )
    .toBe(4);
  if (isMobile)
    await page
      .getByRole("navigation", { name: "Панели редактора" })
      .getByRole("button", { name: "Холст", exact: true })
      .click();
  await page.getByRole("tab", { name: /Проверка/ }).click();
  await expect(
    page.getByText("Структурных ошибок не найдено.", { exact: false }),
  ).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Вопросы", exact: true }).click();
  await expect(page.getByRole("tabpanel").locator("article")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Пройти квиз", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Редактировать текущий блок",
      exact: true,
    }),
  ).toBeVisible({ timeout: 15000 });
  await page
    .getByRole("button", { name: "Вернуться к схеме", exact: true })
    .click();
  await page.getByRole("tab", { name: "Вопросы", exact: true }).click();
  await page.route('**/api/quizzes/'+quiz.id, async route => {
    if(route.request().method()==='PUT') await route.abort('failed');
    else await route.continue();
  });
  await name.fill('Offline draft');
  await expect(page.getByTestId('editor-save-status')).toContainText('Ошибка сохранения',{timeout:10000});
  expect((await (await page.request.get('/api/quizzes/'+quiz.id)).json()).name).toBe('Editor renamed');
  await page.unroute('**/api/quizzes/'+quiz.id);
  await page.getByTestId('editor-save-status').getByRole('button').click();
  await page.getByRole('button',{name:'Сохранить на сервере',exact:true}).click();
  await expect.poll(async()=> (await (await page.request.get('/api/quizzes/'+quiz.id)).json()).name).toBe('Offline draft');
  await page.getByRole('button',{name:'Закрыть',exact:true}).click();
  await page.request.delete('/api/quizzes/'+quiz.id,{headers:{Origin:'http://127.0.0.1:4178'}});
  await page.screenshot({
    path: ".cache/editor-" + (isMobile ? "mobile" : "desktop") + ".png",
  });
});
