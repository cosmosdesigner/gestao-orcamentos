import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import { DatabaseService } from "./database.service";
import { BudgetRequest, Category, Company, CreateBudgetRequestDto, CreateProjectDto, CreateTimelineDto, Project, ProjectWithRequests, RequestStatus, Specialty, TimelineEvent, TimelineFile, UpdateProjectDto, UpdateTimelineDto } from "./types";

@Injectable()
export class BudgetRequestsService {
  constructor(private readonly database: DatabaseService) {}

  getSpecialties(): Specialty[] {
    return this.database.connection.prepare("SELECT id, name, color FROM specialties ORDER BY name").all() as Specialty[];
  }

  createSpecialty(input: Pick<Specialty, "name" | "color">): Specialty {
    const specialty = { id: `sp-${randomUUID()}`, name: input.name.trim(), color: input.color || "#0f766e" };
    this.database.connection.prepare("INSERT INTO specialties (id, name, color) VALUES (?, ?, ?)").run(specialty.id, specialty.name, specialty.color);
    return specialty;
  }

  getCompanies(): Company[] {
    const companies = this.database.connection.prepare("SELECT id, name, contact FROM companies ORDER BY name").all() as Company[];
    const catStatement = this.database.connection.prepare(`
      SELECT c.id, c.name FROM categories c
      JOIN company_categories cc ON cc.category_id = c.id
      WHERE cc.company_id = ?
    `);
    return companies.map((company) => ({ ...company, categories: catStatement.all(company.id) as Category[] }));
  }

  createCompany(input: { name: string; contact: string; categoryIds: string[] }): Company {
    const company = { id: `co-${randomUUID()}`, name: input.name.trim(), contact: input.contact?.trim() ?? "", categories: [] as Category[] };
    const create = this.database.connection.transaction(() => {
      this.database.connection.prepare("INSERT INTO companies (id, name, contact) VALUES (?, ?, ?)").run(company.id, company.name, company.contact);
      const insertCat = this.database.connection.prepare("INSERT INTO company_categories (company_id, category_id) VALUES (?, ?)");
      for (const catId of input.categoryIds ?? []) {
        insertCat.run(company.id, catId);
      }
    });
    create();
    company.categories = this.getCompanyCategories(company.id);
    return company;
  }

  getCategories(): Category[] {
    return this.database.connection.prepare("SELECT id, name FROM categories ORDER BY name").all() as Category[];
  }

  createCategory(name: string): Category {
    const category: Category = { id: `cat-${randomUUID()}`, name: name.trim() };
    this.database.connection.prepare("INSERT INTO categories (id, name) VALUES (?, ?)").run(category.id, category.name);
    return category;
  }

  deleteCompany(companyId: string) {
    const result = this.database.connection.prepare("DELETE FROM companies WHERE id = ?").run(companyId);
    if (result.changes === 0) throw new NotFoundException("Empresa nao encontrada");
    return { ok: true };
  }

  updateCompany(companyId: string, input: { name?: string; contact?: string; categoryIds?: string[] }): Company {
    const existing = this.database.connection.prepare("SELECT id FROM companies WHERE id = ?").get(companyId);
    if (!existing) throw new NotFoundException("Empresa nao encontrada");

    const update = this.database.connection.transaction(() => {
      if (input.name !== undefined) {
        this.database.connection.prepare("UPDATE companies SET name = ? WHERE id = ?").run(input.name.trim(), companyId);
      }
      if (input.contact !== undefined) {
        this.database.connection.prepare("UPDATE companies SET contact = ? WHERE id = ?").run(input.contact.trim(), companyId);
      }
      if (input.categoryIds !== undefined) {
        this.database.connection.prepare("DELETE FROM company_categories WHERE company_id = ?").run(companyId);
        const insert = this.database.connection.prepare("INSERT INTO company_categories (company_id, category_id) VALUES (?, ?)");
        for (const catId of input.categoryIds) {
          insert.run(companyId, catId);
        }
      }
    });
    update();

    const company = this.database.connection.prepare("SELECT id, name, contact FROM companies WHERE id = ?").get(companyId) as Company;
    return { ...company, categories: this.getCompanyCategories(companyId) };
  }

  getRequests(projectId?: string): BudgetRequest[] {
    const rows = this.database.connection.prepare(`
      SELECT id, title, specialty_id as specialtyId, project_id as projectId, status, budget_min as budgetMin, budget_max as budgetMax,
        location, due_date as dueDate, summary, created_at as createdAt
      FROM budget_requests
      ${projectId ? "WHERE project_id = ?" : ""}
      ORDER BY created_at DESC
    `).all(...(projectId ? [projectId] : [])) as Array<Omit<BudgetRequest, "companyIds" | "timeline">>;

    return rows.map((request) => ({ ...request, companyIds: this.getCompanyIds(request.id), timeline: this.getTimeline(request.id) }));
  }

  createRequest(input: CreateBudgetRequestDto): BudgetRequest {
    const request: BudgetRequest = {
      id: `req-${randomUUID()}`,
      title: input.title.trim(),
      specialtyId: input.specialtyId,
      companyIds: input.companyIds ?? [],
      status: input.status ?? "Aberto",
      budgetMin: Number(input.budgetMin ?? 0),
      budgetMax: Number(input.budgetMax ?? input.budgetMin ?? 0),
      location: input.location?.trim() ?? "",
      dueDate: input.dueDate ?? "",
      summary: input.summary?.trim() ?? "",
      createdAt: new Date().toISOString(),
      timeline: [],
    };

    const create = this.database.connection.transaction(() => {
      this.database.connection.prepare(`
        INSERT INTO budget_requests (id, title, specialty_id, project_id, status, budget_min, budget_max, location, due_date, summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(request.id, request.title, request.specialtyId, request.projectId ?? null, request.status, request.budgetMin, request.budgetMax, request.location, request.dueDate, request.summary, request.createdAt);

      const insertCompany = this.database.connection.prepare("INSERT INTO request_companies (request_id, company_id) VALUES (?, ?)");
      request.companyIds.forEach((companyId) => insertCompany.run(request.id, companyId));
    });

    create();
    return request;
  }

  updateStatus(requestId: string, status: RequestStatus): BudgetRequest {
    const result = this.database.connection.prepare("UPDATE budget_requests SET status = ? WHERE id = ?").run(status, requestId);
    if (result.changes === 0) throw new NotFoundException("Pedido nao encontrado");
    const request = this.getRequests().find((item) => item.id === requestId);
    if (!request) throw new NotFoundException("Pedido nao encontrado");
    return request;
  }

  addTimelineEvent(requestId: string, input: CreateTimelineDto): TimelineEvent {
    const exists = this.database.connection.prepare("SELECT id FROM budget_requests WHERE id = ?").get(requestId);
    if (!exists) throw new NotFoundException("Pedido nao encontrado");

    const event: TimelineEvent = {
      id: `tl-${randomUUID()}`,
      requestId,
      type: input.files?.length ? "files" : "note",
      text: input.text?.trim() ?? "",
      createdAt: new Date().toISOString(),
      files: [],
    };

    const create = this.database.connection.transaction(() => {
      this.database.connection.prepare("INSERT INTO timeline_events (id, request_id, type, text, created_at) VALUES (?, ?, ?, ?, ?)").run(event.id, event.requestId, event.type, event.text, event.createdAt);
      const insertFile = this.database.connection.prepare("INSERT INTO timeline_files (id, event_id, name, type, size, data_url) VALUES (?, ?, ?, ?, ?, ?)");
      event.files = (input.files ?? []).map((file) => {
        const timelineFile: TimelineFile = { id: `file-${randomUUID()}`, eventId: event.id, name: file.name, type: file.type, size: Number(file.size ?? 0), dataUrl: file.dataUrl };
        insertFile.run(timelineFile.id, timelineFile.eventId, timelineFile.name, timelineFile.type, timelineFile.size, timelineFile.dataUrl);
        return timelineFile;
      });
    });

    create();
    return event;
  }

  updateTimelineEvent(requestId: string, timelineId: string, input: UpdateTimelineDto): TimelineEvent {
    if (typeof input.text !== "string") throw new BadRequestException("Texto invalido");

    const result = this.database.connection.prepare("UPDATE timeline_events SET text = ? WHERE id = ? AND request_id = ?").run(input.text.trim(), timelineId, requestId);
    if (result.changes === 0) throw new NotFoundException("Evento da timeline nao encontrado");
    return this.getTimelineEvent(timelineId);
  }

  deleteTimelineEvent(requestId: string, timelineId: string) {
    const result = this.database.connection.prepare("DELETE FROM timeline_events WHERE id = ? AND request_id = ?").run(timelineId, requestId);
    if (result.changes === 0) throw new NotFoundException("Evento da timeline nao encontrado");
    return { ok: true };
  }

  getProjects(): Project[] {
    return this.database.connection.prepare("SELECT id, name, description, created_at as createdAt FROM projects ORDER BY created_at DESC").all() as Project[];
  }

  createProject(input: CreateProjectDto): Project {
    const project: Project = {
      id: `proj-${randomUUID()}`,
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      createdAt: new Date().toISOString(),
    };
    this.database.connection.prepare("INSERT INTO projects (id, name, description, created_at) VALUES (?, ?, ?, ?)").run(project.id, project.name, project.description, project.createdAt);
    return project;
  }

  getProjectWithRequests(projectId: string): ProjectWithRequests {
    const project = this.database.connection.prepare("SELECT id, name, description, created_at as createdAt FROM projects WHERE id = ?").get(projectId) as Project | undefined;
    if (!project) throw new NotFoundException("Projeto nao encontrado");
    return { ...project, requests: this.getRequests(projectId) };
  }

  updateProject(projectId: string, input: UpdateProjectDto): Project {
    const existing = this.database.connection.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
    if (!existing) throw new NotFoundException("Projeto nao encontrado");
    if (input.name !== undefined) this.database.connection.prepare("UPDATE projects SET name = ? WHERE id = ?").run(input.name.trim(), projectId);
    if (input.description !== undefined) this.database.connection.prepare("UPDATE projects SET description = ? WHERE id = ?").run(input.description.trim(), projectId);
    return this.database.connection.prepare("SELECT id, name, description, created_at as createdAt FROM projects WHERE id = ?").get(projectId) as Project;
  }

  deleteProject(projectId: string) {
    const result = this.database.connection.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
    if (result.changes === 0) throw new NotFoundException("Projeto nao encontrado");
    return { ok: true };
  }

  async answerQuestion(question: string): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return "A chave de API da DeepSeek nao esta configurada. Adiciona DEEPSEEK_API_KEY no ficheiro .env.";
    }

    const requests = this.getRequests();
    const specialties = this.getSpecialties();
    const companies = this.getCompanies();

    const contextLines: string[] = [];

    for (const request of requests) {
      const specialty = specialties.find((item) => item.id === request.specialtyId);
      const companyNames = request.companyIds.map((id) => companies.find((company) => company.id === id)?.name ?? "?").join(", ");
      contextLines.push(
        `- Pedido "${request.title}" (estado: ${request.status}, especialidade: ${specialty?.name ?? "?"}, empresas: ${companyNames || "nenhuma"}, orcamento: ${this.money(request.budgetMin)}-${this.money(request.budgetMax)}, local: ${request.location || "?"}, data limite: ${request.dueDate || "?"}, descricao: ${request.summary || "sem descricao"})`
      );

      if (request.timeline.length) {
        const timelineParts: string[] = [];
        for (const event of request.timeline) {
          const date = event.createdAt.slice(0, 10);
          let line = `[${date}] ${event.text || "(sem texto)"}`;

          const pdfFiles = event.files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
          for (const file of pdfFiles) {
            try {
              const pdfText = await this.extractPdfText(file.dataUrl);
              line += `\n    Conteudo do PDF "${file.name}": ${pdfText.slice(0, 4000)}`;
            } catch {
              line += `\n    PDF "${file.name}": (nao foi possivel extrair texto)`;
            }
          }

          timelineParts.push(line);
        }
        contextLines.push(`  Timeline:\n    ${timelineParts.join("\n    ")}`);
      }
    }

    const systemPrompt = `Es uma assistente especializado em gestao de orcamentos e pedidos. Responde em portugues de Portugal, de forma clara e direta.

Contexto atual dos dados:
${contextLines.join("\n")}

Com base nos dados acima, responde a pergunta do utilizador. Se nao souberes a resposta com base nos dados, diz que nao encontras essa informacao.`;

    const client = new OpenAI({ baseURL: "https://api.deepseek.com/v1", apiKey });

    try {
      const completion = await client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: 2048,
        temperature: 0.3,
      });

      return completion.choices[0]?.message?.content?.trim() ?? "Nao foi possivel obter resposta.";
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return `Erro ao contactar a DeepSeek: ${message}`;
    }
  }

  private getCompanyIds(requestId: string) {
    const rows = this.database.connection.prepare("SELECT company_id as companyId FROM request_companies WHERE request_id = ?").all(requestId) as Array<{ companyId: string }>;
    return rows.map((row) => row.companyId);
  }

  private getTimeline(requestId: string) {
    const events = this.database.connection.prepare(`
      SELECT id, request_id as requestId, type, text, created_at as createdAt
      FROM timeline_events
      WHERE request_id = ?
      ORDER BY created_at DESC
    `).all(requestId) as TimelineEvent[];

    const fileStatement = this.database.connection.prepare(`
      SELECT id, event_id as eventId, name, type, size, data_url as dataUrl
      FROM timeline_files
      WHERE event_id = ?
    `);

    return events.map((event) => ({ ...event, files: fileStatement.all(event.id) as TimelineFile[] }));
  }

  private getTimelineEvent(timelineId: string): TimelineEvent {
    const event = this.database.connection.prepare(`
      SELECT id, request_id as requestId, type, text, created_at as createdAt
      FROM timeline_events
      WHERE id = ?
    `).get(timelineId) as Omit<TimelineEvent, "files"> | undefined;

    if (!event) throw new NotFoundException("Evento da timeline nao encontrado");

    const files = this.database.connection.prepare(`
      SELECT id, event_id as eventId, name, type, size, data_url as dataUrl
      FROM timeline_files
      WHERE event_id = ?
    `).all(timelineId) as TimelineFile[];

    return { ...event, files };
  }

  private getCompanyCategories(companyId: string): Category[] {
    return this.database.connection.prepare(`
      SELECT c.id, c.name FROM categories c
      JOIN company_categories cc ON cc.category_id = c.id
      WHERE cc.company_id = ?
    `).all(companyId) as Category[];
  }

  private async extractPdfText(dataUrl: string): Promise<string> {
    const base64 = dataUrl.replace(/^data:application\/pdf;base64,/, "").replace(/^data:application\/octet-stream;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text;
  }

  private money(value: number) {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value || 0));
  }
}
