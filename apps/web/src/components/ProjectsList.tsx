import * as React from "react";
import { FolderKanban, Plus, Pencil, Trash2 } from "lucide-react";
import type { Project } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface ProjectsListProps {
  readonly projects: Project[];
  readonly isPending: boolean;
  readonly onCreate: (input: { name: string; description: string }) => void;
  readonly onUpdate: (id: string, input: { name?: string; description?: string }) => void;
  readonly onDelete: (id: string) => void;
  readonly onSelect: (id: string) => void;
}

export function ProjectsList({ projects, isPending, onCreate, onUpdate, onDelete, onSelect }: ProjectsListProps) {
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  if (!projects.length && !showForm) {
    return (
      <div className="mx-auto max-w-2xl pt-24">
        <div className="mb-8 text-center">
          <FolderKanban className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="text-3xl font-semibold">Gestao de Orcamentos</h1>
          <p className="mt-2 text-muted-foreground">Cria o teu primeiro projeto para comecar.</p>
        </div>
        <CreateProjectCard onSubmit={onCreate} isPending={isPending} onDone={() => setShowForm(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Projetos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Seleciona um projeto para ver os orcamentos.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}><Plus className="h-4 w-4" />Novo projeto</Button>
      </div>

      {showForm ? (
        <div className="mb-6">
          <CreateProjectCard onSubmit={(input) => { onCreate(input); setShowForm(false); }} isPending={isPending} onDone={() => setShowForm(false)} />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) =>
          editingId === project.id ? (
            <EditProjectCard
              key={project.id}
              project={project}
              isPending={isPending}
              onSave={(input) => { onUpdate(project.id, input); setEditingId(null); }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <Card key={project.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => onSelect(project.id)}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button type="button" variant="ghost" size="icon" aria-label="Editar projeto" onClick={() => setEditingId(project.id)}><Pencil className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Eliminar projeto" onClick={() => { if (window.confirm(`Eliminar "${project.name}"? Todos os pedidos serao apagados.`)) onDelete(project.id); }}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{project.description || "Sem descricao"}</p>
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}

function CreateProjectCard({ onSubmit, isPending, onDone }: { onSubmit: (input: { name: string; description: string }) => void; isPending: boolean; onDone: () => void }) {
  return (
    <Card>
      <CardHeader><CardTitle>Novo projeto</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const name = String(new FormData(form).get("name") ?? "").trim();
          if (!name) return;
          const description = String(new FormData(form).get("description") ?? "").trim();
          onSubmit({ name, description });
          form.reset();
          onDone();
        }}>
          <Input name="name" required placeholder="Nome do projeto" />
          <Textarea name="description" placeholder="Descricao (opcional)" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onDone}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>Criar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EditProjectCard({ project, isPending, onSave, onCancel }: { project: Project; isPending: boolean; onSave: (input: { name?: string; description?: string }) => void; onCancel: () => void }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const name = String(new FormData(form).get("name") ?? "").trim();
          const description = String(new FormData(form).get("description") ?? "").trim();
          onSave({ name: name || undefined, description });
        }}>
          <Input name="name" defaultValue={project.name} required placeholder="Nome do projeto" />
          <Textarea name="description" defaultValue={project.description} placeholder="Descricao (opcional)" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>Guardar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
