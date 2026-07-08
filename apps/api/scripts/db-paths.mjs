import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

export const defaultDatabasePath = resolve("data", "gestao-orcamentos.sqlite");
export const databasePath = resolve(process.env.SQLITE_PATH ?? defaultDatabasePath);
export const backupsDir = resolve(process.env.DB_BACKUP_DIR ?? "backups");

export function resolveInputPath(inputPath) {
  if (!inputPath) return null;
  return isAbsolute(inputPath) ? inputPath : resolve(inputPath);
}

export function ensureParentDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function ensureBackupsDir() {
  mkdirSync(backupsDir, { recursive: true });
}

export function timestamp() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}