import type { BudgetRequest, Category, Company, CreateRequestInput, DashboardData, Project, ProjectWithRequests, RequestStatus, Specialty, TimelineEvent, UpdateTimelineInput } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getDashboard(): Promise<DashboardData> {
  const [specialties, companies, requests] = await Promise.all([
    request<Specialty[]>("/specialties"),
    request<Company[]>("/companies"),
    request<BudgetRequest[]>("/requests"),
  ]);
  return { specialties, companies, requests };
}

export function createSpecialty(input: { name: string; color: string }) {
  return request<Specialty>("/specialties", { method: "POST", body: JSON.stringify(input) });
}

export function getCompanies() {
  return request<Company[]>("/companies");
}

export function createCompany(input: { name: string; contact: string; categoryIds: string[] }) {
  return request<Company>("/companies", { method: "POST", body: JSON.stringify(input) });
}

export function deleteCompany(id: string) {
  return request<{ ok: true }>(`/companies/${id}`, { method: "DELETE" });
}

export function updateCompany(id: string, input: { name?: string; contact?: string; categoryIds?: string[] }) {
  return request<Company>(`/companies/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function getCategories() {
  return request<Category[]>("/categories");
}

export function createCategory(name: string) {
  return request<Category>("/categories", { method: "POST", body: JSON.stringify({ name }) });
}

export function createRequest(input: CreateRequestInput) {
  return request<BudgetRequest>("/requests", { method: "POST", body: JSON.stringify(input) });
}

export function updateRequestStatus(requestId: string, status: RequestStatus) {
  return request<BudgetRequest>(`/requests/${requestId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function addTimelineEvent(requestId: string, input: { text: string; files: Array<{ name: string; type: string; size: number; dataUrl: string }> }) {
  return request<TimelineEvent>(`/requests/${requestId}/timeline`, { method: "POST", body: JSON.stringify(input) });
}

export function updateTimelineEvent(requestId: string, timelineId: string, input: UpdateTimelineInput) {
  return request<TimelineEvent>(`/requests/${requestId}/timeline/${timelineId}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteTimelineEvent(requestId: string, timelineId: string) {
  return request<{ ok: true }>(`/requests/${requestId}/timeline/${timelineId}`, { method: "DELETE" });
}

export function askAssistant(question: string) {
  return request<{ answer: string }>("/assistant/ask", { method: "POST", body: JSON.stringify({ question }) });
}

export function getProjects() {
  return request<Project[]>("/projects");
}

export function createProject(input: { name: string; description: string }) {
  return request<Project>("/projects", { method: "POST", body: JSON.stringify(input) });
}

export function getProjectWithRequests(id: string) {
  return request<ProjectWithRequests>(`/projects/${id}`);
}

export function updateProjectName(id: string, input: { name?: string; description?: string }) {
  return request<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteProject(id: string) {
  return request<{ ok: true }>(`/projects/${id}`, { method: "DELETE" });
}
