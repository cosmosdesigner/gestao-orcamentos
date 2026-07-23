export function EmptyState({ text }: { readonly text: string }) {
  return <div className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
