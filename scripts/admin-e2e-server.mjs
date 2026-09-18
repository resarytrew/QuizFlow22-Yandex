import { fileURLToPath } from "node:url";
import { createServer as createHttpServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID, randomBytes, createHash } from "node:crypto";
const require = createRequire(
  new URL("../yc-functions/package.json", import.meta.url),
);
if (process.env.PG_DATABASE !== "quizflow_admin_test")
  throw new Error("E2E requires isolated quizflow_admin_test database");
process.env.PG_DISABLE_SSL = "true";
process.env.AUTH_COOKIE_SECURE = "false";
process.env.SESSION_PEPPER = "admin-e2e-test";
process.env.VITE_API_URL = "/api";
process.env.ALLOWED_ORIGINS = "http://127.0.0.1:4178";
const { Pool } = require("pg");
const db = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});
await db.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
for (const path of [
  "yc_migration.sql",
  "yc-functions/migrations/003_quizflow_auth.sql",
  "yc-functions/migrations/004_admin_stabilization.sql",
    "yc-functions/migrations/005_admin_workspace.sql",
    "yc-functions/migrations/006_gallery_moderation.sql",
    "yc-functions/migrations/007_editor_versions.sql",
])
  await db.query(readFileSync(path, "utf8"));
const fixtures = {};
for (const role of ["owner", "admin", "moderator", "support", "user"]) {
  const id = randomUUID(),
    token = randomBytes(32).toString("base64url");
  await db.query(
    "INSERT INTO public.users(id,email,email_verified_at) VALUES($1,$2,now())",
    [id, role + "@e2e.invalid"],
  );
  await db.query(
    "INSERT INTO public.profiles(user_id,account_code,display_name) VALUES($1,$2,$3)",
    [id, String(200000 + Object.keys(fixtures).length), "E2E " + role],
  );
  if (role !== "user")
    await db.query(
      "INSERT INTO public.admin_staff(user_id,role) VALUES($1,$2)",
      [id, role],
    );
  await db.query(
    "INSERT INTO public.auth_sessions(user_id,token_hash,expires_at,mfa_verified_at) VALUES($1,$2,now()+interval '1 day',now())",
    [id, createHash("sha256").update(token).digest("hex")],
  );
  fixtures[role] = { id, token };
}
fixtures.quiz = (
  await db.query(
    "INSERT INTO public.quizzes(user_id,name,visibility,quiz_data) VALUES($1,'E2E moderation','public','{\"nodes\":[],\"edges\":[]}'::jsonb) RETURNING id",
    [fixtures.user.id],
  )
).rows[0];
fixtures.ticket = (
  await db.query(
    "INSERT INTO public.support_tickets(user_id,subject,message) VALUES($1,'E2E support','Please help with this test') RETURNING id",
    [fixtures.user.id],
  )
).rows[0];
fixtures.report = (
  await db.query(
    "INSERT INTO public.quiz_reports(quiz_id,reporter_user_id,reason) VALUES($1,$2,'other') RETURNING id",
    [fixtures.quiz.id, fixtures.user.id],
  )
).rows[0];
fixtures.payment=(await db.query("INSERT INTO public.payments(user_id,plan_id,amount_kopecks,provider_payment_id) VALUES($1,'pro_monthly',39900,'e2e-payment-only') RETURNING id",[fixtures.user.id])).rows[0];
const originalFetch=globalThis.fetch;
globalThis.fetch=async (input,options)=>{
 if(String(input)==='https://api.yookassa.ru/v3/payments/e2e-payment-only') return new Response(JSON.stringify({id:'e2e-payment-only',status:'succeeded',paid:true,amount:{value:'399.00',currency:'RUB'},metadata:{user_id:fixtures.user.id,plan_id:'pro_monthly'}}),{status:200,headers:{'content-type':'application/json'}});
 return originalFetch(input,options);
};
await db.end();
mkdirSync(".cache", { recursive: true });
writeFileSync(".cache/admin-e2e.json", JSON.stringify(fixtures));
const { build } = require("esbuild");
await build({
  entryPoints: ["yc-functions/api-router/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: ".cache/admin-e2e-router.cjs",
});
const { handler } = require(
  fileURLToPath(new URL("../.cache/admin-e2e-router.cjs", import.meta.url)),
);
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "spa",
});
const server = createHttpServer(async (req, res) => {
  if (req.url.startsWith("/api/")) {
    let body = "";
    for await (const chunk of req) body += chunk;
    const url = new URL(req.url, "http://127.0.0.1:4178");
    const result = await handler({
      httpMethod: req.method,
      path: url.pathname,
      headers: req.headers,
      body,
      queryStringParameters: Object.fromEntries(url.searchParams),
      requestContext: { http: { sourceIp: "127.0.0.1" } },
    });
    res.writeHead(result.statusCode, result.headers);
    res.end(result.body);
    return;
  }
  vite.middlewares(req, res, () => {
    res.writeHead(404);
    res.end();
  });
});
server.listen(4178, "127.0.0.1");
