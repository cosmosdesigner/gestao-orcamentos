import { Bot, Maximize2, Send, X } from "lucide-react";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Textarea } from "./ui/textarea";

export type Message = { role: "user" | "assistant"; text: string };

interface AssistantPanelProps {
  readonly messages: Message[];
  readonly isPending: boolean;
  readonly onAsk: (question: string) => void;
  readonly onExpand?: () => void;
}

export function AssistantPanel({ messages, isPending, onAsk, onExpand }: AssistantPanelProps) {
  return (
    <Card className="sticky top-4">
      <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>AI sobre orcamentos</CardTitle><div className="flex items-center gap-1">{onExpand ? <Button type="button" variant="ghost" size="icon" aria-label="Expandir conversa" onClick={onExpand}><Maximize2 className="h-4 w-4" /></Button> : null}<Bot className="h-4 w-4 text-muted-foreground" /></div></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">{["Resume os pedidos em aberto", "Que empresas ainda nao responderam?", "Qual o orçamento mais barato?"].map((prompt) => <Button key={prompt} type="button" variant="outline" onClick={() => onAsk(prompt)}>{prompt}</Button>)}</div>
        <div className="max-h-96 space-y-2 overflow-auto pr-1">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={cn("rounded-lg border p-3 text-sm", message.role === "assistant" ? "bg-teal-50 border-teal-100" : "bg-blue-50 border-blue-100")}><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{message.role === "assistant" ? "Resposta" : "Pergunta"}</p>{message.role === "assistant" ? <div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown></div> : message.text}</div>)}</div>
        <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); const question = String(formData.get("question") ?? "").trim(); if (!question) return; onAsk(question); event.currentTarget.reset(); }}>
          <Textarea name="question" placeholder="Pergunta sobre pedidos, empresas, valores, notas ou ficheiros..." />
          <Button type="submit" disabled={isPending}><Send className="h-4 w-4" />Perguntar</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AIConversationModal({ messages, isPending, onAsk, onClose }: AssistantPanelProps & { readonly onClose: () => void }) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [question, setQuestion] = React.useState("");

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl" style={{ height: "90vh" }}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Conversa com AI</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        <div ref={listRef} className="flex-1 space-y-4 overflow-auto px-6 py-4">
          {messages.length ? messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={cn("rounded-lg border p-4", message.role === "assistant" ? "bg-teal-50 border-teal-100" : "bg-blue-50 border-blue-100")}>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{message.role === "assistant" ? "Resposta" : "Pergunta"}</p>
              {message.role === "assistant" ? <div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown></div> : <p className="text-sm whitespace-pre-wrap">{message.text}</p>}
            </div>
          )) : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Faz uma pergunta sobre os teus orcamentos.</div>}
        </div>

        <div className="border-t px-6 py-4">
          <form className="flex gap-3" onSubmit={(event) => {
            event.preventDefault();
            if (!question.trim()) return;
            onAsk(question.trim());
            setQuestion("");
          }}>
            <Textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Pergunta sobre pedidos, empresas, valores, notas ou ficheiros..."
              className="min-h-12 flex-1"
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); const form = event.currentTarget.form; if (form) form.requestSubmit(); } }}
            />
            <Button type="submit" disabled={isPending || !question.trim()} className="self-end"><Send className="h-4 w-4" />Perguntar</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
