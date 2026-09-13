import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(
  new URL("../yc-functions/package.json", import.meta.url),
);
const { Client } = require("pg");
const env = { ...process.env };
if (process.argv.includes("--from-yandex")) {
  const yc = process.env.YC_CLI || "yc";
  const run = (args) =>
    JSON.parse(execFileSync(yc, args, { encoding: "utf8", windowsHide: true }));
  const versions = run([
    "serverless",
    "function",
    "version",
    "list",
    "--function-name",
    "potok-api-quizzes",
    "--limit",
    "1",
    "--format",
    "json",
  ]);
  const version = versions[0];
  console.log(
    JSON.stringify({
      function_version: version.id,
      runtime: version.runtime,
      created_at: version.created_at,
    }),
  );
  const secrets = new Map();
  for (const binding of version.secrets || []) {
    if (!binding.environment_variable.startsWith("PG_")) continue;
    const cacheKey = binding.id + ":" + binding.version_id;
    if (!secrets.has(cacheKey))
      secrets.set(
        cacheKey,
        run([
          "lockbox",
          "payload",
          "get",
          "--id",
          binding.id,
          "--version-id",
          binding.version_id,
          "--format",
          "json",
        ]),
      );
    const entry = secrets
      .get(cacheKey)
      .entries.find((item) => item.key === binding.key);
    if (entry?.text_value) env[binding.environment_variable] = entry.text_value;
  }
}
const client = new Client({
  host: env.PG_HOST,
  port: Number(env.PG_PORT || 6432),
  database: env.PG_DATABASE,
  user: env.PG_USER,
  password: env.PG_PASSWORD,
  ssl:
    env.PG_DISABLE_SSL === "true"
      ? false
      : { rejectUnauthorized: Boolean(env.PG_CA_CERT), ca: env.PG_CA_CERT },
  connectionTimeoutMillis: 7000,
});
try {
  await client.connect();
  await client.query("BEGIN READ ONLY");
  const columns =
    await client.query(`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public'
 AND table_name IN ('admin_audit_log','admin_staff','profiles','subscriptions','entitlements','admin_pro_grants','quizzes','auth_sessions') ORDER BY table_name,ordinal_position`);
  const indexes = await client.query(
    `SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('subscriptions','quizzes','admin_pro_grants')`,
  );
  const permissions = await client.query(
    "SELECT role,permission FROM public.admin_role_permissions ORDER BY role,permission",
  );
  const routines = await client.query(
    `SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_name IN ('get_effective_entitlement','refresh_effective_entitlement')`,
  );
  console.log(
    JSON.stringify(
      {
        columns: columns.rows,
        indexes: indexes.rows,
        permissions: permissions.rows,
        routines: routines.rows,
      },
      null,
      2,
    ),
  );
  await client.query("ROLLBACK");
} catch (error) {
  console.error("Schema inspection failed:", error.code || error.name);
  process.exitCode = 1;
} finally {
  await client.end();
}
