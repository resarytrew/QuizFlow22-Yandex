import { Client } from "pg";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

type Binding = {
  environment_variable: string;
  id: string;
  version_id: string;
  key: string;
};
async function main() {
  const env = { ...process.env };
  if (process.argv.includes("--from-yandex")) {
    const yc = process.env.YC_CLI || "yc";
    const json = (args: string[]) =>
      JSON.parse(
        execFileSync(yc, args, { encoding: "utf8", windowsHide: true }),
      );
    const versions = json([
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
    const cache = new Map<
      string,
      { entries: Array<{ key: string; text_value?: string }> }
    >();
    for (const binding of (versions[0].secrets || []) as Binding[]) {
      if (!binding.environment_variable.startsWith("PG_")) continue;
      const key = binding.id + ":" + binding.version_id;
      if (!cache.has(key))
        cache.set(
          key,
          json([
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
      const entry = cache
        .get(key)!
        .entries.find((item) => item.key === binding.key);
      if (entry?.text_value)
        env[binding.environment_variable] = entry.text_value;
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
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    await client.query("SET lock_timeout='10s'; SET statement_timeout='120s'");
    const schema =
      await client.query(`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'
    AND table_name IN ('admin_audit_log','auth_sessions','admin_pro_grants','quizzes') ORDER BY table_name,column_name`);
    console.log(
      JSON.stringify({ event: "admin_schema_preflight", columns: schema.rows }),
    );
    if (!process.argv.includes("--apply")) return;
    const sql = readFileSync(
      path.join(__dirname, "004_admin_stabilization.sql"),
      "utf8",
    );
    const checksum = createHash("sha256").update(sql).digest("hex");
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('quizflow-schema-migrations',0))",
    );
    await client.query(
      "CREATE TABLE IF NOT EXISTS public.schema_migrations(version text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const prior = await client.query(
      "SELECT checksum FROM public.schema_migrations WHERE version='004_admin_stabilization'",
    );
    if (prior.rows.length) {
      if (prior.rows[0].checksum !== checksum)
        throw new Error("migration_checksum_mismatch");
      await client.query("COMMIT");
      console.log(
        JSON.stringify({ event: "admin_migration", status: "already_applied" }),
      );
      return;
    }
    // The runner owns the transaction so the schema and version marker commit atomically.
    await client.query(
      sql.replace(/^BEGIN;\s*/, "").replace(/COMMIT;\s*$/, ""),
    );
    await client.query(
      "INSERT INTO public.schema_migrations(version,checksum) VALUES('004_admin_stabilization',$1)",
      [checksum],
    );
    await client.query("COMMIT");
    console.log(
      JSON.stringify({ event: "admin_migration", status: "applied", checksum }),
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error(
      JSON.stringify({
        event: "admin_migration_failed",
        code: (error as { code?: string }).code || "migration_failed",
      }),
    );
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
void main().catch(() => {
  console.error("admin_migration_failed");
  process.exitCode = 1;
});
