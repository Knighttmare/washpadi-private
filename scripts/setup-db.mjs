import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const schemaPath = fileURLToPath(new URL("../src/db/schema.sql", import.meta.url));
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is missing. Pull Vercel environment variables into .env.local first.");
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 1 });
try {
  const schema = await readFile(schemaPath, "utf8");
  await pool.query(schema);
  console.log("WashPadi tables are ready.");
} catch {
  console.error("Could not create WashPadi tables. Check the Neon connection and schema permissions.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
