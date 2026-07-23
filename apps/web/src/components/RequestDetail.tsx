import { Upload } from "lucide-react";
import * as React from "react";
import { money, shortDate } from "../lib/utils";
import type { BudgetRequest, DashboardData, RequestStatus, UpdateTimelineInput } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { TimelineList } from "./TimelineList";

const statuses: RequestStatus[] = ["Aberto", "A aguardar resposta", "Recebido", "Aceite", "Arquivado"];
const fileLimitBytes = 30 * 1024 * 1024;

export type TimelinePayload = { name: string; type: string; size: number; dataUrl: string };

interface RequestDetailProps {
  readonly data: DashboardData;
  readonly request: BudgetRequest;
  readonly onStatusChange: (status: RequestStatus) => void;
  readonly onTimelineSubmit: (text: string, files: TimelinePayload[]) => void;
  readonly onTimelineUpdate: (timelineId: string, input: UpdateTimelineInput) => Promise<void>;
  readonly onTimelineDelete: (timelineId: string) => Promise<void>;
}

export function RequestDetail({ data, request, onStatusChange, onTimelineSubmit, onTimelineUpdate, onTimelineDelete }: RequestDetailProps) {
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
          <select className="h-9 rounded-md border bg-white px-3 text-sm" value={request.status} onChange={(event) => {
            const status = statuses.find((item) => item === event.target.value);
            if (status) onStatusChange(status);
          }}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
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
          <TimelineList items={request.timeline} onUpdate={onTimelineUpdate} onDelete={onTimelineDelete} />
        </div>
      </CardContent>
    </Card>
  );
}

function DetailField({ label, value }: { readonly label: string; readonly value: React.ReactNode }) {
  return <div className="rounded-lg border bg-muted/40 p-3"><span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>;
}

function TimelineForm({ onSubmit }: { readonly onSubmit: (text: string, files: TimelinePayload[]) => void }) {
  const filesInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFileNames, setSelectedFileNames] = React.useState<string[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const filesInput = form.elements.namedItem("files");
    const files = filesInput instanceof HTMLInputElement ? await readFiles(filesInput.files) : [];
    onSubmit(String(formData.get("text") ?? ""), files);
    form.reset();
    setSelectedFileNames([]);
  }

  function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFileNames(Array.from(event.currentTarget.files ?? []).map((file) => file.name));
  }

  return (
    <form className="grid gap-3 border-t pt-4" onSubmit={handleSubmit} onReset={() => setSelectedFileNames([])}>
      <h4 className="text-sm font-semibold">Adicionar nota ou ficheiros</h4>
      <Textarea name="text" placeholder="Nota, chamada, decisao, visita tecnica..." />
      <input ref={filesInputRef} className="hidden" name="files" type="file" multiple onChange={handleFilesChange} />
      <div className="rounded-md border border-input bg-background p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => filesInputRef.current?.click()}>Escolher ficheiros</Button>
          <span className="text-xs text-muted-foreground">{selectedFileNames.length ? `${selectedFileNames.length} selecionado(s)` : "Nenhum ficheiro selecionado"}</span>
        </div>
        {selectedFileNames.length ? <p className="mt-2 text-xs text-foreground">{selectedFileNames.join(", ")}</p> : null}
      </div>
      <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Ficheiros ate 30MB ficam guardados em SQLite.</p><Button type="submit"><Upload className="h-4 w-4" />Adicionar</Button></div>
    </form>
  );
}

async function readFiles(fileList: FileList | null): Promise<TimelinePayload[]> {
  const allFiles = Array.from(fileList ?? []);
  const skipped = allFiles.filter((file) => file.size > fileLimitBytes);
  if (skipped.length) {
    window.alert(`Ficheiros maiores que 30MB nao sao suportados: ${skipped.map((f) => f.name).join(", ")}`);
  }
  const files = allFiles.filter((file) => file.size <= fileLimitBytes);
  return Promise.all(files.map((file) => new Promise<TimelinePayload>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  })));
}
