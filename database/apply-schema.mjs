import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or POSTGRES_URL is required.");
}

const source = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
const statements = source
  .replace(/^--.*$/gm, "")
  .split(/;\s*(?:\r?\n|$)/)
  .map((statement) => statement.trim())
  .filter(Boolean);

const sql = neon(connectionString);

for (const statement of statements) {
  await sql.query(statement);
}

console.log(`CareCore schema applied (${statements.length} statements).`);
