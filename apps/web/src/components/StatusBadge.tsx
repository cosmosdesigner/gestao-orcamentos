import type { RequestStatus } from "../types";
import { Badge } from "./ui/badge";

export function StatusBadge({ status }: { readonly status: RequestStatus }) {
  const classes = status === "A aguardar resposta" ? "bg-amber-50 text-amber-800" : status === "Aceite" || status === "Arquivado" ? "bg-blue-50 text-blue-800" : "bg-emerald-50 text-emerald-800";
  return <Badge className={classes}>{status}</Badge>;
}
