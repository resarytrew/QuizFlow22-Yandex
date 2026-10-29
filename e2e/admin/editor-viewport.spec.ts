import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.beforeEach(async ({ context }) => {
  const fixtures = JSON.parse(readFileSync('.cache/admin-e2e.json', 'utf8'));
  await context.addCookies([{name:'qf_session',value:fixtures.user.token,domain:'127.0.0.1',path:'/'}]);
});

async function expectStartCentered(page: Page) {
  const start=page.locator('.react-flow__node[data-id="start"]');
  await expect(start).toBeVisible();
  await expect.poll(async()=>{
    const node=await start.boundingBox();
    const canvas=await page.locator('.react-flow').boundingBox();
    if(!node||!canvas) return 10000;
    return Math.max(Math.abs(node.x+node.width/2-canvas.x-canvas.width/2),Math.abs(node.y+node.height/2-canvas.y-canvas.height/2));
  }).toBeLessThan(5);
  expect(await start.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(bounds.x+bounds.width/2,bounds.y+bounds.height/2));
  })).toBe(true);
}

test('a new quiz opens with Start centered on the canvas', async ({ page, isMobile }) => {
  await page.goto('/#/editor', {waitUntil:'networkidle'});
  await expectStartCentered(page);
  await page.screenshot({path:`.cache/editor-viewport-${isMobile?'mobile':'desktop'}.png`});
});

test('adding a second node and the first autosave preserve the camera', async ({ page, isMobile }) => {
  test.skip(isMobile,'Desktop drag-and-drop regression');
  let releaseSave:()=>void=()=>{};
  const saveGate=new Promise<void>(resolve=>{releaseSave=resolve;});
  await page.route('**/api/quizzes',async route=>{
    if(route.request().method()==='POST') await saveGate;
    await route.continue();
  });
  await page.goto('/#/editor',{waitUntil:'domcontentloaded'});
  await page.getByTitle('По размеру экрана', {exact:false}).click();
  await expectStartCentered(page);
  const start=page.locator('.react-flow__node[data-id="start"]');
  await expect(start).toBeInViewport();
  const pane=page.locator('.react-flow__pane');
  const bounds=(await pane.boundingBox())!;
  const target={x:bounds.x+bounds.width/2+120,y:bounds.y+bounds.height/2+100};
  await page.getByTitle('Перетащите: Вопрос',{exact:true}).first().dragTo(pane,{targetPosition:{x:target.x-bounds.x,y:target.y-bounds.y}});
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  const viewport=page.locator('.react-flow__viewport');
  const before=await viewport.getAttribute('style');
  releaseSave();
  await expect(page).toHaveURL(/#\/editor\/[\w-]+$/);
  await expect(start).toBeInViewport();
  await expect(page.locator('.react-flow__node-questionNode')).toBeInViewport();
  await expect(viewport).toHaveAttribute('style',before!);
  await page.screenshot({path:'.cache/editor-after-first-save.png'});
});

test('an existing quiz with distant coordinates opens in view', async ({page}) => {
  await page.goto('/',{waitUntil:'networkidle'});
  const response=await page.request.post('/api/quizzes',{
    headers:{Origin:'http://127.0.0.1:4178'},
    data:{name:'Viewport distant nodes',quiz_data:{nodes:[
      {id:'far-start',type:'startNode',position:{x:5000,y:-2000},data:{label:'Старт'}},
      {id:'far-result',type:'resultNode',position:{x:5300,y:-1800},data:{label:'Результат'}},
    ],edges:[]}},
  });
  expect(response.status()).toBe(201);
  const quiz=await response.json();
  await page.goto('/#/editor/'+quiz.id,{waitUntil:'networkidle'});
  await expect(page.locator('.react-flow__node[data-id="far-start"]')).toBeInViewport();
  await expect(page.locator('.react-flow__node[data-id="far-result"]')).toBeInViewport();
});
