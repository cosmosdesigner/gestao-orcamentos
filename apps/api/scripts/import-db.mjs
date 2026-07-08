import Database from "better-sqlite3";
import { copyFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { databasePath, ensureParentDir, resolveInputPath, timestamp } from "./db-paths.mjs";

const inputPath = resolveInputPath(process.argv[2]);

if (!inputPath) {
  console.error("Missing input file.");
  console.error("Usage: npm run db:import -- path/to/gestao-orcamentos.sqlite");
  process.exit(1);
}

if (!existsSync(inputPath)) {
  console.error(`Import file not found: ${inputPath}`);
  process.exit(1);
}

if (resolve(inputPath) === databasePath) {
  console.error("Import file is already the active database path.");
  process.exit(1);
}

validateSqlite(inputPath);
ensureParentDir(databasePath);

const backupPath = existsSync(databasePath) ? `${databasePath}.before-import-${timestamp()}` : null;

try {
  removeAuxiliaryFiles(databasePath);
  if (backupPath) {
    renameSync(databasePath, backupPath);
  }

  copyFileSync(inputPath, databasePath);
  removeAuxiliaryFiles(databasePath);
  console.log(`Database imported from: ${inputPath}`);
  console.log(`Active database: ${databasePath}`);
  if (backupPath) {
    console.log(`Previous database backup: ${backupPath}`);
  }
} catch (error) {
  if (backupPath && existsSync(backupPath) && !existsSync(databasePath)) {
    renameSync(backupPath, databasePath);
  }
  throw error;
}

function validateSqlite(filePath) {
  const db = new Database(filePath, { readonly: true, fileMustExist: true });
  try {
    const [result] = db.pragma("integrity_check");
    if (result.integrity_check !== "ok") {
      throw new Error(`SQLite integrity check failed: ${result.integrity_check}`);
    }
  } finally {
    db.close();
  }
}

function removeAuxiliaryFiles(filePath) {
  for (const suffix of ["-wal", "-shm"]) {
    const auxiliaryPath = `${filePath}${suffix}`;
    if (existsSync(auxiliaryPath)) {
      unlinkSync(auxiliaryPath);
    }
  }
}