import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { effectiveStatus } from "@/lib/domain";
import { exportEventsCsv } from "@/lib/export";
import { EVENT_TYPES, type AppState } from "@/lib/types";

const label = (t: string) => t.replace(/_/g, " ");

export function computeMetrics(s: AppState) {
  const count = (t: string) => s.events.filter((e) => e.type === t).length;
  const found = count("lookup_found");
  const notFound = count("lookup_not_found");
  const total = found + notFound;
  const live = s.certificates.filter((c) => c.state !== "Revoked");
  const verified = live.filter((c) => c.state === "Verified").length;
  const byStatus = { pending: 0, approved: 0, declined: 0, expired: 0 };
  for (const r of s.accessRequests) byStatus[effectiveStatus(r, s.today)] += 1;
  return {
    totalLookups: total,
    notFoundRate: total ? Math.round((notFound / total) * 100) : 0,
    evidenceOpens: count("evidence_opened"),
    verifiedShare: live.length ? Math.round((verified / live.length) * 100) : 0,
    verified,
    liveCount: live.length,
    byStatus,
    upheld: s.disputes.filter((d) => d.status === "upheld").length,
  };
}

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function EventsTab({ s }: { s: AppState }) {
  const [type, setType] = useState("all");
  const [certId, setCertId] = useState("");
  const m = computeMetrics(s);

  const rows = useMemo(
    () =>
      [...s.events]
        .reverse()
        .filter((e) => (type === "all" || e.type === type) && (!certId || (e.certId ?? "").includes(certId.trim()))),
    [s.events, type, certId],
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile label="Total lookups" value={m.totalLookups} />
        <Tile label="Not found rate" value={`${m.notFoundRate}%`} />
        <Tile label="Evidence opens" value={m.evidenceOpens} />
        <Tile label="Verified share" value={`${m.verifiedShare}%`} sub={`${m.verified} of ${m.liveCount} valid`} />
        <Tile
          label="Access requests"
          value={m.byStatus.pending + m.byStatus.approved + m.byStatus.declined + m.byStatus.expired}
          sub={`${m.byStatus.pending} pending · ${m.byStatus.approved} approved · ${m.byStatus.declined} declined · ${m.byStatus.expired} expired`}
        />
        <Tile label="Upheld disputes" value={m.upheld} />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-5">
          <h2 className="mr-auto font-semibold">Event log ({rows.length})</h2>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-52" aria-label="Filter by event type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {label(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-40"
            placeholder="Certificate ID"
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
            aria-label="Filter by certificate ID"
          />
          <Button
            variant="outline"
            onClick={() =>
              exportEventsCsv(
                rows.map((e) => ({ id: e.id, ts: e.ts, type: e.type, certId: e.certId, payload: e.payload })),
                s.today,
              )
            }
          >
            <Download /> CSV
          </Button>
        </div>
        <div className="max-h-[560px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Certificate</TableHead>
                <TableHead>Payload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{e.ts.replace("T", " ")}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm capitalize">{label(e.type)}</TableCell>
                  <TableCell className="font-mono text-sm">{e.certId ?? "—"}</TableCell>
                  <TableCell className="max-w-md truncate font-mono text-xs text-muted-foreground">
                    {JSON.stringify(e.payload)}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No events yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
