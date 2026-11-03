import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { answer, summarize, SUGGESTED_QUESTIONS, type Evidence } from "@/lib/ai-summary";
import { act } from "@/lib/store";
import { logEvent } from "@/lib/actions";

type Msg = { role: "user" | "ai"; text: string };

export function AiSummaryDialog({ evidence, certId }: { evidence: Evidence; certId: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, thinking]);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      act((d) => logEvent(d, "ai_summary_opened", certId, {}));
      setMsgs([{ role: "ai", text: summarize(evidence) }]);
    }
  };

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || thinking) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "ai", text: answer(evidence, text) }]);
      setThinking(false);
    }, 450);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="text-primary" /> Summarize performance
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> Performance summary
          </DialogTitle>
          <DialogDescription>
            {evidence.learnerName} · {evidence.courseName}
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
          AI-generated summary. It is not evidence.
        </p>

        <div className="min-h-40 flex-1 space-y-3 overflow-y-auto pr-1">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground"
                    : "max-w-[90%] rounded-2xl rounded-bl-sm border border-border bg-muted px-4 py-3 text-sm leading-relaxed"
                }
              >
                {m.text}
                {m.role === "ai" && (
                  <p className="mt-2 text-[11px] text-muted-foreground">AI-generated summary. It is not evidence.</p>
                )}
              </div>
            </div>
          ))}
          {thinking && <p className="text-sm text-muted-foreground">Thinking…</p>}
          <div ref={endRef} />
        </div>

        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <Button key={q} variant="secondary" size="sm" onClick={() => ask(q)} disabled={thinking}>
              {q}
            </Button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this learner's evidence…"
            aria-label="Ask a question"
          />
          <Button type="submit" variant="brand" size="icon" aria-label="Send" disabled={thinking}>
            <Send />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
