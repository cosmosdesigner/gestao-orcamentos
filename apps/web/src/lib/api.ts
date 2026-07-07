import type { BudgetRequest, Company, CreateRequestInput, DashboardData, RequestStatus, Specialty } from "../types";

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

export function createCompany(input: { name: string; contact: string }) {
  return request<Company>("/companies", { method: "POST", body: JSON.stringify(input) });
}

export function createRequest(input: CreateRequestInput) {
  return request<BudgetRequest>("/requests", { method: "POST", body: JSON.stringify(input) });
}

export function updateRequestStatus(requestId: string, status: RequestStatus) {
  return request<BudgetRequest>(`/requests/${requestId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function addTimelineEvent(requestId: string, input: { text: string; files: Array<{ name: string; type: string; size: number; dataUrl: string }> }) {
  return request(`/requests/${requestId}/timeline`, { method: "POST", body: JSON.stringify(input) });
}

export function askAssistant(question: string) {
  return request<{ answer: string }>("/assistant/ask", { method: "POST", body: JSON.stringify({ question }) });
}
