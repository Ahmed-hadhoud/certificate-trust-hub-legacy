import { useState } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { act } from "@/lib/store";
import { publishPolicy } from "@/lib/actions";
import { formatDate, latestPolicy } from "@/lib/domain";
import type { AppState } from "@/lib/types";

export function PolicyTab({ s }: { s: AppState }) {
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const latest = latestPolicy(s.policies);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="panel p-5">
        <h2 className="font-semibold">Policy versions</h2>
        <ol className="mt-4 space-y-3">
          {[...s.policies].reverse().map((p) => (
            <li key={p.version} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  v{p.version} · {p.name}
                </p>
                {p.version === latest.version && <Badge variant="success">In force</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                From {formatDate(p.effectiveFrom)}
                {p.until && ` until ${formatDate(p.until)}`}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{p.summary}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="panel h-fit p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Megaphone className="h-4 w-4 text-primary" /> Publish a policy change
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Learners see an information banner. Nothing is blocked and no acceptance is needed.
        </p>
        <div className="mt-4 grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="policy-name">Name</Label>
            <Input
              id="policy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Trust Standard 1.1"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="policy-summary">What changed</Label>
            <Textarea id="policy-summary" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <Button
            variant="brand"
            className="w-fit"
            disabled={!name.trim() || !summary.trim()}
            onClick={() => {
              if (act((d) => publishPolicy(d, name, summary))) {
                toast.success(`Policy v${latest.version + 1} published`);
                setName("");
                setSummary("");
              }
            }}
          >
            Publish v{latest.version + 1}
          </Button>
        </div>
      </section>
    </div>
  );
}
