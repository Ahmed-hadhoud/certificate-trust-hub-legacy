import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Eye, FileText, Lock, MessageSquareQuote, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { act, getVerifierEmail, setVerifierEmail, useAppState, useStoreHydrated } from "@/lib/store";
import { logEvent, requestAccess } from "@/lib/actions";
import {
  activeGrant,
  addDays,
  ACCESS_DAYS,
  band,
  canSeeEvidence,
  effectiveStatus,
  finalGrade,
  formatDate,
  isEmail,
  itemTypeLabel,
  requestExpiry,
  requestsFrom,
  requiredItems,
  versionOf,
} from "@/lib/domain";
import type { AppState, Certificate } from "@/lib/types";
import { LevelBadge } from "@/components/verify/LevelBadge";
import { NewerVersionNotice, SourceBadge } from "@/components/verify/ResultPanels";
import { VerifiedInfo } from "@/components/verify/InfoPopover";
import { AiSummaryDialog } from "@/components/evidence/AiSummaryDialog";
import { BandBadge, StatusBadge } from "@/components/site/StatusBadges";

export const Route = createFileRoute("/evidence/$certId")({
  head: ({ params }) => ({
    meta: [
      { title: `Results for certificate ${params.certId} · Career-180` },
      { name: "description", content: "Assessment evidence behind a Career-180 Verified certificate." },
      { property: "og:title", content: `Results for certificate ${params.certId} · Career-180` },
      { property: "og:description", content: "Assessment evidence behind a Career-180 Verified certificate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EvidencePage,
});

function Shell({ children, certId }: { children: React.ReactNode; certId: string }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <Link
        to="/"
        search={{ q: certId }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to verification
      </Link>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function EvidencePage() {
  const { certId } = Route.useParams();
  const s = useAppState();
  const hydrated = useStoreHydrated();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => setEmail(getVerifierEmail()), []);

  const cert = s.certificates.find((c) => c.id === certId);
  const learner = cert ? s.learners.find((l) => l.id === cert.learnerId) : undefined;
  const access = !!cert && !!learner && cert.state === "Verified" && canSeeEvidence(s, learner, email);

  const logged = useRef(false);
  useEffect(() => {
    if (!hydrated || !access || logged.current || !cert) return;
    logged.current = true;
    act((d) => logEvent(d, "evidence_opened", cert.id, { viaGrant: learner?.sharing === "private" }));
  }, [hydrated, access, cert, learner]);

  if (!cert || !learner)
    return (
      <Shell certId={certId}>
        <div className="panel p-6 text-muted-foreground">There is no certificate with this ID.</div>
      </Shell>
    );

  if (cert.state !== "Verified") {
    const course = s.courses.find((c) => c.id === cert.courseId)!;
    const noAssessment = versionOf(course, cert.courseVersion).required.length === 0;
    return (
      <Shell certId={certId}>
        <div className="panel p-6">
          <LevelBadge state={cert.state} />
          <p className="mt-3 text-muted-foreground">
            {cert.state === "Revoked"
              ? "This certificate has been revoked. Results are not available."
              : cert.state === "Legacy"
                ? "Legacy certificates were issued under the previous standard and have no stored results."
                : noAssessment
                  ? "This course has no assessment."
                  : "Completed certificates have no evidence page. Results are shown only for Verified certificates."}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell certId={certId}>
      {access ? (
        <EvidenceView cert={cert} s={s} email={email} />
      ) : (
        <PrivateCard cert={cert} s={s} email={email} onUseEmail={(e) => setEmail(e)} />
      )}
    </Shell>
  );
}

function EvidenceView({ cert, s, email }: { cert: Certificate; s: AppState; email: string | null }) {
  const course = s.courses.find((c) => c.id === cert.courseId)!;
  const learner = s.learners.find((l) => l.id === cert.learnerId)!;
  const items = requiredItems(cert, course);
  const fg = finalGrade(items, cert.results);
  const project = items.find((i) => i.type === "project");
  const grant = learner.sharing === "private" ? activeGrant(s, email, learner.id) : null;
  const until = grant ? requestExpiry(grant) : null;

  return (
    <div className="space-y-5 animate-rise">
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {grant && until ? (
              <Badge variant="warning" className="gap-1">
                <Lock className="h-3.5 w-3.5" /> Shared with you until {formatDate(until)}
              </Badge>
            ) : (
              <Badge variant="success" className="gap-1">
                <Eye className="h-3.5 w-3.5" /> Public results
              </Badge>
            )}
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{cert.learnerName}</h1>
            <p className="mt-1 text-muted-foreground">
              {course.name} · v{cert.courseVersion} · Certificate <span className="font-mono">{cert.id}</span>
            </p>
          </div>
          <LevelBadge state={cert.state} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SourceBadge company={learner.company} />
        </div>
        <div className="mt-4">
          <NewerVersionNotice cert={cert} s={s} />
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <FileText className="h-4 w-4 text-primary" /> Required items
          </h2>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            Why these matter <VerifiedInfo />
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Band</TableHead>
                <TableHead className="text-right">Attempts used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => {
                const r = cert.results[i.key];
                return (
                  <TableRow key={i.key}>
                    <TableCell>
                      <p className="font-medium">{i.label}</p>
                      <p className="text-xs text-muted-foreground">{i.skill}</p>
                    </TableCell>
                    <TableCell>{itemTypeLabel(i)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{r?.score ?? "—"}</TableCell>
                    <TableCell>
                      <BandBadge score={r?.score ?? null} />
                    </TableCell>
                    <TableCell className="text-right font-mono">{r?.attempts ?? 0} / 5</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/40 p-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Final course grade</p>
            <p className="mt-1 flex items-center gap-2">
              <span className="font-display text-3xl font-bold">{fg}%</span>
              <BandBadge score={fg} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {project ? "Project counts 50%; the other items share 50% equally." : "All items count equally."}{" "}
              The band is informational.
            </p>
          </div>
          <AiSummaryDialog
            certId={cert.id}
            evidence={{ learnerName: cert.learnerName, courseName: course.name, items, results: cert.results }}
          />
        </div>
      </section>

      {project && cert.results[project.key]?.feedback && (
        <section className="panel p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <MessageSquareQuote className="h-4 w-4 text-primary" /> Instructor feedback on the project
          </h2>
          <blockquote className="mt-3 border-l-2 border-primary pl-4 text-muted-foreground">
            “{cert.results[project.key]?.feedback}”
          </blockquote>
        </section>
      )}
    </div>
  );
}

function PrivateCard({
  cert,
  s,
  email,
  onUseEmail,
}: {
  cert: Certificate;
  s: AppState;
  email: string | null;
  onUseEmail: (e: string) => void;
}) {
  const [formEmail, setFormEmail] = useState(email ?? "");
  const [requester, setRequester] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (email) setFormEmail(email);
  }, [email]);

  const statusEmail = isEmail(formEmail) ? formEmail.trim().toLowerCase() : email;
  const mine = statusEmail ? requestsFrom(s, statusEmail, cert.learnerId) : [];
  const grant = statusEmail ? activeGrant(s, statusEmail, cert.learnerId) : null;

  const submit = () => {
    setError("");
    if (!isEmail(formEmail)) return setError("Please enter a valid email.");
    if (requester.trim().length < 2) return setError("Please enter your name or company.");
    const res = act((d) => requestAccess(d, cert.id, formEmail, requester));
    setVerifierEmail(formEmail);
    onUseEmail(formEmail.trim().toLowerCase());
    if (!res.ok) return setError(res.error);
    toast.success("Request sent. The learner will approve or decline it.");
  };

  return (
    <div className="space-y-5 animate-rise">
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-warning/15 text-warning">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold">Results are private</h1>
              <p className="text-sm text-muted-foreground">
                The certificate is valid. The learner chose to keep scores and feedback private.
              </p>
            </div>
          </div>
          <LevelBadge state={cert.state} />
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" /> Request access
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          If the learner approves, you can open the results for {ACCESS_DAYS} days. Up to 3 requests per email.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="req-email">Your email</Label>
            <Input id="req-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="req-name">Name or company</Label>
            <Input id="req-name" value={requester} onChange={(e) => setRequester(e.target.value)} />
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button variant="brand" className="mt-4" onClick={submit}>
          Request access
        </Button>
      </section>

      {mine.length > 0 && (
        <section className="panel p-5 sm:p-6">
          <h2 className="font-semibold">Your requests</h2>
          <p className="text-sm text-muted-foreground">For {statusEmail}</p>
          <ul className="mt-3 divide-y divide-border">
            {mine.map((r) => {
              const st = effectiveStatus(r, s.today);
              const exp = requestExpiry(r);
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    Sent {formatDate(r.createdAt)} as <span className="font-medium">{r.requester}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {st === "approved" && exp && (
                      <span className="text-muted-foreground">until {formatDate(exp)}</span>
                    )}
                    {st === "pending" && exp && (
                      <span className="text-muted-foreground">expires {formatDate(exp)}</span>
                    )}
                    <StatusBadge status={st} />
                  </span>
                </li>
              );
            })}
          </ul>
          {grant && statusEmail && statusEmail !== email && (
            <Button
              className="mt-3"
              variant="brand"
              onClick={() => {
                setVerifierEmail(statusEmail);
                onUseEmail(statusEmail);
              }}
            >
              <Eye /> Open results
            </Button>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Approved access lasts {ACCESS_DAYS} days from approval (e.g. approved today: until{" "}
            {formatDate(addDays(s.today, ACCESS_DAYS))}).
          </p>
        </section>
      )}
    </div>
  );
}
