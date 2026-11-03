export type ItemType = "quiz" | "exam" | "project";
export type CertState = "Completed" | "Verified" | "Legacy" | "Revoked";
export type RevokeReason = "error" | "fraud" | "legal";
export type Sharing = "public" | "private";
export type RequestStatus = "pending" | "approved" | "declined" | "expired";
export type DisputeStatus = "open" | "upheld" | "rejected";

export interface CourseItem {
  key: string;
  label: string;
  type: ItemType;
  proctored?: boolean;
  skill: string;
}

export interface CourseVersion {
  version: number;
  required: string[];
  changeNote?: string;
  publishedAt: string;
}

export interface Course {
  id: string;
  name: string;
  items: CourseItem[];
  versions: CourseVersion[];
  /** Admin's unpublished required toggles. Undefined = same as current version. */
  draftRequired?: string[];
}

export interface Learner {
  id: string;
  name: string;
  company: string | null;
  sharing: Sharing;
  /** Highest policy version the learner dismissed the banner for. */
  policyAck?: number;
  /** Highest policy version a "banner seen" event was logged for. */
  policyBannerLogged?: number;
}

export interface ItemResult {
  score: number | null;
  attempts: number;
  feedback?: string;
}

export interface HistoryEntry {
  date: string;
  action: string;
  note: string;
}

export interface Certificate {
  id: string;
  code: string;
  learnerId: string;
  courseId: string;
  courseVersion: number;
  issuedAt: string;
  state: CertState;
  results: Record<string, ItemResult>;
  caseNote: string;
  policyVersion: number;
  learnerName: string;
  history: HistoryEntry[];
  revoked?: { reason: RevokeReason; date: string; previousState: CertState };
}

export interface AccessRequest {
  id: string;
  certId: string;
  learnerId: string;
  email: string;
  requester: string;
  createdAt: string;
  status: RequestStatus;
  decidedAt?: string;
  expiredAt?: string;
}

export interface Dispute {
  id: string;
  certId: string;
  reason: string;
  email: string;
  createdAt: string;
  status: DisputeStatus;
  outcome?: string;
  closedAt?: string;
}

export interface Policy {
  version: number;
  name: string;
  effectiveFrom: string;
  until?: string;
  summary: string;
}

export interface AppEvent {
  id: string;
  ts: string;
  type: EventType;
  certId: string | null;
  payload: Record<string, unknown>;
}

export const EVENT_TYPES = [
  "lookup_found",
  "lookup_not_found",
  "lookup_blocked",
  "evidence_opened",
  "ai_summary_opened",
  "access_requested",
  "access_refused",
  "access_approved",
  "access_declined",
  "access_expired",
  "setting_changed",
  "assessment_passed",
  "assessment_failed",
  "course_retaken",
  "certificate_upgraded",
  "certificate_corrected",
  "certificate_revoked",
  "dispute_opened",
  "dispute_closed",
  "policy_published",
  "policy_banner_seen",
  "course_version_published",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface AppState {
  today: string;
  notFoundSamples: string[];
  courses: Course[];
  learners: Learner[];
  certificates: Certificate[];
  accessRequests: AccessRequest[];
  disputes: Dispute[];
  policies: Policy[];
  events: AppEvent[];
  rate: { notFoundTimes: number[]; blockedUntil: number };
  seq: number;
}
