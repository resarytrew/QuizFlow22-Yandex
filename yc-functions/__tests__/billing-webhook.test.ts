import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query:vi.fn(), queryOne:vi.fn(), apply:vi.fn(), provider:vi.fn() }));
vi.mock('../_shared/db',()=>({query:mocks.query,queryOne:mocks.queryOne,withTransaction:async (fn:()=>unknown)=>fn()}));
vi.mock('../_shared/payment-application',()=>({applyConfirmedPayment:mocks.apply}));
vi.mock('../_shared/yookassa',async importOriginal=>({...await importOriginal<typeof import('../_shared/yookassa')>(),getYookassaPayment:mocks.provider}));
beforeEach(()=>{
  vi.resetModules();
  vi.stubEnv('BILLING_WEBHOOK_SECRET','webhook-test-secret');
  mocks.query.mockReset().mockResolvedValue([]);
  mocks.queryOne.mockReset().mockResolvedValueOnce(null).mockResolvedValueOnce({id:'local-payment'});
  mocks.provider.mockReset().mockResolvedValue({id:'provider-payment',status:'succeeded'});
  mocks.apply.mockReset().mockResolvedValue({applied:true});
});
afterEach(()=>vi.unstubAllEnvs());
const event = (url:string,key?:string)=>({
  httpMethod:'POST',headers:{'x-forwarded-for':'185.71.76.1'},url,
  pathParameters:{action:'yookassa-webhook'},queryStringParameters:key?{key}:undefined,
  body:JSON.stringify({type:'notification',event:'payment.succeeded',object:{id:'provider-payment'}}),
});
it.each([
  ['/api/billing/yookassa-webhook?key=webhook-test-secret',undefined],
  ['/api/billing/yookassa-webhook','webhook-test-secret'],
  ['https://api.mykviz.ru/api/billing/yookassa-webhook?key=webhook-test-secret',undefined],
])('accepts a notification with gateway URL %s',async(url,key)=>{
  const {handler}=await import('../api-billing');
  const result=await handler(event(url,key));
  expect(result.statusCode).toBe(200);
  expect(mocks.apply).toHaveBeenCalledWith('local-payment',expect.objectContaining({status:'succeeded'}),'webhook');
  expect(mocks.query.mock.calls.some(([sql])=>sql.includes('processed_at = now()'))).toBe(true);
});
it('rejects the wrong secret before touching provider or database',async()=>{
  const {handler}=await import('../api-billing');
  expect((await handler(event('/api/billing/yookassa-webhook?key=wrong'))).statusCode).toBe(403);
  expect(mocks.queryOne).not.toHaveBeenCalled();
  expect(mocks.provider).not.toHaveBeenCalled();
});
