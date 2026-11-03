import type { AppState } from "./types";

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\n");
}

export function exportTables(s: AppState) {
  const certificates = s.certificates.map((c) => ({
    id: c.id,
    code: c.code,
    learner: c.learnerName,
    learnerId: c.learnerId,
    courseId: c.courseId,
    courseVersion: c.courseVersion,
    issuedAt: c.issuedAt,
    state: c.state,
    policyVersion: c.policyVersion,
    revokedReason: c.revoked?.reason ?? "",
    revokedDate: c.revoked?.date ?? "",
    history: c.history,
  }));
  const results = s.certificates.flatMap((c) =>
    Object.entries(c.results).map(([item, r]) => ({
      certId: c.id,
      item,
      score: r.score,
      attempts: r.attempts,
      feedback: r.feedback ?? "",
    })),
  );
  return {
    certificates,
    results,
    accessRequests: s.accessRequests as unknown as Record<string, unknown>[],
    disputes: s.disputes as unknown as Record<string, unknown>[],
    events: s.events as unknown as Record<string, unknown>[],
  };
}

export function exportJson(s: AppState) {
  download(`career180-data-${s.today}.json`, JSON.stringify(exportTables(s), null, 2), "application/json");
}

export function exportCsvFiles(s: AppState) {
  const t = exportTables(s);
  Object.entries(t).forEach(([name, rows], i) => {
    setTimeout(() => download(`career180-${name}-${s.today}.csv`, toCsv(rows), "text/csv"), i * 250);
  });
}

export function exportEventsCsv(rows: Record<string, unknown>[], today: string) {
  download(`career180-events-${today}.csv`, toCsv(rows), "text/csv");
}
