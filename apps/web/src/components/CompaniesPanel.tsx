import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import type { Category, Company } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { TagInput } from "./TagInput";

interface CompaniesPanelProps {
  readonly companies: Company[];
  readonly categories: Category[];
  readonly isPending: boolean;
  readonly onCreate: (input: { name: string; contact: string; categoryIds: string[] }) => void;
  readonly onUpdate: (id: string, input: { name?: string; contact?: string; categoryIds?: string[] }) => void;
  readonly onDelete: (id: string) => void;
  readonly onCategoryCreate: (name: string) => void;
}

export function CompaniesPanel({ companies, categories, isPending, onCreate, onUpdate, onDelete, onCategoryCreate }: CompaniesPanelProps) {
  const [showForm, setShowForm] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newContact, setNewContact] = React.useState("");
  const [newCategoryIds, setNewCategoryIds] = React.useState<string[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [filterCategoryId, setFilterCategoryId] = React.useState<string | null>(null);

  const filteredCompanies = filterCategoryId
    ? companies.filter((c) => c.categories?.some((cat) => cat.id === filterCategoryId))
    : companies;

  function handleAddCategory(
    currentIds: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    name: string,
  ) {
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!currentIds.includes(existing.id)) {
        setter((prev) => [...prev, existing.id]);
      }
    } else {
      onCategoryCreate(name);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Empresas disponiveis para todos os projetos.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}><Plus className="h-4 w-4" />Nova empresa</Button>
      </div>

      {categories.length ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterCategoryId(null)}
            className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition-colors", !filterCategoryId ? "border-primary bg-primary text-primary-foreground" : "border-input bg-white text-muted-foreground hover:text-foreground")}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategoryId(cat.id)}
              className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition-colors", filterCategoryId === cat.id ? "border-primary bg-primary text-primary-foreground" : "border-input bg-white text-muted-foreground hover:text-foreground")}
            >
              {cat.name}
            </button>
          ))}
        </div>
      ) : null}

      {showForm ? (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <CreateCompanyForm
              categories={categories}
              selectedCategoryIds={newCategoryIds}
              setSelectedCategoryIds={setNewCategoryIds}
              isPending={isPending}
              onSave={(name, contact, ids) => {
                onCreate({ name, contact, categoryIds: ids });
                setNewName("");
                setNewContact("");
                setNewCategoryIds([]);
                setShowForm(false);
              }}
              onCancel={() => { setShowForm(false); setNewCategoryIds([]); }}
              onAddCategory={(name) => handleAddCategory(newCategoryIds, setNewCategoryIds, name)}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-2">
        {filteredCompanies.length ? filteredCompanies.map((company) =>
          editingId === company.id ? (
            <Card key={company.id}>
              <CardContent className="pt-4">
                <EditCompanyForm
                  company={company}
                  categories={categories}
                  isPending={isPending}
                  onSave={(input) => { onUpdate(company.id, input); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                  onCategoryCreate={onCategoryCreate}
                />
              </CardContent>
            </Card>
          ) : (
            <div key={company.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{company.name}</p>
                  <Button type="button" variant="ghost" size="icon" aria-label="Editar empresa" onClick={() => setEditingId(company.id)}><Pencil className="h-3.5 w-3.5" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">{company.contact || "Sem contacto"}</p>
                {company.categories?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {company.categories.map((cat) => (
                      <span key={cat.id} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{cat.name}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Eliminar empresa" onClick={() => { if (window.confirm(`Eliminar "${company.name}"?`)) onDelete(company.id); }}><Trash2 className="h-4 w-4 text-red-600" /></Button>
            </div>
          ),
        ) : (
          <div className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">{filterCategoryId ? "Nenhuma empresa com essa categoria." : "Nenhuma empresa registada."}</div>
        )}
      </div>
    </div>
  );
}

function CreateCompanyForm({
  categories, selectedCategoryIds, setSelectedCategoryIds, isPending, onSave, onCancel, onAddCategory,
}: {
  categories: Category[];
  selectedCategoryIds: string[];
  setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  isPending: boolean;
  onSave: (name: string, contact: string, categoryIds: string[]) => void;
  onCancel: () => void;
  onAddCategory: (name: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");

  function handleCatAdd(name: string) {
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selectedCategoryIds.includes(existing.id)) {
        setSelectedCategoryIds((prev) => [...prev, existing.id]);
      }
    } else {
      onAddCategory(name);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      if (!name.trim() || !selectedCategoryIds.length) return;
      onSave(name.trim(), contact.trim(), selectedCategoryIds);
    }}>
      <Input required placeholder="Nome da empresa" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="Contacto" value={contact} onChange={(e) => setContact(e.target.value)} />
      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Categorias</p>
        <TagInput
          tags={categories.filter((c) => selectedCategoryIds.includes(c.id))}
          suggestions={categories}
          onAdd={(n) => handleCatAdd(n)}
          onRemove={(id) => setSelectedCategoryIds((prev) => prev.filter((cid) => cid !== id))}
          placeholder="Escrever categoria..."
        />
        {!selectedCategoryIds.length ? <p className="mt-1 text-xs text-red-600">Seleciona pelo menos uma categoria.</p> : null}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending || !selectedCategoryIds.length}>Criar</Button>
      </div>
    </form>
  );
}

function EditCompanyForm({
  company, categories, isPending, onSave, onCancel, onCategoryCreate,
}: {
  company: Company;
  categories: Category[];
  isPending: boolean;
  onSave: (input: { name?: string; contact?: string; categoryIds?: string[] }) => void;
  onCancel: () => void;
  onCategoryCreate: (name: string) => void;
}) {
  const [name, setName] = React.useState(company.name);
  const [contact, setContact] = React.useState(company.contact);
  const [categoryIds, setCategoryIds] = React.useState<string[]>(
    company.categories?.map((c) => c.id) ?? [],
  );

  function handleAdd(name: string) {
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!categoryIds.includes(existing.id)) {
        setCategoryIds((prev) => [...prev, existing.id]);
      }
    } else {
      onCategoryCreate(name);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      onSave({ name: name.trim() || undefined, contact: contact.trim() || undefined, categoryIds });
    }}>
      <Input required placeholder="Nome da empresa" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="Contacto" value={contact} onChange={(e) => setContact(e.target.value)} />
      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Categorias</p>
        <TagInput
          tags={categories.filter((c) => categoryIds.includes(c.id))}
          suggestions={categories}
          onAdd={(n) => handleAdd(n)}
          onRemove={(id) => setCategoryIds((prev) => prev.filter((cid) => cid !== id))}
          placeholder="Escrever categoria..."
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>Guardar</Button>
      </div>
    </form>
  );
}
