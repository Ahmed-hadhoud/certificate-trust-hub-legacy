// State transitions. Each action mutates a draft AppState (the store clones first).
import seedJson from "@/data/seed.json";
import {
  ACCESS_DAYS,
  addDays,
  canRequest,
  canTransition,
  currentVersion,
  effectiveStatus,
  findCertificate,
  isBlocked,
  isLocked,
  isPassed,
  latestPolicy,
  levelFor,
  policyInForce,
  registerNotFound,
  requiredItems,
  STANDARD_START,
  versionOf,
} from "./domain";
import type {
  AppState,
  Certificate,
  CertState,
  EventType,
  Policy,
  RevokeReason,
  Sharing,
} from "./types";

type SeedCert = (typeof seedJson.certificates)[number] & {
  revoked?: { reason: string; date: string; previousState: string };
  upgradedFrom?: { issuedAt: string; state: string };
};

export function buildSeed(): AppState {
  const seed = JSON.parse(JSON.stringify(seedJson)) as typeof seedJson;
  const policies = seed.policies as Policy[];
  const learners = seed.learners.map((l) => ({ ...l, policyAck: 2, policyBannerLogged: 2 }));
  const certificates: Certificate[] = (seed.certificates as SeedCert[]).map((c) => {
    const learner = learners.find((l) => l.id === c.learnerId)!;
    const history = [];
    if (c.upgradedFrom) {
      history.push({ date: c.upgradedFrom.issuedAt, action: "Issued", note: `Issued as ${c.upgradedFrom.state}` });
      history.push({
        date: c.issuedAt,
        action: "Upgraded",
        note: `${c.upgradedFrom.state} → Verified. Previous issue date ${c.upgradedFrom.issuedAt}.`,
      });
    } else {
      const issuedState = c.revoked ? c.revoked.previousState : c.state;
      history.push({ date: c.issuedAt, action: "Issued", note: `Issued as ${issuedState}` });
    }
    if (c.revoked) {
      history.push({ date: c.revoked.date, action: "Revoked", note: `Reason: ${c.revoked.reason}` });
    }
    const { upgradedFrom: _u, ...rest } = c;
    return {
      ...rest,
      state: c.state as CertState,
      learnerName: learner.name,
      policyVersion: policyInForce(policies, c.issuedAt).version,
      history,
      revoked: c.revoked as Certificate["revoked"],
    } as Certificate;
  });
  const state: AppState = {
    today: seed.today,
    notFoundSamples: seed.notFoundSamples,
    courses: seed.courses as AppState["courses"],
    learners: learners as AppState["learners"],
    certificates,
    accessRequests: seed.accessRequests as AppState["accessRequests"],
    disputes: seed.disputes as AppState["disputes"],
    policies,
    events: [],
    rate: { notFoundTimes: [], blockedUntil: 0 },
    seq: 100,
  };
  // A few historical events so the log is not empty.
  logEvent(state, "access_requested", "931626", { email: "talent@sample-partner.example" }, "2027-03-09");
  logEvent(state, "access_approved", "931626", { email: "talent@sample-partner.example" }, "2027-03-10");
  logEvent(state, "access_requested", "394871", { email: "recruiter@acme-hr.example" }, "2027-03-12");
  logEvent(state, "dispute_opened", "245890", { disputeId: "DS-1" }, "2027-03-13");
  return state;
}

function nextId(s: AppState, prefix: string): string {
  s.seq += 1;
  return `${prefix}-${s.seq}`;
}

export function logEvent(
  s: AppState,
  type: EventType,
  certId: string | null,
  payload: Record<string, unknown> = {},
  date?: string,
): void {
  const time = new Date().toISOString().slice(11, 19);
  s.events.push({ id: nextId(s, "EV"), ts: `${date ?? s.today}T${time}`, type, certId, payload });
}

export function cert(s: AppState, id: string): Certificate {
  const c = s.certificates.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown certificate ${id}`);
  return c;
}
function course(s: AppState, id: string) {
  return s.courses.find((c) => c.id === id)!;
}

// ---------- Lookup ----------
export type LookupOutcome =
  | { kind: "found"; certId: string }
  | { kind: "not_found" }
  | { kind: "blocked"; until: number };

export function performLookup(s: AppState, query: string, nowMs: number): LookupOutcome {
  if (isBlocked(s.rate, nowMs)) {
    logEvent(s, "lookup_blocked", null, { query });
    return { kind: "blocked", until: s.rate.blockedUntil };
  }
  const c = findCertificate(s, query);
  if (c) {
    logEvent(s, "lookup_found", c.id, { query, state: c.state });
    return { kind: "found", certId: c.id };
  }
  s.rate = registerNotFound(s.rate, nowMs);
  logEvent(s, "lookup_not_found", null, { query });
  return { kind: "not_found" };
}

// ---------- Learner transitions ----------
function setState(s: AppState, c: Certificate, to: CertState, note: string) {
  if (!canTransition(c.state, to)) return false;
  const from = c.state;
  c.state = to;
  c.history.push({ date: s.today, action: "Upgraded", note: `${from} → ${to}. ${note}`.trim() });
  logEvent(s, "certificate_upgraded", c.id, { from, to });
  return true;
}

/** Sets every missing/failed required item to 85 (skipping locked items) and re-evaluates. */
export function simulatePassRemaining(s: AppState, certId: string): { skippedLocked: string[] } {
  const c = cert(s, certId);
  const co = course(s, c.courseId);
  const skippedLocked: string[] = [];
  if (c.state !== "Completed") return { skippedLocked };
  for (const item of requiredItems(c, co)) {
    const r = c.results[item.key] ?? { score: null, attempts: 0 };
    if (isPassed(r)) continue;
    if (isLocked(r)) {
      skippedLocked.push(item.label);
      continue;
    }
    c.results[item.key] = { ...r, score: 85, attempts: r.attempts + 1 };
    logEvent(s, "assessment_passed", c.id, { item: item.key, score: 85, simulated: true });
  }
  const required = versionOf(co, c.courseVersion).required;
  if (levelFor(required, c.results) === "Verified") setState(s, c, "Verified", "All required items at 70+.");
  return { skippedLocked };
}

/** A failed attempt never changes the certificate state. */
export function simulateFailedAttempt(s: AppState, certId: string, itemKey: string): void {
  const c = cert(s, certId);
  const r = c.results[itemKey] ?? { score: null, attempts: 0 };
  if (isLocked(r) || isPassed(r)) return;
  const score = 55;
  c.results[itemKey] = { ...r, score: Math.max(r.score ?? 0, score), attempts: r.attempts + 1 };
  logEvent(s, "assessment_failed", c.id, { item: itemKey, score, simulated: true });
}

/** Retaking the course resets attempts on items that are not passed. */
export function retakeCourse(s: AppState, certId: string): void {
  const c = cert(s, certId);
  for (const [k, r] of Object.entries(c.results)) {
    if (!isPassed(r)) c.results[k] = { ...r, attempts: 0 };
  }
  logEvent(s, "course_retaken", c.id, {});
}

/** Legacy → Verified on the current course version. Same ID; issue date becomes today. */
export function upgradeLegacy(s: AppState, certId: string): boolean {
  const c = cert(s, certId);
  const co = course(s, c.courseId);
  const cur = currentVersion(co);
  if (c.state !== "Legacy" || cur.required.length === 0) return false;
  for (const key of cur.required) {
    c.results[key] = { score: 85, attempts: 1 };
    logEvent(s, "assessment_passed", c.id, { item: key, score: 85, simulated: true });
  }
  const prevDate = c.issuedAt;
  const prevVersion = c.courseVersion;
  c.state = "Verified";
  c.courseVersion = cur.version;
  c.issuedAt = s.today;
  c.policyVersion = latestPolicy(s.policies).version;
  c.history.push({
    date: s.today,
    action: "Upgraded",
    note: `Legacy → Verified on v${cur.version}. Previous issue date ${prevDate} (v${prevVersion}).`,
  });
  logEvent(s, "certificate_upgraded", c.id, { from: "Legacy", to: "Verified", previousIssuedAt: prevDate });
  return true;
}

export function setSharing(s: AppState, learnerId: string, sharing: Sharing): void {
  const l = s.learners.find((x) => x.id === learnerId)!;
  if (l.sharing === sharing) return;
  l.sharing = sharing;
  const c = s.certificates.find((x) => x.learnerId === learnerId);
  logEvent(s, "setting_changed", c?.id ?? null, { learnerId, sharing });
}

// ---------- Access requests ----------
export function requestAccess(
  s: AppState,
  certId: string,
  email: string,
  requester: string,
): { ok: true } | { ok: false; error: string } {
  const c = cert(s, certId);
  const e = email.trim().toLowerCase();
  if (!canRequest(s, e, c.learnerId)) {
    logEvent(s, "access_refused", c.id, { email: e, reason: "limit" });
    return {
      ok: false,
      error: "You have reached the limit of 3 access requests for this learner. You cannot send another request.",
    };
  }
  s.accessRequests.push({
    id: nextId(s, "AR"),
    certId,
    learnerId: c.learnerId,
    email: e,
    requester: requester.trim(),
    createdAt: s.today,
    status: "pending",
  });
  logEvent(s, "access_requested", c.id, { email: e, requester });
  return { ok: true };
}

export function decideRequest(s: AppState, requestId: string, approve: boolean): void {
  const r = s.accessRequests.find((x) => x.id === requestId);
  if (!r || effectiveStatus(r, s.today) !== "pending") return;
  r.status = approve ? "approved" : "declined";
  r.decidedAt = s.today;
  logEvent(s, approve ? "access_approved" : "access_declined", r.certId, {
    email: r.email,
    ...(approve ? { validUntil: addDays(s.today, ACCESS_DAYS) } : {}),
  });
}

export function sweepExpirations(s: AppState): void {
  for (const r of s.accessRequests) {
    if ((r.status === "pending" || r.status === "approved") && effectiveStatus(r, s.today) === "expired") {
      const was = r.status;
      r.status = "expired";
      r.expiredAt = s.today;
      logEvent(s, "access_expired", r.certId, { email: r.email, was });
    }
  }
}

export function fastForward(s: AppState, days: number): void {
  s.today = addDays(s.today, days);
  sweepExpirations(s);
}

// ---------- Admin ----------
export function revoke(s: AppState, certId: string, reason: RevokeReason, date: string): boolean {
  const c = cert(s, certId);
  if (c.state === "Revoked") return false;
  c.revoked = { reason, date, previousState: c.state };
  c.state = "Revoked";
  c.history.push({ date, action: "Revoked", note: `Reason: ${reason}` });
  logEvent(s, "certificate_revoked", c.id, { reason, date });
  return true;
}

export function openDispute(s: AppState, certId: string, reason: string, email: string): string {
  const id = nextId(s, "DS");
  s.disputes.push({ id, certId, reason: reason.trim(), email: email.trim(), createdAt: s.today, status: "open" });
  logEvent(s, "dispute_opened", certId, { disputeId: id });
  return id;
}

function closeDispute(s: AppState, id: string, status: "upheld" | "rejected", outcome: string) {
  const d = s.disputes.find((x) => x.id === id);
  if (!d || d.status !== "open") return null;
  d.status = status;
  d.outcome = outcome;
  d.closedAt = s.today;
  logEvent(s, "dispute_closed", d.certId, { disputeId: id, status, outcome });
  return d;
}
export function rejectDispute(s: AppState, id: string, outcome: string): void {
  closeDispute(s, id, "rejected", outcome || "Rejected; certificate unchanged");
}
export function upholdWithCorrection(
  s: AppState,
  id: string,
  changes: { learnerName?: string; courseId?: string; issuedAt?: string },
  outcome: string,
): void {
  const d = closeDispute(s, id, "upheld", outcome || "Upheld; certificate corrected");
  if (!d) return;
  const c = cert(s, d.certId);
  const notes: string[] = [];
  if (changes.learnerName && changes.learnerName !== c.learnerName) {
    notes.push(`Name "${c.learnerName}" → "${changes.learnerName}"`);
    c.learnerName = changes.learnerName;
    const l = s.learners.find((x) => x.id === c.learnerId);
    if (l) l.name = changes.learnerName;
  }
  if (changes.courseId && changes.courseId !== c.courseId) {
    const to = course(s, changes.courseId);
    notes.push(`Course "${course(s, c.courseId).name}" → "${to.name}"`);
    c.courseId = to.id;
    c.courseVersion = currentVersion(to).version;
  }
  if (changes.issuedAt && changes.issuedAt !== c.issuedAt) {
    notes.push(`Issue date ${c.issuedAt} → ${changes.issuedAt}`);
    c.issuedAt = changes.issuedAt;
  }
  c.history.push({ date: s.today, action: "Corrected", note: `Dispute ${id}: ${notes.join("; ") || "no field changes"}` });
  logEvent(s, "certificate_corrected", c.id, { disputeId: id, changes: notes });
}
export function upholdWithRevoke(s: AppState, id: string, reason: RevokeReason, outcome: string): void {
  const d = closeDispute(s, id, "upheld", outcome || `Upheld; certificate revoked (${reason})`);
  if (d) revoke(s, d.certId, reason, s.today);
}

/** Toggles an unpublished required flag. Never touches certificates. */
export function toggleDraftRequired(s: AppState, courseId: string, itemKey: string): void {
  const co = course(s, courseId);
  const draft = new Set(co.draftRequired ?? currentVersion(co).required);
  if (draft.has(itemKey)) draft.delete(itemKey);
  else draft.add(itemKey);
  co.draftRequired = co.items.map((i) => i.key).filter((k) => draft.has(k));
}

export function publishCourseVersion(s: AppState, courseId: string, changeNote: string): boolean {
  const note = changeNote.trim();
  if (!note) return false;
  const co = course(s, courseId);
  const cur = currentVersion(co);
  const version = cur.version + 1;
  co.versions.push({ version, required: co.draftRequired ?? [...cur.required], changeNote: note, publishedAt: s.today });
  delete co.draftRequired;
  logEvent(s, "course_version_published", null, { courseId, version, changeNote: note });
  return true;
}

export function publishPolicy(s: AppState, name: string, summary: string): boolean {
  if (!name.trim() || !summary.trim()) return false;
  const prev = latestPolicy(s.policies);
  prev.until = addDays(s.today, -1) < prev.effectiveFrom ? prev.effectiveFrom : addDays(s.today, -1);
  const version = prev.version + 1;
  s.policies.push({ version, name: name.trim(), summary: summary.trim(), effectiveFrom: s.today });
  logEvent(s, "policy_published", null, { version, name });
  return true;
}

export function markPolicyBannerSeen(s: AppState, learnerId: string): void {
  const l = s.learners.find((x) => x.id === learnerId)!;
  const v = latestPolicy(s.policies).version;
  if ((l.policyBannerLogged ?? 0) >= v) return;
  l.policyBannerLogged = v;
  const c = s.certificates.find((x) => x.learnerId === learnerId);
  logEvent(s, "policy_banner_seen", c?.id ?? null, { learnerId, policyVersion: v });
}
export function dismissPolicyBanner(s: AppState, learnerId: string): void {
  const l = s.learners.find((x) => x.id === learnerId)!;
  l.policyAck = latestPolicy(s.policies).version;
}

export function logOnce(s: AppState, type: EventType, certId: string, payload: Record<string, unknown> = {}) {
  logEvent(s, type, certId, payload);
}

export { STANDARD_START };
