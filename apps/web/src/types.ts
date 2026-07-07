export type RequestStatus = "Aberto" | "A aguardar resposta" | "Recebido" | "Aceite" | "Arquivado";

export interface Specialty {
  id: string;
  name: string;
  color: string;
}

export interface Company {
  id: string;
  name: string;
  contact: string;
}

export interface TimelineFile {
  id: string;
  eventId: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface TimelineEvent {
  id: string;
  requestId: string;
  type: "note" | "files";
  text: string;
  createdAt: string;
  files: TimelineFile[];
}

export interface BudgetRequest {
  id: string;
  title: string;
  specialtyId: string;
  companyIds: string[];
  status: RequestStatus;
  budgetMin: number;
  budgetMax: number;
  location: string;
  dueDate: string;
  summary: string;
  createdAt: string;
  timeline: TimelineEvent[];
}

export interface DashboardData {
  specialties: Specialty[];
  companies: Company[];
  requests: BudgetRequest[];
}

export interface CreateRequestInput {
  title: string;
  specialtyId: string;
  companyIds: string[];
  status: RequestStatus;
  budgetMin: number;
  budgetMax: number;
  location: string;
  dueDate: string;
  summary: string;
}
