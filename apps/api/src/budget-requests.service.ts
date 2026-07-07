import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "./database.service";
import { BudgetRequest, Company, CreateBudgetRequestDto, CreateTimelineDto, RequestStatus, Specialty, TimelineEvent, TimelineFile } from "./types";

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
    return this.database.connection.prepare("SELECT id, name, contact FROM companies ORDER BY name").all() as Company[];
  }

  createCompany(input: Pick<Company, "name" | "contact">): Company {
    const company = { id: `co-${randomUUID()}`, name: input.name.trim(), contact: input.contact?.trim() ?? "" };
    this.database.connection.prepare("INSERT INTO companies (id, name, contact) VALUES (?, ?, ?)").run(company.id, company.name, company.contact);
    return company;
  }

  getRequests(): BudgetRequest[] {
    const rows = this.database.connection.prepare(`
      SELECT id, title, specialty_id as specialtyId, status, budget_min as budgetMin, budget_max as budgetMax,
        location, due_date as dueDate, summary, created_at as createdAt
      FROM budget_requests
      ORDER BY created_at DESC
    `).all() as Array<Omit<BudgetRequest, "companyIds" | "timeline">>;

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
        INSERT INTO budget_requests (id, title, specialty_id, status, budget_min, budget_max, location, due_date, summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(request.id, request.title, request.specialtyId, request.status, request.budgetMin, request.budgetMax, request.location, request.dueDate, request.summary, request.createdAt);

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

  answerQuestion(question: string) {
    const normalized = question.toLowerCase();
    const requests = this.getRequests();
    const specialties = this.getSpecialties();
    const companies = this.getCompanies();
    const openRequests = requests.filter((request) => !["Aceite", "Arquivado"].includes(request.status));
    const waitingRequests = requests.filter((request) => request.status === "A aguardar resposta");
    const cheapest = [...requests].filter((request) => request.budgetMin || request.budgetMax).sort((a, b) => Number(a.budgetMin || a.budgetMax) - Number(b.budgetMin || b.budgetMax))[0];

    if (normalized.includes("barato") || normalized.includes("menor valor")) {
      return cheapest ? `${cheapest.title} parece ser o mais barato, com estimativa entre ${this.money(cheapest.budgetMin)} e ${this.money(cheapest.budgetMax)}.` : "Ainda nao existem valores registados para comparar.";
    }

    if (normalized.includes("pendente") || normalized.includes("responder") || normalized.includes("aguardar")) {
      return waitingRequests.length ? `Pedidos a aguardar resposta: ${waitingRequests.map((request) => request.title).join("; ")}.` : "Nao ha pedidos marcados como a aguardar resposta.";
    }

    if (normalized.includes("aberto") || normalized.includes("resumo")) {
      return openRequests.length
        ? openRequests.map((request) => {
            const specialty = specialties.find((item) => item.id === request.specialtyId)?.name ?? "Sem especialidade";
            return `${request.title}: ${request.status}, ${specialty}, ${this.money(request.budgetMin)}-${this.money(request.budgetMax)}.`;
          }).join(" ")
        : "Nao ha pedidos em aberto.";
    }

    const matches = requests.filter((request) => {
      const companyNames = request.companyIds.map((companyId) => companies.find((company) => company.id === companyId)?.name ?? "").join(" ");
      const timeline = request.timeline.map((event) => `${event.text} ${event.files.map((file) => file.name).join(" ")}`).join(" ");
      return `${request.title} ${request.summary} ${companyNames} ${timeline}`.toLowerCase().includes(normalized);
    });

    return matches.length
      ? matches.slice(0, 4).map((request) => `${request.title}: ${request.summary || "sem descricao"} Estado: ${request.status}.`).join(" ")
      : "Nao encontrei essa informacao nos pedidos registados. Esta resposta usa regras locais; o endpoint esta preparado para ser trocado por um LLM.";
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

  private money(value: number) {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value || 0));
  }
}
