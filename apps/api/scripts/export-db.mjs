import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { backupsDir, databasePath, ensureBackupsDir, ensureParentDir, resolveInputPath, timestamp } from "./db-paths.mjs";

const outputPath =
  resolveInputPath(process.argv[2]) ?? resolve(join(backupsDir, `gestao-orcamentos-${timestamp()}.sqlite`));

if (!existsSync(databasePath)) {
  console.error(`Database not found: ${databasePath}`);
  console.error("Start the API once or import a database before exporting.");
  process.exit(1);
}

ensureBackupsDir();
ensureParentDir(outputPath);

const db = new Database(databasePath, { readonly: true, fileMustExist: true });

try {
  await db.backup(outputPath);
  console.log(`Database exported to: ${outputPath}`);
} finally {
  db.close();
}