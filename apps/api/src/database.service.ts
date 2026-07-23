import { Injectable, OnModuleInit } from "@nestjs/common";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly databasePath = process.env.SQLITE_PATH ?? join(process.cwd(), "data", "gestao-orcamentos.sqlite");
  private readonly db: Database.Database;

  constructor() {
    mkdirSync(dirname(this.databasePath), { recursive: true });
    this.db = new Database(this.databasePath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  onModuleInit() {
    this.migrate();
    if (process.env.SEED_DATABASE === "true") {
      this.seed();
    }
  }

  get connection(): any {
    return this.db;
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS specialties (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS budget_requests (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        specialty_id TEXT NOT NULL,
        project_id TEXT,
        status TEXT NOT NULL,
        budget_min REAL NOT NULL DEFAULT 0,
        budget_max REAL NOT NULL DEFAULT 0,
        location TEXT NOT NULL DEFAULT '',
        due_date TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (specialty_id) REFERENCES specialties(id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS request_companies (
        request_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        PRIMARY KEY (request_id, company_id),
        FOREIGN KEY (request_id) REFERENCES budget_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS timeline_events (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        type TEXT NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (request_id) REFERENCES budget_requests(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS timeline_files (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT '',
        size INTEGER NOT NULL DEFAULT 0,
        data_url TEXT NOT NULL,
        FOREIGN KEY (event_id) REFERENCES timeline_events(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS company_categories (
        company_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        PRIMARY KEY (company_id, category_id),
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );
    `);

    this.migrateAddProjects();
    this.migrateAddCategories();
  }

  private migrateAddCategories() {
    const catCount = this.db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
    if (catCount.count === 0) {
      this.db.prepare("INSERT INTO categories (id, name) VALUES (?, ?)").run("cat-piscina", "Piscina");
      this.db.prepare("INSERT INTO categories (id, name) VALUES (?, ?)").run("cat-telhados", "Telhados");
      this.db.prepare("INSERT INTO categories (id, name) VALUES (?, ?)").run("cat-limpezas", "Limpezas");

      const companies = this.db.prepare("SELECT id FROM companies").all() as { id: string }[];
      for (const company of companies) {
        this.db.prepare("INSERT OR IGNORE INTO company_categories (company_id, category_id) VALUES (?, ?)").run(company.id, "cat-piscina");
      }
    }
  }

  private migrateAddProjects() {
    try {
      this.db.exec("ALTER TABLE budget_requests ADD COLUMN project_id TEXT REFERENCES projects(id)");
    } catch {
      /* column already exists */
    }

    const projectCount = this.db.prepare("SELECT COUNT(*) as count FROM projects").get() as { count: number };
    if (projectCount.count === 0) {
      this.db.prepare("INSERT INTO projects (id, name, description, created_at) VALUES (?, ?, ?, ?)").run(
        "proj-piscina",
        "Piscina",
        "Construcao de piscina enterrada em Famoes, Odivelas",
        "2026-07-07T10:00:00.000Z",
      );
    }

    this.db.prepare("UPDATE budget_requests SET project_id = 'proj-piscina' WHERE project_id IS NULL").run();
  }

  private seed() {
    const specialtyCount = this.db.prepare("SELECT COUNT(*) as count FROM specialties").get() as { count: number };
    if (specialtyCount.count > 0) return;

    const insertSpecialty = this.db.prepare("INSERT INTO specialties (id, name, color) VALUES (?, ?, ?)");
    insertSpecialty.run("sp-piscinas", "Piscinas", "#0f766e");
    insertSpecialty.run("sp-telhados", "Telhados", "#b45309");
    insertSpecialty.run("sp-limpezas", "Limpezas", "#2563eb");

    const insertCompany = this.db.prepare("INSERT INTO companies (id, name, contact) VALUES (?, ?, ?)");
    insertCompany.run("co-1", "Aqua Norte", "geral@aquanorte.pt");
    insertCompany.run("co-2", "Cobertura Certa", "912 000 120");
    insertCompany.run("co-3", "LimpaPro", "orcamentos@limpapro.pt");

    const insertRequest = this.db.prepare(`
      INSERT INTO budget_requests
        (id, title, specialty_id, status, budget_min, budget_max, location, due_date, summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertRequest.run("req-1", "Reparacao de telhado e caleiras", "sp-telhados", "A aguardar resposta", 1800, 3200, "Moradia, Cascais", "2026-07-25", "Pedir avaliacao para infiltracoes, substituicao de telhas partidas e limpeza de caleiras.", "2026-07-07T10:00:00.000Z");
    insertRequest.run("req-2", "Limpeza profunda pos-obra", "sp-limpezas", "Aberto", 350, 650, "Apartamento T3, Lisboa", "2026-07-18", "Limpeza de cozinha, casas de banho, vidros e remocao de poeiras apos obra.", "2026-07-06T14:00:00.000Z");

    const insertRequestCompany = this.db.prepare("INSERT INTO request_companies (request_id, company_id) VALUES (?, ?)");
    insertRequestCompany.run("req-1", "co-2");
    insertRequestCompany.run("req-2", "co-3");

    this.db.prepare("INSERT INTO timeline_events (id, request_id, type, text, created_at) VALUES (?, ?, ?, ?, ?)").run("tl-1", "req-1", "note", "Contactada a Cobertura Certa. Ficaram de agendar visita tecnica.", "2026-07-07T10:20:00.000Z");
  }
}
