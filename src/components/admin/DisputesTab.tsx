import { useState } from "react";
import { Gavel } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { act } from "@/lib/store";
import { rejectDispute, upholdWithCorrection, upholdWithRevoke } from "@/lib/actions";
import { formatDate } from "@/lib/domain";
import type { AppState, Dispute, RevokeReason } from "@/lib/types";
import { StatusBadge } from "@/components/site/StatusBadges";
import { LevelBadge } from "@/components/verify/LevelBadge";
import { RevokeFields } from "./CertificatesTab";

type Decision = "reject" | "correct" | "revoke";

export function DisputesTab({ s }: { s: AppState }) {
  const [review, setReview] = useState<Dispute | null>(null);
  const sorted = [...s.disputes].sort(
    (a, b) => Number(b.status === "open") - Number(a.status === "open") || b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <section className="space-y-3">
      {sorted.length === 0 && <p className="panel p-5 text-muted-foreground">No disputes.</p>}
      {sorted.map((d) => {
        const cert = s.certificates.find((c) => c.id === d.certId);
        return (
          <article key={d.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {d.id} · {formatDate(d.createdAt)} · from {d.email}
                </p>
                <p className="mt-1 font-medium">
                  Certificate <span className="font-mono">{d.certId}</span> · {cert?.learnerName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {cert && <LevelBadge state={cert.state} withInfo={false} />}
                <StatusBadge status={d.status} />
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">“{d.reason}”</p>
            {d.outcome && (
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">Outcome ({d.closedAt && formatDate(d.closedAt)}):</span>{" "}
                {d.outcome}
              </p>
            )}
            {d.status === "open" && (
              <Button className="mt-4" size="sm" variant="brand" onClick={() => setReview(d)}>
                <Gavel /> Review
              </Button>
            )}
          </article>
        );
      })}
      {review && <ReviewDialog s={s} dispute={review} onClose={() => setReview(null)} />}
    </section>
  );
}

function ReviewDialog({ s, dispute, onClose }: { s: AppState; dispute: Dispute; onClose: () => void }) {
  const cert = s.certificates.find((c) => c.id === dispute.certId)!;
  const [decision, setDecision] = useState<Decision>("reject");
  const [outcome, setOutcome] = useState("");
  const [name, setName] = useState(cert.learnerName);
  const [courseId, setCourseId] = useState(cert.courseId);
  const [issuedAt, setIssuedAt] = useState(cert.issuedAt);
  const [reason, setReason] = useState<RevokeReason>("error");
  const revoked = cert.state === "Revoked";

  const submit = () => {
    act((d) => {
      if (decision === "reject") rejectDispute(d, dispute.id, outcome);
      else if (decision === "correct")
        upholdWithCorrection(d, dispute.id, { learnerName: name.trim(), courseId, issuedAt }, outcome);
      else upholdWithRevoke(d, dispute.id, reason, outcome);
    });
    toast.success(`Dispute ${dispute.id} closed`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review dispute {dispute.id}</DialogTitle>
          <DialogDescription>Certificate {cert.id} · “{dispute.reason}”</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Decision</Label>
            <Select value={decision} onValueChange={(v) => setDecision(v as Decision)}>
              <SelectTrigger aria-label="Decision">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reject">Reject — nothing changes</SelectItem>
                <SelectItem value="correct" disabled={revoked}>
                  Uphold — correct the certificate
                </SelectItem>
                <SelectItem value="revoke" disabled={revoked}>
                  Uphold — revoke the certificate
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {decision === "correct" && (
            <div className="grid gap-3 rounded-lg border border-border p-3">
              <div className="grid gap-1.5">
                <Label htmlFor="fix-name">Learner name</Label>
                <Input id="fix-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger aria-label="Course">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {s.courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fix-date">Issue date</Label>
                <Input id="fix-date" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Changes are recorded in the certificate history.</p>
            </div>
          )}
          {decision === "revoke" && <RevokeFields reason={reason} setReason={setReason} />}
          <div className="grid gap-1.5">
            <Label htmlFor="outcome">Outcome note</Label>
            <Textarea
              id="outcome"
              rows={3}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. Evidence checked; certificate unchanged"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant={decision === "revoke" ? "destructive" : "brand"} onClick={submit}>
            Record outcome
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
