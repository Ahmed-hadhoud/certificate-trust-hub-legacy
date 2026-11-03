import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowUpCircle, Bell, Check, Inbox, Lock, RotateCcw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { act, useAppState, useStoreHydrated } from "@/lib/store";
import {
  decideRequest,
  dismissPolicyBanner,
  markPolicyBannerSeen,
  retakeCourse,
  setSharing,
  simulateFailedAttempt,
  simulatePassRemaining,
  upgradeLegacy,
} from "@/lib/actions";
import {
  attemptsLeft,
  currentVersion,
  effectiveStatus,
  finalGrade,
  formatDate,
  isLocked,
  isPassed,
  itemsFor,
  itemTypeLabel,
  latestPolicy,
  missingItems,
  requestExpiry,
  requiredItems,
} from "@/lib/domain";
import type { AppState, Certificate, Learner } from "@/lib/types";
import { LevelBadge } from "@/components/verify/LevelBadge";
import { NewerVersionNotice, SourceBadge } from "@/components/verify/ResultPanels";
import { BandBadge, StatusBadge } from "@/components/site/StatusBadges";

type Search = { learner?: string };

export const Route = createFileRoute("/learner")({
  validateSearch: (s: Record<string, unknown>): Search =>
    typeof s["learner"] === "string" ? { learner: s["learner"] } : {},
  head: () => ({
    meta: [
      { title: "Learner area · Career-180" },
      { name: "description", content: "Your certificate level, missing items, sharing setting and access requests." },
      { property: "og:title", content: "Learner area · Career-180" },
      { property: "og:description", content: "Track your Career-180 certificate and who can see your results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LearnerPage,
});

function LearnerPage() {
  const s = useAppState();
  const { learner: learnerId = "L04" } = Route.useSearch();
  const navigate = useNavigate({ from: "/learner" });
  const learner = s.learners.find((l) => l.id === learnerId) ?? s.learners[0]!;
  const cert = s.certificates.find((c) => c.learnerId === learner.id)!;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Learner area · demo</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{learner.name}</h1>
          <div className="mt-2">
            <SourceBadge company={learner.company} />
          </div>
        </div>
        <div className="grid w-full gap-1.5 sm:w-72">
          <Label>Demo login</Label>
          <Select value={learner.id} onValueChange={(v) => void navigate({ search: { learner: v } })}>
            <SelectTrigger aria-label="Choose learner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {s.learners.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name} · {s.certificates.find((c) => c.learnerId === l.id)?.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <PolicyBanner s={s} learner={learner} />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <CertificateCard s={s} cert={cert} />
          <ItemsCard s={s} cert={cert} />
        </div>
        <div className="space-y-5">
          <SharingCard learner={learner} />
          <RequestsInbox s={s} learner={learner} />
        </div>
      </div>
    </div>
  );
}

function PolicyBanner({ s, learner }: { s: AppState; learner: Learner }) {
  const hydrated = useStoreHydrated();
  const latest = latestPolicy(s.policies);
  const show = latest.version > (learner.policyAck ?? 0);
  useEffect(() => {
    if (hydrated && show) act((d) => markPolicyBannerSeen(d, learner.id));
  }, [hydrated, show, learner.id]);
  if (!show) return null;
  return (
    <div className="panel-info mt-6 flex gap-3 p-4">
      <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">
          Our certificate policy changed: v{latest.version} · {latest.name} (from {formatDate(latest.effectiveFrom)})
        </p>
        <p className="mt-1 text-muted-foreground">{latest.summary}</p>
        <p className="mt-2 text-muted-foreground">
          This is for your information only; nothing changes on your certificate. You can review who sees your
          results in the{" "}
          <a href="#sharing" className="text-primary underline-offset-4 hover:underline">
            sharing setting
          </a>
          .
        </p>
      </div>
      <button
        onClick={() => act((d) => dismissPolicyBanner(d, learner.id))}
        aria-label="Dismiss policy notice"
        className="h-fit rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function CertificateCard({ s, cert }: { s: AppState; cert: Certificate }) {
  const course = s.courses.find((c) => c.id === cert.courseId)!;
  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Your certificate</p>
          <h2 className="mt-1 text-xl font-semibold">{course.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ID <span className="font-mono text-foreground">{cert.id}</span> · Code{" "}
            <span className="font-mono text-foreground">{cert.code}</span> · v{cert.courseVersion} · Issued{" "}
            {formatDate(cert.issuedAt)}
          </p>
        </div>
        <LevelBadge state={cert.state} />
      </div>
      <div className="mt-4 space-y-3">
        <NewerVersionNotice cert={cert} s={s} />
        {cert.state === "Revoked" && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            This certificate was revoked on {formatDate(cert.revoked?.date ?? "")}. Revocation is final.
          </p>
        )}
      </div>
      <div className="mt-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/" search={{ q: cert.id }}>
            See what a verifier sees
          </Link>
        </Button>
      </div>
      {cert.state === "Legacy" && <LegacyUpgrade s={s} cert={cert} />}
    </section>
  );
}

function LegacyUpgrade({ s, cert }: { s: AppState; cert: Certificate }) {
  const course = s.courses.find((c) => c.id === cert.courseId)!;
  const cur = currentVersion(course);
  const items = itemsFor(course, cur.required);
  return (
    <div className="mt-5 rounded-xl border border-warning/40 bg-warning/5 p-4">
      <p className="flex items-center gap-2 font-semibold">
        <ArrowUpCircle className="h-4 w-4 text-warning" /> Upgrade for free
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          This course has no assessment, so there is nothing to pass. Your certificate stays Legacy.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Pass every required item of the current version (v{cur.version}) with 70% or more. Your certificate keeps
            ID {cert.id}; the issue date becomes the upgrade date.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {items.map((i) => (
              <li key={i.key}>
                • {i.label} · {i.skill} <span className="text-muted-foreground">({itemTypeLabel(i)})</span>
              </li>
            ))}
          </ul>
          <Button
            variant="brand"
            size="sm"
            className="mt-4"
            onClick={() => {
              act((d) => upgradeLegacy(d, cert.id));
              toast.success(`Upgraded to Verified. Same ID ${cert.id}.`);
            }}
          >
            <Sparkles /> Simulate passing all
          </Button>
        </>
      )}
    </div>
  );
}

function ItemsCard({ s, cert }: { s: AppState; cert: Certificate }) {
  const course = s.courses.find((c) => c.id === cert.courseId)!;
  const items = requiredItems(cert, course);
  if (cert.state === "Legacy" || cert.state === "Revoked") return null;
  if (items.length === 0)
    return (
      <section className="panel p-5 text-sm text-muted-foreground">
        This course has no assessment. Your certificate is Completed.
      </section>
    );
  const missing = missingItems(cert, course);
  const anyLocked = items.some((i) => isLocked(cert.results[i.key]));
  const fg = finalGrade(items, cert.results);

  return (
    <>
      {cert.state === "Completed" && missing.length > 0 && (
        <section className="panel-warning p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4 text-warning" /> Missing for Verified
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {missing.map((i) => {
              const r = cert.results[i.key];
              return (
                <li key={i.key}>
                  • {i.label} ({itemTypeLabel(i)}):{" "}
                  {r?.score === null || r === undefined ? "not taken" : `best ${r.score}%, needs 70%`}
                  {isLocked(r) && <span className="text-destructive"> — locked</span>}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Completed</span> means you finished the course.{" "}
            <span className="font-medium text-foreground">Verified</span> means you passed every required item with
            70% or more. Pass the missing items and your certificate becomes Verified on the same ID.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="brand"
              size="sm"
              onClick={() => {
                const res = act((d) => simulatePassRemaining(d, cert.id));
                if (res.skippedLocked.length)
                  toast.warning(`${res.skippedLocked.join(", ")} is locked. Retake the course first.`);
                else toast.success("Remaining items passed.");
              }}
            >
              <Sparkles /> Simulate passing remaining items
            </Button>
            {anyLocked && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  act((d) => retakeCourse(d, cert.id));
                  toast.success("Course retaken. Attempts reset.");
                }}
              >
                <RotateCcw /> Retake course
              </Button>
            )}
          </div>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="font-semibold">Required items</h3>
          <span className="text-sm text-muted-foreground">
            Final grade <span className="font-mono font-semibold text-foreground">{fg}%</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Band</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Left</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => {
                const r = cert.results[i.key];
                const locked = isLocked(r);
                return (
                  <TableRow key={i.key}>
                    <TableCell>
                      <p className="font-medium">{i.label}</p>
                      <p className="text-xs text-muted-foreground">{itemTypeLabel(i)}</p>
                    </TableCell>
                    <TableCell className="text-right font-mono">{r?.score ?? "—"}</TableCell>
                    <TableCell>
                      <BandBadge score={r?.score ?? null} />
                    </TableCell>
                    <TableCell className="text-right font-mono">{r?.attempts ?? 0}</TableCell>
                    <TableCell className="text-right font-mono">
                      {locked ? (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <Lock className="h-3 w-3" /> 0
                        </span>
                      ) : (
                        attemptsLeft(r)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isPassed(r) && !locked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            act((d) => simulateFailedAttempt(d, cert.id, i.key));
                            toast("Failed attempt recorded. Your certificate level does not change.");
                          }}
                        >
                          Simulate fail
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="border-t border-border p-4 text-xs text-muted-foreground">
          Best attempt counts. 5 attempts per item; after 5 failed attempts the item locks until you retake the course.
        </p>
      </section>
    </>
  );
}

function SharingCard({ learner }: { learner: Learner }) {
  const isPublic = learner.sharing === "public";
  return (
    <section id="sharing" className="panel scroll-mt-20 p-5">
      <h3 className="font-semibold">Sharing setting</h3>
      <p className="mt-1 text-sm text-muted-foreground">One setting for all your certificates.</p>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-muted/60 p-3">
        <div>
          <p className="font-medium">{isPublic ? "Results public" : "Results private"}</p>
          <p className="text-xs text-muted-foreground">
            {isPublic
              ? "Any verifier can open your scores and feedback."
              : "Verifiers see validity and level only, and can request access."}
          </p>
        </div>
        <Switch
          checked={isPublic}
          aria-label="Results public"
          onCheckedChange={(v) => act((d) => setSharing(d, learner.id, v ? "public" : "private"))}
        />
      </div>
    </section>
  );
}

function RequestsInbox({ s, learner }: { s: AppState; learner: Learner }) {
  const reqs = s.accessRequests
    .filter((r) => r.learnerId === learner.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <section className="panel p-5">
      <h3 className="flex items-center gap-2 font-semibold">
        <Inbox className="h-4 w-4 text-primary" /> Access requests
      </h3>
      {reqs.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No one has asked to see your results.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {reqs.map((r) => {
            const st = effectiveStatus(r, s.today);
            const exp = requestExpiry(r);
            return (
              <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.requester}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                  </div>
                  <StatusBadge status={st} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Asked {formatDate(r.createdAt)}
                  {exp && st !== "expired" && ` · ${st === "approved" ? "access until" : "expires"} ${formatDate(exp)}`}
                </p>
                {st === "pending" && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="success" onClick={() => act((d) => decideRequest(d, r.id, true))}>
                      <Check /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => act((d) => decideRequest(d, r.id, false))}>
                      <X /> Decline
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
