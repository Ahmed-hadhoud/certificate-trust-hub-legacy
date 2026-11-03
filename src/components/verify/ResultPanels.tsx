import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  History,
  Linkedin,
  Lock,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  newerVersion,
  NOT_FOUND_TEXT,
  policyInForce,
  versionOf,
} from "@/lib/domain";
import type { AppState, Certificate } from "@/lib/types";
import { CertificatePreview } from "./CertificatePreview";
import { DisputeDialog } from "./DisputeDialog";
import { LegacyInfo } from "./InfoPopover";
import { LevelBadge } from "./LevelBadge";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 truncate font-medium">{children}</div>
    </div>
  );
}

export function SourceBadge({ company }: { company: string | null }) {
  return company ? (
    <Badge variant="info" className="gap-1">
      <Building2 className="h-3.5 w-3.5" /> Corporate-enrolled · {company}
    </Badge>
  ) : (
    <Badge variant="muted" className="gap-1">
      <User className="h-3.5 w-3.5" /> Self-directed
    </Badge>
  );
}

export function NewerVersionNotice({ cert, s }: { cert: Certificate; s: AppState }) {
  const course = s.courses.find((c) => c.id === cert.courseId)!;
  const newer = newerVersion(cert, course);
  if (!newer) return null;
  return (
    <div className="panel-info flex gap-3 p-3 text-sm">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p>
        A newer version of this course exists (v{newer.version}): {newer.changeNote ?? "Course updated."}
      </p>
    </div>
  );
}

export function FoundResult({ cert, s }: { cert: Certificate; s: AppState }) {
  const course = s.courses.find((c) => c.id === cert.courseId)!;
  return (
    <div className="space-y-5 animate-rise">
      <section className="panel-success p-5 sm:p-6" aria-live="polite">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-success/20 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h2 className="text-lg font-semibold text-success sm:text-xl">Certificate Verified Successfully</h2>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name">{cert.learnerName}</Field>
          <Field label="Course">{course.name}</Field>
          <Field label="Certificate Number">
            <span className="font-mono">{cert.id}</span>
          </Field>
          <Field label="Status">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_10px] shadow-success" /> Valid
            </span>
          </Field>
        </div>
      </section>

      <CertificatePreview
        learnerName={cert.learnerName}
        courseName={course.name}
        certId={cert.id}
        code={cert.code}
        verified={cert.state === "Verified"}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="brand" size="lg" onClick={() => toast("Download is a mock in this prototype.")}>
          <Download /> Download Certificate
        </Button>
        <Button size="lg" onClick={() => toast("Add to LinkedIn is a mock in this prototype.")}>
          <Linkedin /> Add to LinkedIn Profile
        </Button>
      </div>

      <TrustCard cert={cert} s={s} />
      <div className="flex justify-center">
        <DisputeDialog certId={cert.id} />
      </div>
    </div>
  );
}

export function TrustCard({ cert, s }: { cert: Certificate; s: AppState }) {
  const course = s.courses.find((c) => c.id === cert.courseId)!;
  const learner = s.learners.find((l) => l.id === cert.learnerId)!;
  const required = versionOf(course, cert.courseVersion).required;
  const policy = s.policies.find((p) => p.version === cert.policyVersion) ?? policyInForce(s.policies, cert.issuedAt);
  const isPrivate = learner.sharing === "private";

  return (
    <section className="panel p-5 sm:p-6" aria-label="Trust layer">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Trust layer</p>
          <h3 className="mt-1 text-lg font-semibold">How far this certificate can be trusted</h3>
        </div>
        <LevelBadge state={cert.state} />
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Learner source</dt>
          <dd className="mt-1.5">
            <SourceBadge company={learner.company} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Course and version</dt>
          <dd className="mt-1.5 font-medium">
            {course.name} · v{cert.courseVersion}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Certificate ID · short code</dt>
          <dd className="mt-1.5 font-mono font-medium">
            {cert.id} · {cert.code}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Issued</dt>
          <dd className="mt-1.5 font-medium">{formatDate(cert.issuedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Policy in force at issue</dt>
          <dd className="mt-1.5 font-medium">
            v{policy.version} · {policy.name}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Results</dt>
          <dd className="mt-1.5 inline-flex items-center gap-1.5 font-medium">
            {isPrivate ? (
              <>
                <Lock className="h-3.5 w-3.5 text-warning" /> Private
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-success" /> Public
              </>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-5 space-y-3">
        {cert.state === "Legacy" && (
          <div className="panel-warning flex gap-3 p-3 text-sm">
            <History className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="flex-1">
              <p className="flex items-center gap-1.5 font-medium">
                Issued under the previous standard <LegacyInfo />
              </p>
              <p className="mt-1 text-muted-foreground">
                No assessment results are stored for this certificate. The learner can upgrade it for free by
                passing the current required items.
              </p>
            </div>
          </div>
        )}
        <NewerVersionNotice cert={cert} s={s} />
        {cert.state === "Completed" && (
          <div className="rounded-xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            {required.length === 0 ? (
              <p className="font-medium text-foreground">This course has no assessment.</p>
            ) : (
              <p>
                <span className="font-medium text-foreground">Completed, not Verified.</span> The learner finished
                the course but has not passed every required item at 70% or more. Completed certificates have no
                evidence page.
              </p>
            )}
          </div>
        )}
      </div>

      {cert.state === "Verified" && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild variant="brand">
            <Link to="/evidence/$certId" params={{ certId: cert.id }}>
              <Eye /> View results
            </Link>
          </Button>
          {isPrivate && (
            <span className="text-sm text-muted-foreground">
              The learner keeps results private. You can request access.
            </span>
          )}
        </div>
      )}
    </section>
  );
}

export function RevokedResult({ cert, s }: { cert: Certificate; s: AppState }) {
  const course = s.courses.find((c) => c.id === cert.courseId)!;
  return (
    <div className="space-y-4 animate-rise">
      <section className="panel-danger p-5 sm:p-6" aria-live="polite">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-destructive/20 text-destructive">
            <XCircle className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-destructive sm:text-xl">Certificate Revoked</h2>
            <p className="text-sm text-muted-foreground">
              Revoked on {formatDate(cert.revoked?.date ?? cert.issuedAt)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm">
          Certificate <span className="font-mono font-semibold">{cert.id}</span> for {course.name} has been revoked
          by Career-180 and is not valid. Results are not available.
        </p>
      </section>
      <div className="flex justify-center">
        <DisputeDialog certId={cert.id} />
      </div>
    </div>
  );
}

export function NotFoundResult() {
  return (
    <section className="panel-warning flex gap-3 p-5 animate-rise" aria-live="polite">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <div>
        <h2 className="font-semibold text-warning">Certificate not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">{NOT_FOUND_TEXT}</p>
      </div>
    </section>
  );
}

export function BlockedResult({ secondsLeft }: { secondsLeft: number }) {
  return (
    <section className="panel-info flex gap-3 p-5 animate-rise" aria-live="polite">
      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <h2 className="font-semibold">Let's take a short pause</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          There were several lookups that didn't match a certificate. To keep certificates safe, please wait{" "}
          <span className="font-mono font-semibold text-foreground">{secondsLeft}s</span> before trying again.
        </p>
      </div>
    </section>
  );
}
