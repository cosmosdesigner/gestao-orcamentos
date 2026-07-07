import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Building2, Clock, FileText, Plus, Search, Send, Tags, Upload } from "lucide-react";
import * as React from "react";
import { askAssistant, addTimelineEvent, createCompany, createRequest, createSpecialty, getDashboard, updateRequestStatus } from "./lib/api";
import { cn, money, shortDate } from "./lib/utils";
import type { BudgetRequest, Company, CreateRequestInput, DashboardData, RequestStatus, Specialty } from "./types";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";

const statuses: RequestStatus[] = ["Aberto", "A aguardar resposta", "Recebido", "Aceite", "Arquivado"];
const colors = ["#0f766e", "#2563eb", "#7c3aed", "#b45309", "#be123c", "#0369a1"];
const fileLimitBytes = 700 * 1024;

type Message = { role: "user" | "assistant"; text: string };

export function App() {
  const queryClient = useQueryClient();
  const [selectedSpecialtyId, setSelectedSpecialtyId] = React.useState("all");
  const [selectedRequestId, setSelectedRequestId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [showRequestForm, setShowRequestForm] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([
    { role: "assistant", text: "Pergunte por pedidos em aberto, empresas pendentes, valores, notas ou ficheiros." },
  ]);

  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
  const data = dashboard.data;

  React.useEffect(() => {
    if (!data?.requests.length) return;
    if (!selectedRequestId || !data.requests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(data.requests[0].id);
    }
  }, [data, selectedRequestId]);

  const invalidateDashboard = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  const specialtyMutation = useMutation({ mutationFn: createSpecialty, onSuccess: invalidateDashboard });
  const companyMutation = useMutation({ mutationFn: createCompany, onSuccess: invalidateDashboard });
  const requestMutation = useMutation({ mutationFn: createRequest, onSuccess: invalidateDashboard });
  const statusMutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: RequestStatus }) => updateRequestStatus(id, status), onSuccess: invalidateDashboard });
  const timelineMutation = useMutation({ mutationFn: ({ id, text, files }: { id: string; text: string; files: TimelinePayload[] }) => addTimelineEvent(id, { text, files }), onSuccess: invalidateDashboard });
  const assistantMutation = useMutation({ mutationFn: askAssistant });

  const filteredRequests = React.useMemo(() => {
    if (!data) return [];
    return data.requests.filter((request) => {
      const specialtyMatch = selectedSpecialtyId === "all" || request.specialtyId === selectedSpecialtyId;
      const statusMatch = statusFilter === "all" || request.status === statusFilter;
      const textMatch = matchesSearch(request, data, search);
      return specialtyMatch && statusMatch && textMatch;
    });
  }, [data, search, selectedSpecialtyId, statusFilter]);

  const selectedRequest = data?.requests.find((request) => request.id === selectedRequestId) ?? data?.requests[0];

  if (dashboard.isLoading) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">A carregar dados...</div>;
  }

  if (dashboard.isError || !data) {
    return <div className="grid min-h-screen place-items-center text-sm text-red-700">Nao foi possivel ligar a API NestJS em localhost:3333.</div>;
  }

  return (
    <div className="grid min-h-screen grid-cols-[300px_1fr] bg-background max-xl:grid-cols-1">
      <aside className="border-r bg-white/70 p-5 max-xl:border-b max-xl:border-r-0">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">GO</div>
          <div>
            <h1 className="text-lg font-semibold">Gestao de Orcamentos</h1>
            <p className="text-xs text-muted-foreground">Pedidos, empresas e timeline</p>
          </div>
        </div>

        <Card className="mb-4 shadow-none">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Especialidades</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <SpecialtyButton active={selectedSpecialtyId === "all"} label="Todos" count={data.requests.length} onClick={() => setSelectedSpecialtyId("all")} />
              {data.specialties.map((specialty) => (
                <SpecialtyButton key={specialty.id} active={selectedSpecialtyId === specialty.id} label={specialty.name} count={data.requests.filter((request) => request.specialtyId === specialty.id).length} color={specialty.color} onClick={() => setSelectedSpecialtyId(specialty.id)} />
              ))}
            </div>
            <form className="grid gap-2" onSubmit={(event) => handleCreateSpecialty(event, data.specialties.length, specialtyMutation.mutate)}>
              <Input name="name" placeholder="Nova especialidade" />
              <Button type="submit" variant="secondary" disabled={specialtyMutation.isPending}><Plus className="h-4 w-4" />Adicionar</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {data.companies.map((company) => (
                <div key={company.id} className="rounded-lg border bg-white p-3">
                  <p className="text-sm font-semibold">{company.name}</p>
                  <p className="text-xs text-muted-foreground">{company.contact || "Sem contacto"}</p>
                </div>
              ))}
            </div>
            <form className="grid gap-2" onSubmit={(event) => handleCreateCompany(event, companyMutation.mutate)}>
              <Input name="name" placeholder="Nome da empresa" />
              <Input name="contact" placeholder="Contacto" />
              <Button type="submit" variant="secondary" disabled={companyMutation.isPending}><Plus className="h-4 w-4" />Adicionar</Button>
            </form>
          </CardContent>
        </Card>
      </aside>

      <main className="p-6 max-xl:p-4">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Painel operacional</p>
            <h2 className="text-3xl font-semibold tracking-normal">Pedidos de orcamento</h2>
          </div>
          <Button type="button" onClick={() => setShowRequestForm((value) => !value)}><Plus className="h-4 w-4" />Novo pedido</Button>
        </header>

        <Metrics requests={data.requests} />

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

            {showRequestForm ? <RequestForm data={data} isPending={requestMutation.isPending} onCancel={() => setShowRequestForm(false)} onSubmit={(input) => requestMutation.mutate(input, { onSuccess: (request) => { setSelectedRequestId(request.id); setShowRequestForm(false); } })} /> : null}

            <div className="space-y-2">
              {filteredRequests.length ? filteredRequests.map((request) => (
                <RequestRow key={request.id} data={data} request={request} active={request.id === selectedRequest?.id} onClick={() => setSelectedRequestId(request.id)} />
              )) : <EmptyState text="Nenhum pedido encontrado." />}
            </div>
          </section>

          <section>{selectedRequest ? <RequestDetail data={data} request={selectedRequest} onStatusChange={(status) => statusMutation.mutate({ id: selectedRequest.id, status })} onTimelineSubmit={(text, files) => timelineMutation.mutate({ id: selectedRequest.id, text, files })} /> : <EmptyState text="Crie ou selecione um pedido." />}</section>

          <section className="max-2xl:col-span-2 max-xl:col-span-1">
            <AssistantPanel messages={messages} isPending={assistantMutation.isPending} onAsk={(question) => {
              setMessages((current) => [...current, { role: "user", text: question }]);
              assistantMutation.mutate(question, { onSuccess: (result) => setMessages((current) => [...current, { role: "assistant", text: result.answer }]) });
            }} />
          </section>
        </div>
      </main>
    </div>
  );
}

type TimelinePayload = { name: string; type: string; size: number; dataUrl: string };

function Metrics({ requests }: { requests: BudgetRequest[] }) {
  const active = requests.filter((request) => !["Aceite", "Arquivado"].includes(request.status)).length;
  const waiting = requests.filter((request) => request.status === "A aguardar resposta").length;
  const estimate = requests.reduce((sum, request) => sum + Number(request.budgetMax || request.budgetMin || 0), 0);
  return (
    <div className="mb-4 grid grid-cols-4 gap-3 max-lg:grid-cols-2">
      <Metric label="Pedidos" value={requests.length} />
      <Metric label="Em curso" value={active} />
      <Metric label="A aguardar" value={waiting} />
      <Metric label="Estimativa max." value={money(estimate)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <Card className="p-4"><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><strong className="mt-1 block text-2xl">{value}</strong></Card>;
}

function SpecialtyButton({ active, label, count, color, onClick }: { active: boolean; label: string; count: number; color?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm", active && "border-primary shadow-[inset_3px_0_0_hsl(var(--primary))]")}> 
      <span className="flex items-center gap-2">{color ? <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> : null}{label}</span>
      <strong>{count}</strong>
    </button>
  );
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

function RequestDetail({ data, request, onStatusChange, onTimelineSubmit }: { data: DashboardData; request: BudgetRequest; onStatusChange: (status: RequestStatus) => void; onTimelineSubmit: (text: string, files: TimelinePayload[]) => void }) {
  const specialty = data.specialties.find((item) => item.id === request.specialtyId);
  const companies = request.companyIds.map((id) => data.companies.find((company) => company.id === id)?.name).filter(Boolean).join(", ");
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{request.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{request.location || "Sem local definido"}</p>
          </div>
          <select className="h-9 rounded-md border bg-white px-3 text-sm" value={request.status} onChange={(event) => onStatusChange(event.target.value as RequestStatus)}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          <DetailField label="Especialidade" value={specialty?.name ?? "Sem especialidade"} />
          <DetailField label="Empresas" value={companies || "Sem empresa"} />
          <DetailField label="Estimativa" value={`${money(request.budgetMin)} - ${money(request.budgetMax)}`} />
          <DetailField label="Data limite" value={shortDate(request.dueDate)} />
        </div>
        <div className="border-t pt-4"><h4 className="mb-2 text-sm font-semibold">Descricao</h4><p className="text-sm text-muted-foreground">{request.summary || "Sem descricao."}</p></div>
        <TimelineForm onSubmit={onTimelineSubmit} />
        <div className="border-t pt-4">
          <h4 className="mb-3 text-sm font-semibold">Timeline</h4>
          <div className="space-y-2">{request.timeline.length ? request.timeline.map((item) => <div key={item.id} className="rounded-lg border bg-white p-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Clock className="h-3.5 w-3.5" />{shortDate(item.createdAt)}</div><p className="text-sm">{item.text || "Ficheiros adicionados."}</p><div className="mt-2 flex flex-wrap gap-2">{item.files.map((file) => <a key={file.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold text-blue-700" href={file.dataUrl} download={file.name}><FileText className="h-3.5 w-3.5" />{file.name}</a>)}</div></div>) : <EmptyState text="Ainda nao existem notas ou ficheiros." />}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border bg-muted/40 p-3"><span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>;
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

function TimelineForm({ onSubmit }: { onSubmit: (text: string, files: TimelinePayload[]) => void }) {
  return (
    <form className="grid gap-3 border-t pt-4" onSubmit={async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      const files = await readFiles((form.elements.namedItem("files") as HTMLInputElement).files);
      onSubmit(String(formData.get("text") ?? ""), files);
      form.reset();
    }}>
      <h4 className="text-sm font-semibold">Adicionar nota ou ficheiros</h4>
      <Textarea name="text" placeholder="Nota, chamada, decisao, visita tecnica..." />
      <Input name="files" type="file" multiple />
      <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Ficheiros ate 700KB ficam guardados em SQLite.</p><Button type="submit"><Upload className="h-4 w-4" />Adicionar</Button></div>
    </form>
  );
}

function AssistantPanel({ messages, isPending, onAsk }: { messages: Message[]; isPending: boolean; onAsk: (question: string) => void }) {
  return (
    <Card className="sticky top-4">
      <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>AI sobre orcamentos</CardTitle><Bot className="h-4 w-4 text-muted-foreground" /></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">{["Resume os pedidos em aberto", "Que empresas ainda nao responderam?", "Qual o orçamento mais barato?"].map((prompt) => <Button key={prompt} type="button" variant="outline" onClick={() => onAsk(prompt)}>{prompt}</Button>)}</div>
        <div className="max-h-96 space-y-2 overflow-auto pr-1">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={cn("rounded-lg border p-3 text-sm", message.role === "assistant" ? "bg-teal-50 border-teal-100" : "bg-blue-50 border-blue-100")}><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{message.role === "assistant" ? "Resposta" : "Pergunta"}</p>{message.text}</div>)}</div>
        <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); const question = String(formData.get("question") ?? "").trim(); if (!question) return; onAsk(question); event.currentTarget.reset(); }}>
          <Textarea name="question" placeholder="Pergunta sobre pedidos, empresas, valores, notas ou ficheiros..." />
          <Button type="submit" disabled={isPending}><Send className="h-4 w-4" />Perguntar</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const classes = status === "A aguardar resposta" ? "bg-amber-50 text-amber-800" : status === "Aceite" || status === "Arquivado" ? "bg-blue-50 text-blue-800" : "bg-emerald-50 text-emerald-800";
  return <Badge className={classes}>{status}</Badge>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function handleCreateSpecialty(event: React.FormEvent<HTMLFormElement>, count: number, submit: (input: { name: string; color: string }) => void) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = String(new FormData(form).get("name") ?? "").trim();
  if (!name) return;
  submit({ name, color: colors[count % colors.length] });
  form.reset();
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
    status: String(formData.get("status") ?? "Aberto") as RequestStatus,
    budgetMin,
    budgetMax,
    location: String(formData.get("location") ?? "").trim(),
    dueDate: String(formData.get("dueDate") ?? ""),
    summary: String(formData.get("summary") ?? "").trim(),
  });
  form.reset();
}

async function readFiles(fileList: FileList | null): Promise<TimelinePayload[]> {
  const files = Array.from(fileList ?? []).filter((file) => file.size <= fileLimitBytes);
  return Promise.all(files.map((file) => new Promise<TimelinePayload>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  })));
}

function matchesSearch(request: BudgetRequest, data: DashboardData, search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  const companies = request.companyIds.map((id) => data.companies.find((company: Company) => company.id === id)?.name ?? "").join(" ");
  const specialty = data.specialties.find((item: Specialty) => item.id === request.specialtyId)?.name ?? "";
  const timeline = request.timeline.map((item) => `${item.text} ${item.files.map((file) => file.name).join(" ")}`).join(" ");
  return `${request.title} ${request.summary} ${companies} ${specialty} ${timeline}`.toLowerCase().includes(term);
}
