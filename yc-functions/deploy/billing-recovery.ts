import { execFileSync } from 'node:child_process';
import { getPool, query } from '../_shared/db';
import { getYookassaPayment } from '../_shared/yookassa';
import { applyConfirmedPayment } from '../_shared/payment-application';

// Defaults to provider checks only. No checkout, capture or refund calls exist here.
async function main() {
  if (process.argv.includes('--from-yandex')) {
    const yc = process.env.YC_CLI || 'yc';
    const json = (args: string[]) => JSON.parse(execFileSync(yc, args, {encoding:'utf8',windowsHide:true}));
    const version = json(['serverless','function','version','list','--function-name','potok-api-quizzes','--limit','1','--format','json'])[0];
    if (!version) throw new Error('API function version not found');
    const cache = new Map<string, {entries: Array<{key:string;text_value?:string}>}>();
    for (const binding of version.secrets || []) {
      if (!/^(PG_|YOOKASSA_)/.test(binding.environment_variable)) continue;
      const key = binding.id + ':' + binding.version_id;
      if (!cache.has(key)) cache.set(key,json(['lockbox','payload','get','--id',binding.id,'--version-id',binding.version_id,'--format','json']));
      const value = cache.get(key)!.entries.find(e=>e.key===binding.key)?.text_value;
      if (value) process.env[binding.environment_variable]=value;
    }
  }
  for (const key of ['PG_HOST','PG_DATABASE','PG_USER','PG_PASSWORD','YOOKASSA_SHOP_ID','YOOKASSA_SECRET_KEY']) {
    if (!process.env[key]) throw new Error('Missing configuration: '+key);
  }
  const apply = process.argv.includes('--apply');
  const payments = await query<{id:string;created_at:Date;amount_kopecks:number;currency:string}>(
    `SELECT p.* FROM public.payments p
     WHERE p.provider='yookassa' AND p.provider_payment_id IS NOT NULL
       AND p.status IN ('pending','succeeded')
       AND NOT EXISTS (SELECT 1 FROM public.payment_applications a WHERE a.payment_id=p.id)
     ORDER BY p.created_at`,
  );
  let confirmed=0,applied=0,errors=0;
  for (const local of payments as Array<typeof payments[number] & {provider_payment_id:string;user_id:string;plan_id:string}>) {
    try {
      const provider = await getYookassaPayment(local.provider_payment_id);
      if (provider.status !== 'succeeded' || !provider.paid) continue;
      if (provider.id !== local.provider_payment_id || provider.amount.currency !== local.currency
          || !/^\d+\.\d{2}$/.test(provider.amount.value)
          || Math.round(Number(provider.amount.value)*100)!==local.amount_kopecks
          || (provider.metadata?.user_id && provider.metadata.user_id!==local.user_id)
          || (provider.metadata?.plan_id && provider.metadata.plan_id!==local.plan_id)
          || (provider.refunded_amount && Number(provider.refunded_amount.value)!==0)) throw new Error('payment_mismatch_or_refunded');
      confirmed++;
      const result = apply ? await applyConfirmedPayment(local.id,provider,'recovery') : null;
      if (result?.applied) applied++;
      console.log(JSON.stringify({payment_id:local.id,created_at:local.created_at,amount_kopecks:local.amount_kopecks,mode:apply?'apply':'dry-run',result:result || 'confirmed_unapplied'}));
    } catch (error) {
      errors++;
      console.error(JSON.stringify({payment_id:local.id,error:error instanceof Error?error.message:'unknown'}));
    }
  }
  console.log(JSON.stringify({checked:payments.length,confirmed,applied,errors,mode:apply?'apply':'dry-run'}));
  if (errors) process.exitCode=1;
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Recovery failed');process.exitCode=1;}).finally(()=>getPool().end());
