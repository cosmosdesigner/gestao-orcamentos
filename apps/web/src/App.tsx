import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import * as React from "react";
import { askAssistant, addTimelineEvent, createCategory, createCompany, createProject, createRequest, deleteCompany, deleteProject, deleteTimelineEvent, getCategories, getCompanies, getDashboard, getProjectWithRequests, getProjects, updateCompany, updateProjectName, updateRequestStatus, updateTimelineEvent } from "./lib/api";
import { cn, money } from "./lib/utils";
import type { BudgetRequest, Category, Company, CreateRequestInput, DashboardData, Project, RequestStatus, Specialty, UpdateTimelineInput } from "./types";
import { AIConversationModal, AssistantPanel, type Message } from "./components/AssistantPanel";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { CompaniesPanel } from "./components/CompaniesPanel";
import { EmptyState } from "./components/EmptyState";
import { ProjectsList } from "./components/ProjectsList";
import { RequestDetail, type TimelinePayload } from "./components/RequestDetail";
import { StatusBadge } from "./components/StatusBadge";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";

const statuses: RequestStatus[] = ["Aberto", "A aguardar resposta", "Recebido", "Aceite", "Arquivado"];
const colors = ["#0f766e", "#2563eb", "#7c3aed", "#b45309", "#be123c", "#0369a1"];

export function App() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"projetos" | "empresas">("projetos");
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [showRequestForm, setShowRequestForm] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([
    { role: "assistant", text: "Pergunte por pedidos em aberto, empresas pendentes, valores, notas ou ficheiros." },
  ]);
  const [isAIModalOpen, setIsAIModalOpen] = React.useState(false);

  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: getProjects });

  const companiesQuery = useQuery({ queryKey: ["companies"], queryFn: getCompanies, enabled: activeTab === "empresas" });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getCategories, enabled: activeTab === "empresas" });

  const projectWithRequests = useQuery({
    queryKey: ["project", selectedProjectId],
    queryFn: () => getProjectWithRequests(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  const project = projectWithRequests.data;

  const globalData = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    enabled: !!selectedProjectId,
  });

  const data = selectedProjectId ? globalData.data : undefined;
  const specialties = data?.specialties ?? [];
  const companies = data?.companies ?? [];
  const requests = project?.requests ?? [];
  const currentProject = projectsQuery.data?.find((p: Project) => p.id === selectedProjectId);

  React.useEffect(() => {
    if (!requests.length) return;
    if (!selectedRequestId || !requests.some((r) => r.id === selectedRequestId)) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); queryClient.invalidateQueries({ queryKey: ["project", selectedProjectId] }); queryClient.invalidateQueries({ queryKey: ["dashboard"] }); queryClient.invalidateQueries({ queryKey: ["companies"] }); };
  const projectMutation = useMutation({ mutationFn: createProject, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }) });
  const updateProjectMutation = useMutation({ mutationFn: ({ id, input }: { id: string; input: { name?: string; description?: string } }) => updateProjectName(id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }) });
  const deleteProjectMutation = useMutation({ mutationFn: deleteProject, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setSelectedProjectId(null); } });
  const companyMutation = useMutation({ mutationFn: createCompany, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["companies"] }); queryClient.invalidateQueries({ queryKey: ["categories"] }); } });
  const deleteCompanyMutation = useMutation({ mutationFn: deleteCompany, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }) });
  const updateCompanyMutation = useMutation({ mutationFn: ({ id, input }: { id: string; input: { name?: string; contact?: string; categoryIds?: string[] } }) => updateCompany(id, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }) });
  const createCategoryMutation = useMutation({ mutationFn: createCategory, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }) });
  const requestMutation = useMutation({ mutationFn: createRequest, onSuccess: invalidate });
  const statusMutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: RequestStatus }) => updateRequestStatus(id, status), onSuccess: invalidate });
  const timelineMutation = useMutation({ mutationFn: ({ id, text, files }: { id: string; text: string; files: TimelinePayload[] }) => addTimelineEvent(id, { text, files }), onSuccess: invalidate });
  const updateTimelineMutation = useMutation({ mutationFn: ({ requestId, timelineId, input }: { requestId: string; timelineId: string; input: UpdateTimelineInput }) => updateTimelineEvent(requestId, timelineId, input), onSuccess: invalidate });
  const deleteTimelineMutation = useMutation({ mutationFn: ({ requestId, timelineId }: { requestId: string; timelineId: string }) => deleteTimelineEvent(requestId, timelineId), onSuccess: invalidate });
  const assistantMutation = useMutation({ mutationFn: askAssistant });

  const filteredRequests = React.useMemo(() => {
    return requests.filter((request) => {
      const statusMatch = statusFilter === "all" || request.status === statusFilter;
      const textMatch = matchesSearch(request, specialties, companies, search);
      return statusMatch && textMatch;
    });
  }, [requests, search, statusFilter, specialties, companies]);

  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? requests[0];

  if (!selectedProjectId) {
    if (activeTab === "empresas") {
      if (companiesQuery.isLoading) {
        return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">A carregar empresas...</div>;
      }
      if (companiesQuery.isError) {
        return <div className="grid min-h-screen place-items-center text-sm text-red-700">Nao foi possivel carregar empresas.</div>;
      }
      return (
        <div className="min-h-screen bg-background">
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-6 xl:grid-cols-[1fr_360px]">
            <CompaniesPanel companies={companiesQuery.data ?? []} categories={categoriesQuery.data ?? []} isPending={companyMutation.isPending || updateCompanyMutation.isPending || createCategoryMutation.isPending} onCreate={(input) => companyMutation.mutate(input)} onUpdate={(id, input) => updateCompanyMutation.mutate({ id, input })} onDelete={(id) => deleteCompanyMutation.mutate(id)} onCategoryCreate={(name) => createCategoryMutation.mutate(name)} />
            <div className="max-xl:order-first max-xl:mb-4">
              <AssistantPanel messages={messages} isPending={assistantMutation.isPending} onAsk={(question) => {
                setMessages((current) => [...current, { role: "user", text: question }]);
                assistantMutation.mutate(question, { onSuccess: (result) => setMessages((current) => [...current, { role: "assistant", text: result.answer }]) });
              }} onExpand={() => setIsAIModalOpen(true)} />
            </div>
          </div>
          {isAIModalOpen ? <AIConversationModal messages={messages} isPending={assistantMutation.isPending} onAsk={(q) => { setMessages((c) => [...c, { role: "user", text: q }]); assistantMutation.mutate(q, { onSuccess: (r) => setMessages((c) => [...c, { role: "assistant", text: r.answer }]) }); }} onClose={() => setIsAIModalOpen(false)} /> : null}
        </div>
      );
    }

    if (projectsQuery.isLoading) {
      return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">A carregar projetos...</div>;
    }
    if (projectsQuery.isError) {
      return <div className="grid min-h-screen place-items-center text-sm text-red-700">Nao foi possivel ligar a API.</div>;
    }
    return (
      <div className="min-h-screen bg-background">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-6 xl:grid-cols-[1fr_360px]">
          <ProjectsList
            projects={projectsQuery.data ?? []}
            isPending={projectMutation.isPending || updateProjectMutation.isPending}
            onCreate={(input) => projectMutation.mutate(input)}
            onUpdate={(id, input) => updateProjectMutation.mutate({ id, input })}
            onDelete={(id) => deleteProjectMutation.mutate(id)}
            onSelect={(id) => setSelectedProjectId(id)}
          />
          <div className="max-xl:order-first max-xl:mb-4">
            <AssistantPanel messages={messages} isPending={assistantMutation.isPending} onAsk={(question) => {
              setMessages((current) => [...current, { role: "user", text: question }]);
              assistantMutation.mutate(question, { onSuccess: (result) => setMessages((current) => [...current, { role: "assistant", text: result.answer }]) });
            }} onExpand={() => setIsAIModalOpen(true)} />
          </div>
        </div>
        {isAIModalOpen ? <AIConversationModal messages={messages} isPending={assistantMutation.isPending} onAsk={(q) => { setMessages((c) => [...c, { role: "user", text: q }]); assistantMutation.mutate(q, { onSuccess: (r) => setMessages((c) => [...c, { role: "assistant", text: r.answer }]) }); }} onClose={() => setIsAIModalOpen(false)} /> : null}
      </div>
    );
  }

  // Project detail view
  if (globalData.isLoading || projectWithRequests.isLoading) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">A carregar dados...</div>;
  }

  if (globalData.isError || !data) {
    return <div className="grid min-h-screen place-items-center text-sm text-red-700">Nao foi possivel ligar a API NestJS.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="p-6 max-xl:p-4">
        <div className="mb-4">
          <Button type="button" variant="ghost" className="-ml-2 text-xs" onClick={() => setSelectedProjectId(null)}><span className="mr-1">←</span>Projetos</Button>
        </div>
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Painel operacional</p>
            <h2 className="text-3xl font-semibold tracking-normal">Pedidos de orcamento</h2>
          </div>
          <Button type="button" onClick={() => setShowRequestForm((value) => !value)}><Plus className="h-4 w-4" />Novo pedido</Button>
        </header>

        <Metrics requests={requests} />

        <div className="grid grid-cols-[360px_minmax(440px,1fr)_360px] gap-4 max-2xl:grid-cols-[340px_1fr] max-xl:grid-cols-1">
          <section className="space-y-3">
            <div className="grid gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar pedido, empresa, nota..." />
              </div>
              <select className="h-9 rounded-md border bg-white px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Todos os estados</option>
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>

            {showRequestForm ? <RequestForm data={data} isPending={requestMutation.isPending} onCancel={() => setShowRequestForm(false)} onSubmit={(input) => requestMutation.mutate({ ...input, projectId: selectedProjectId }, { onSuccess: (request) => { setSelectedRequestId(request.id); setShowRequestForm(false); } })} /> : null}

            <div className="space-y-2">
              {filteredRequests.length ? filteredRequests.map((request) => (
                <RequestRow key={request.id} data={data} request={request} active={request.id === selectedRequest?.id} onClick={() => setSelectedRequestId(request.id)} />
              )) : <EmptyState text="Nenhum pedido encontrado." />}
            </div>
          </section>

          <section>{selectedRequest ? <RequestDetail data={data} request={selectedRequest} onStatusChange={(status) => statusMutation.mutate({ id: selectedRequest.id, status })} onTimelineSubmit={(text, files) => timelineMutation.mutate({ id: selectedRequest.id, text, files })} onTimelineUpdate={async (timelineId, input) => { await updateTimelineMutation.mutateAsync({ requestId: selectedRequest.id, timelineId, input }); }} onTimelineDelete={async (timelineId) => { await deleteTimelineMutation.mutateAsync({ requestId: selectedRequest.id, timelineId }); }} /> : <EmptyState text="Crie ou selecione um pedido." />}</section>

          <section className="max-2xl:col-span-2 max-xl:col-span-1">
            <AssistantPanel messages={messages} isPending={assistantMutation.isPending} onAsk={(question) => {
              setMessages((current) => [...current, { role: "user", text: question }]);
              assistantMutation.mutate(question, { onSuccess: (result) => setMessages((current) => [...current, { role: "assistant", text: result.answer }]) });
            }} onExpand={() => setIsAIModalOpen(true)} />
          </section>
        </div>
      </main>
      {isAIModalOpen ? <AIConversationModal messages={messages} isPending={assistantMutation.isPending} onAsk={(q) => { setMessages((c) => [...c, { role: "user", text: q }]); assistantMutation.mutate(q, { onSuccess: (r) => setMessages((c) => [...c, { role: "assistant", text: r.answer }]) }); }} onClose={() => setIsAIModalOpen(false)} /> : null}
    </div>
  );
}

function Metrics({ requests }: { requests: BudgetRequest[] }) {
  const active = requests.filter((request) => !["Aceite", "Arquivado"].includes(request.status)).length;
  const waiting = requests.filter((request) => request.status === "A aguardar resposta").length;
  const estimate = requests.reduce((sum, request) => sum + Number(request.budgetMax || request.budgetMin || 0), 0);
  return (
    <div className="mb-4 grid grid-cols-4 gap-3 max-lg:grid-cols-2">
      <MetricItem label="Pedidos" value={requests.length} />
      <MetricItem label="Em curso" value={active} />
      <MetricItem label="A aguardar" value={waiting} />
      <MetricItem label="Estimativa max." value={money(estimate)} />
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: React.ReactNode }) {
  return <Card className="p-4"><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><strong className="mt-1 block text-2xl">{value}</strong></Card>;
}

function RequestRow({ data, request, active, onClick }: { data: DashboardData; request: BudgetRequest; active: boolean; onClick: () => void }) {
  const specialty = data.specialties.find((item) => item.id === request.specialtyId);
  const companies = request.companyIds.map((id) => data.companies.find((company) => company.id === id)?.name).filter(Boolean).join(", ");
  return (
    <button type="button" onClick={onClick} className={cn("grid w-full gap-2 rounded-lg border bg-white p-3 text-left transition-colors hover:bg-accent", active && "border-primary shadow-[inset_3px_0_0_hsl(var(--primary))]")}> 
      <div className="flex flex-wrap gap-2"><StatusBadge status={request.status} /><Badge>{specialty?.name ?? "Sem especialidade"}</Badge></div>
      <h3 className="text-sm font-semibold">{request.title}</h3>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{companies || "Sem empresa"}</span><span>{money(request.budgetMin)} - {money(request.budgetMax)}</span></div>
    </button>
  );
}

function RequestForm({ data, isPending, onSubmit, onCancel }: { data: DashboardData; isPending: boolean; onSubmit: (input: CreateRequestInput) => void; onCancel: () => void }) {
  return (
    <Card>
      <CardHeader><CardTitle>Novo pedido</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={(event) => handleCreateRequest(event, onSubmit)}>
          <Input name="title" required placeholder="Titulo" />
          <select name="specialtyId" required className="h-9 rounded-md border bg-white px-3 text-sm">{data.specialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select name="companyIds" multiple className="min-h-24 rounded-md border bg-white px-3 py-2 text-sm">{data.companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select name="status" className="h-9 rounded-md border bg-white px-3 text-sm">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
          <div className="grid grid-cols-2 gap-2"><Input name="budgetMin" type="number" min="0" step="50" placeholder="Valor min." /><Input name="budgetMax" type="number" min="0" step="50" placeholder="Valor max." /></div>
          <Input name="location" placeholder="Local" />
          <Input name="dueDate" type="date" />
          <Textarea name="summary" placeholder="Descricao" />
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={isPending}>Criar</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function handleCreateCompany(event: React.FormEvent<HTMLFormElement>, submit: (input: { name: string; contact: string }) => void) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  submit({ name, contact: String(formData.get("contact") ?? "").trim() });
  form.reset();
}

function handleCreateRequest(event: React.FormEvent<HTMLFormElement>, submit: (input: CreateRequestInput) => void) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const budgetMin = Number(formData.get("budgetMin") || 0);
  const budgetMax = Number(formData.get("budgetMax") || budgetMin);
  submit({
    title: String(formData.get("title") ?? "").trim(),
    specialtyId: String(formData.get("specialtyId") ?? ""),
    companyIds: formData.getAll("companyIds").map(String),
    status: parseRequestStatus(formData.get("status")),
    budgetMin,
    budgetMax,
    location: String(formData.get("location") ?? "").trim(),
    dueDate: String(formData.get("dueDate") ?? ""),
    summary: String(formData.get("summary") ?? "").trim(),
  });
  form.reset();
}

function parseRequestStatus(value: FormDataEntryValue | null): RequestStatus { return statuses.find((status) => status === String(value ?? "")) ?? "Aberto"; }

function matchesSearch(request: BudgetRequest, specialties: readonly Specialty[], companies: readonly Company[], search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  const companyNames = request.companyIds.map((id) => companies.find((company: Company) => company.id === id)?.name ?? "").join(" ");
  const specialty = specialties.find((item: Specialty) => item.id === request.specialtyId)?.name ?? "";
  const timeline = request.timeline.map((item) => `${item.text} ${item.files.map((file) => file.name).join(" ")}`).join(" ");
  return `${request.title} ${request.summary} ${companyNames} ${specialty} ${timeline}`.toLowerCase().includes(term);
}

function TabBar({ activeTab, onTabChange }: { activeTab: "projetos" | "empresas"; onTabChange: (tab: "projetos" | "empresas") => void }) {
  return (
    <div className="border-b bg-white">
      <div className="mx-auto flex max-w-4xl gap-6 px-6">
        <button type="button" onClick={() => onTabChange("projetos")} className={cn("border-b-2 px-1 py-3 text-sm font-semibold transition-colors", activeTab === "projetos" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>Projetos</button>
        <button type="button" onClick={() => onTabChange("empresas")} className={cn("border-b-2 px-1 py-3 text-sm font-semibold transition-colors", activeTab === "empresas" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>Empresas</button>
      </div>
    </div>
  );
}
