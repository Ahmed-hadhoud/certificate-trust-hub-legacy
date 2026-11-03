import { useState } from "react";
import { Ban, History } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { act } from "@/lib/store";
import { revoke } from "@/lib/actions";
import { formatDate } from "@/lib/domain";
import type { AppState, Certificate, RevokeReason } from "@/lib/types";
import { LevelBadge } from "@/components/verify/LevelBadge";

export const REVOKE_REASONS: { value: RevokeReason; label: string }[] = [
  { value: "error", label: "Error" },
  { value: "fraud", label: "Fraud" },
  { value: "legal", label: "Legal" },
];

export function RevokeFields({
  reason,
  setReason,
  date,
  setDate,
}: {
  reason: RevokeReason;
  setReason: (r: RevokeReason) => void;
  date?: string;
  setDate?: (d: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label>Reason</Label>
        <Select value={reason} onValueChange={(v) => setReason(v as RevokeReason)}>
          <SelectTrigger aria-label="Revoke reason">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REVOKE_REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {setDate && (
        <div className="grid gap-1.5">
          <Label htmlFor="revoke-date">Date</Label>
          <Input id="revoke-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      )}
    </div>
  );
}

export function CertificatesTab({ s }: { s: AppState }) {
  const [filter, setFilter] = useState<string>("all");
  const [historyFor, setHistoryFor] = useState<Certificate | null>(null);
  const [revokeFor, setRevokeFor] = useState<Certificate | null>(null);
  const [reason, setReason] = useState<RevokeReason>("error");
  const [date, setDate] = useState(s.today);

  const list = s.certificates.filter((c) => filter === "all" || c.state === filter);
  const courseName = (id: string) => s.courses.find((c) => c.id === id)?.name ?? id;
  const liveHistory = historyFor ? s.certificates.find((c) => c.id === historyFor.id) : null;

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <h2 className="font-semibold">Certificates ({list.length})</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44" aria-label="Filter by state">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {["Completed", "Verified", "Legacy", "Revoked"].map((st) => (
              <SelectItem key={st} value={st}>
                {st}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Learner</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono">{c.id}</TableCell>
                <TableCell>{c.learnerName}</TableCell>
                <TableCell className="text-sm">
                  {courseName(c.courseId)} <span className="text-muted-foreground">v{c.courseVersion}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">{formatDate(c.issuedAt)}</TableCell>
                <TableCell>
                  <LevelBadge state={c.state} withInfo={false} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <Button variant="ghost" size="sm" onClick={() => setHistoryFor(c)}>
                    <History /> History
                  </Button>
                  {c.state === "Revoked" ? (
                    <span className="ml-2 text-xs text-muted-foreground">Final</span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setRevokeFor(c);
                        setReason("error");
                        setDate(s.today);
                      }}
                    >
                      <Ban /> Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>History · {liveHistory?.id}</DialogTitle>
            <DialogDescription>
              {liveHistory?.learnerName} · {liveHistory && courseName(liveHistory.courseId)}
            </DialogDescription>
          </DialogHeader>
          <ol className="relative space-y-4 border-l border-border pl-5">
            {liveHistory?.history.map((h, i) => (
              <li key={i}>
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-gradient-brand" />
                <p className="text-sm font-medium">
                  {h.action} <span className="font-normal text-muted-foreground">· {formatDate(h.date)}</span>
                </p>
                <p className="text-sm text-muted-foreground">{h.note}</p>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeFor} onOpenChange={(o) => !o && setRevokeFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke certificate {revokeFor?.id}</DialogTitle>
            <DialogDescription>
              Revocation is final. The certificate cannot be restored and verifiers will see it as Revoked
              immediately.
            </DialogDescription>
          </DialogHeader>
          <RevokeFields reason={reason} setReason={setReason} date={date} setDate={setDate} />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={!date}
              onClick={() => {
                if (!revokeFor) return;
                act((d) => revoke(d, revokeFor.id, reason, date));
                toast.success(`Certificate ${revokeFor.id} revoked`);
                setRevokeFor(null);
              }}
            >
              <Ban /> Revoke permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
