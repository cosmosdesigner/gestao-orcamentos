import { Clock, FileText, Pencil, Trash2 } from "lucide-react";
import * as React from "react";
import { shortDate } from "../lib/utils";
import type { TimelineEvent, UpdateTimelineInput } from "../types";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

interface TimelineListProps {
  readonly items: TimelineEvent[];
  readonly onUpdate: (timelineId: string, input: UpdateTimelineInput) => Promise<void>;
  readonly onDelete: (timelineId: string) => Promise<void>;
}

interface TimelineItemProps {
  readonly item: TimelineEvent;
  readonly onUpdate: TimelineListProps["onUpdate"];
  readonly onDelete: TimelineListProps["onDelete"];
}

export function TimelineList({ items, onUpdate, onDelete }: TimelineListProps) {
  if (!items.length) {
    return <div className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">Ainda nao existem notas ou ficheiros.</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <TimelineItem key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  );
}

function TimelineItem({ item, onUpdate, onDelete }: TimelineItemProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftText, setDraftText] = React.useState(item.text);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    setDraftText(item.text);
  }, [item.text]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onUpdate(item.id, { text: draftText });
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Eliminar este evento da timeline?")) return;
    setIsDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article className="rounded-lg border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {shortDate(item.createdAt)}
        </div>
        {!isEditing ? (
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label="Editar evento" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Eliminar evento" disabled={isDeleting} onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {isEditing ? (
        <form className="grid gap-2" onSubmit={handleSave}>
          <Textarea value={draftText} onChange={(event) => setDraftText(event.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => { setDraftText(item.text); setIsEditing(false); }}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>Guardar</Button>
          </div>
        </form>
      ) : (
        <p className="text-sm">{item.text || "Ficheiros adicionados."}</p>
      )}

      <TimelineFiles files={item.files} />
    </article>
  );
}

function TimelineFiles({ files }: { readonly files: TimelineEvent["files"] }) {
  if (!files.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((file) => (
        <a key={file.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold text-blue-700" href={file.dataUrl} download={file.name}>
          <FileText className="h-3.5 w-3.5" />
          {file.name}
        </a>
      ))}
    </div>
  );
}
