// Pure product rules (Section 3 of the brief). No React, no storage.
import type {
  AccessRequest,
  AppState,
  Certificate,
  Course,
  CourseItem,
  CourseVersion,
  ItemResult,
  Learner,
  Policy,
  RequestStatus,
} from "./types";

export const PASS_MARK = 70;
export const MAX_ATTEMPTS = 5;
export const ACCESS_DAYS = 14;
export const MAX_REQUESTS_PER_EMAIL = 3;
export const NOT_FOUND_LIMIT = 5;
export const NOT_FOUND_WINDOW_MS = 60_000;
export const BLOCK_MS = 30_000;
export const STANDARD_START = "2027-01-01";
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const VERIFIED_EXPLANATION =
  "Verified means the learner passed all the quizzes and assessments, and the course project where the course has one, each with at least 70%. It shows how much the learner benefited from the course and how far their skills in it can be trusted.";
export const LEGACY_POLICY_TEXT =
  "Before 1 Jan 2027 a certificate meant the learner finished the course. No assessment results were checked or shown.";
export const DISCLOSURE_TEXT =
  "Your results are public by default. Anyone who has your certificate ID or QR can see your scores and project feedback. You can switch to private at any time in your profile settings.";
export const NOT_FOUND_TEXT =
  "We could not find a certificate with this ID or code. Check the characters and try again, or contact Career-180.";

// ---------- Dates (ISO yyyy-mm-dd strings, UTC) ----------
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function formatDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ---------- Grading ----------
export type Band = "Excellent" | "Very good" | "Good" | "Not passed" | "Not taken";
export function band(score: number | null | undefined): Band {
  if (score === null || score === undefined) return "Not taken";
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very good";
  if (score >= PASS_MARK) return "Good";
  return "Not passed";
}
export function isPassed(r: ItemResult | undefined): boolean {
  return !!r && r.score !== null && r.score >= PASS_MARK;
}
export function isLocked(r: ItemResult | undefined): boolean {
  return !!r && r.attempts >= MAX_ATTEMPTS && !isPassed(r);
}
export function attemptsLeft(r: ItemResult | undefined): number {
  return Math.max(0, MAX_ATTEMPTS - (r?.attempts ?? 0));
}

/** Project counts 50% and the others share 50%; otherwise all items equal. Missing = 0. */
export function finalGrade(items: CourseItem[], results: Record<string, ItemResult>): number | null {
  if (items.length === 0) return null;
  const score = (k: string) => results[k]?.score ?? 0;
  const project = items.find((i) => i.type === "project");
  const others = items.filter((i) => i.type !== "project");
  if (project && others.length > 0) {
    const otherAvg = others.reduce((s, i) => s + score(i.key), 0) / others.length;
    return Math.round(score(project.key) * 0.5 + otherAvg * 0.5);
  }
  return Math.round(items.reduce((s, i) => s + score(i.key), 0) / items.length);
}

/** Verified only when every required item is at 70+. No required items -> Completed. */
export function levelFor(required: string[], results: Record<string, ItemResult>): "Verified" | "Completed" {
  if (required.length === 0) return "Completed";
  return required.every((k) => isPassed(results[k])) ? "Verified" : "Completed";
}

const RANK: Record<string, number> = { Legacy: 0, Completed: 1, Verified: 2, Revoked: 3 };
/** A certificate never moves down; Revoked is final. */
export function canTransition(from: Certificate["state"], to: Certificate["state"]): boolean {
  if (from === "Revoked") return false;
  if (to === "Revoked") return true;
  return (RANK[to] ?? 0) > (RANK[from] ?? 0);
}

// ---------- Courses ----------
export function currentVersion(course: Course): CourseVersion {
  return course.versions[course.versions.length - 1]!;
}
export function versionOf(course: Course, v: number): CourseVersion {
  return course.versions.find((x) => x.version === v) ?? course.versions[0]!;
}
export function itemsFor(course: Course, keys: string[]): CourseItem[] {
  return keys
    .map((k) => course.items.find((i) => i.key === k))
    .filter((i): i is CourseItem => !!i);
}
export function requiredItems(cert: Certificate, course: Course): CourseItem[] {
  return itemsFor(course, versionOf(course, cert.courseVersion).required);
}
export function missingItems(cert: Certificate, course: Course): CourseItem[] {
  return requiredItems(cert, course).filter((i) => !isPassed(cert.results[i.key]));
}
export function newerVersion(cert: Certificate, course: Course): CourseVersion | null {
  const cur = currentVersion(course);
  return cur.version > cert.courseVersion ? cur : null;
}
export function itemTypeLabel(i: CourseItem): string {
  if (i.type === "exam") return i.proctored ? "Exam (proctored)" : "Exam";
  return i.type === "quiz" ? "Quiz" : "Project";
}

// ---------- Policy ----------
export function latestPolicy(policies: Policy[]): Policy {
  return policies[policies.length - 1]!;
}
export function policyInForce(policies: Policy[], date: string): Policy {
  const sorted = [...policies].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  let found = sorted[0]!;
  for (const p of sorted) if (p.effectiveFrom <= date) found = p;
  return found;
}

// ---------- Lookup ----------
export function normalizeQuery(q: string): string {
  return q.trim().toUpperCase().replace(/[\s-]/g, "");
}
export function findCertificate(state: AppState, query: string): Certificate | null {
  const q = normalizeQuery(query);
  if (/^\d{6}$/.test(q)) return state.certificates.find((c) => c.id === q) ?? null;
  if (q.length === 8) return state.certificates.find((c) => c.code === q) ?? null;
  return null;
}

/** Slowdown: after 5 Not found lookups within 60s, block for 30s. */
export function isBlocked(rate: AppState["rate"], nowMs: number): boolean {
  return rate.blockedUntil > nowMs;
}
export function registerNotFound(rate: AppState["rate"], nowMs: number): AppState["rate"] {
  const times = [...rate.notFoundTimes, nowMs].filter((t) => nowMs - t < NOT_FOUND_WINDOW_MS);
  if (times.length >= NOT_FOUND_LIMIT) return { notFoundTimes: [], blockedUntil: nowMs + BLOCK_MS };
  return { notFoundTimes: times, blockedUntil: rate.blockedUntil };
}

// ---------- Access ----------
export function requestExpiry(r: AccessRequest): string | null {
  if (r.status === "pending") return addDays(r.createdAt, ACCESS_DAYS);
  if (r.status === "approved" && r.decidedAt) return addDays(r.decidedAt, ACCESS_DAYS);
  return null;
}
/** Status as of `today`, so expiry applies even before the sweep runs. */
export function effectiveStatus(r: AccessRequest, today: string): RequestStatus {
  const exp = requestExpiry(r);
  if (exp && today >= exp) return "expired";
  return r.status;
}
export function requestsFrom(state: AppState, email: string, learnerId: string): AccessRequest[] {
  const e = email.trim().toLowerCase();
  return state.accessRequests.filter((r) => r.learnerId === learnerId && r.email.toLowerCase() === e);
}
export function canRequest(state: AppState, email: string, learnerId: string): boolean {
  return requestsFrom(state, email, learnerId).length < MAX_REQUESTS_PER_EMAIL;
}
export function activeGrant(state: AppState, email: string | null, learnerId: string): AccessRequest | null {
  if (!email) return null;
  return (
    requestsFrom(state, email, learnerId).find(
      (r) => r.status === "approved" && effectiveStatus(r, state.today) === "approved",
    ) ?? null
  );
}
export function canSeeEvidence(state: AppState, learner: Learner, email: string | null): boolean {
  return learner.sharing === "public" || !!activeGrant(state, email, learner.id);
}

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
