import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { act, useAppState, useStoreHydrated } from "@/lib/store";
import { performLookup } from "@/lib/actions";
import { findCertificate, normalizeQuery } from "@/lib/domain";
import type { AppState, CertState } from "@/lib/types";
import { SegmentedInput } from "@/components/verify/SegmentedInput";
import {
  BlockedResult,
  FoundResult,
  NotFoundResult,
  RevokedResult,
} from "@/components/verify/ResultPanels";

type Search = { q?: string; verify?: string };

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ...(typeof s["q"] === "string" || typeof s["q"] === "number" ? { q: String(s["q"]) } : {}),
    ...(typeof s["verify"] === "string" || typeof s["verify"] === "number" ? { verify: String(s["verify"]) } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Verify a Career-180 Certificate" },
      {
        name: "description",
        content: "Enter a 6-digit certificate ID or 8-character code to check a Career-180 certificate and its evidence.",
      },
      { property: "og:title", content: "Verify a Career-180 Certificate" },
      {
        property: "og:description",
        content: "Check whether a Career-180 certificate is authentic and how far its evidence can be trusted.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyPage,
});

const MODES = {
  id: { label: "Certificate ID", hint: "6 digits", length: 6, allowed: /[0-9]/ },
  code: { label: "Verification code", hint: "8 characters", length: 8, allowed: /[ABCDEFGHJKMNPQRSTUVWXYZ23456789]/ },
} as const;
type Mode = keyof typeof MODES;

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function VerifyPage() {
  const s = useAppState();
  const hydrated = useStoreHydrated();
  const { q, verify } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const [mode, setMode] = useState<Mode>(() => (q && q.length === 8 ? "code" : "id"));
  const [value, setValue] = useState(q ?? "");
  const [blockedUntil, setBlockedUntil] = useState(0);
  const now = useNow(blockedUntil > 0);
  const resultRef = useRef<HTMLDivElement>(null);
  const blocked = blockedUntil > now;

  const run = (raw: string, m: Mode = mode) => {
    const query = normalizeQuery(raw);
    if (query.length !== MODES[m].length) return;
    const out = act((d) => performLookup(d, query, Date.now()));
    if (out.kind === "blocked") {
      setBlockedUntil(out.until);
      void navigate({ search: {}, replace: true });
      return;
    }
    setBlockedUntil(0);
    void navigate({ search: { q: query } });
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  // QR deep link: /?verify=123456 performs a logged lookup once the store is loaded.
  const handledVerify = useRef(false);
  useEffect(() => {
    if (!hydrated || !verify || handledVerify.current) return;
    handledVerify.current = true;
    const m: Mode = verify.length === 8 ? "code" : "id";
    setMode(m);
    setValue(normalizeQuery(verify));
    run(verify, m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, verify]);

  const cert = q ? findCertificate(s, q) : null;
  const cfg = MODES[mode];

  const pickSample = (query: string) => {
    const m: Mode = query.length === 8 ? "code" : "id";
    setMode(m);
    setValue(query);
    run(query, m);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:pt-16">
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
          <ShieldCheck className="h-4 w-4" /> Secure Verification System
        </span>
      </div>
      <h1 className="mt-6 text-center text-5xl font-bold leading-[1.05] sm:text-7xl">
        <span className="block text-foreground">Certificate</span>
        <span className="block text-gradient-brand">Verification</span>
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-center text-muted-foreground">
        Confirm a Career-180 certificate is authentic, then see the evidence behind it.
      </p>

      <section className="panel mt-10 p-5 sm:p-8">
        <div className="mx-auto mb-6 grid max-w-sm grid-cols-2 rounded-lg bg-muted p-1 text-sm" role="tablist">
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setValue("");
              }}
              className={cn(
                "rounded-md px-3 py-2 font-medium transition-colors",
                mode === m ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {MODES[m].label}
            </button>
          ))}
        </div>
        <label className="mb-3 block text-center text-sm font-medium text-muted-foreground">
          {cfg.label} <span className="text-xs">({cfg.hint})</span>
        </label>
        <SegmentedInput
          key={mode}
          length={cfg.length}
          value={value}
          onChange={setValue}
          onComplete={(v) => run(v)}
          allowed={cfg.allowed}
          disabled={blocked}
          label={cfg.label}
        />
        <Button
          variant="brand"
          size="lg"
          className="mt-6 w-full"
          disabled={blocked || value.length !== cfg.length}
          onClick={() => run(value)}
        >
          <ShieldCheck /> Verify certificate
        </Button>
      </section>

      <div ref={resultRef} className="mt-8 scroll-mt-20">
        {blocked ? (
          <BlockedResult secondsLeft={Math.ceil((blockedUntil - now) / 1000)} />
        ) : q ? (
          cert ? (
            cert.state === "Revoked" ? (
              <RevokedResult cert={cert} s={s} />
            ) : (
              <FoundResult key={cert.id} cert={cert} s={s} />
            )
          ) : (
            <NotFoundResult />
          )
        ) : null}
      </div>

      <SampleChips s={s} onPick={pickSample} disabled={blocked} />
    </div>
  );
}

const GROUP_ORDER: { state: CertState | "NotFound"; title: string }[] = [
  { state: "Verified", title: "Verified" },
  { state: "Completed", title: "Completed" },
  { state: "Legacy", title: "Legacy" },
  { state: "Revoked", title: "Revoked" },
  { state: "NotFound", title: "Not found" },
];

function SampleChips({ s, onPick, disabled }: { s: AppState; onPick: (q: string) => void; disabled: boolean }) {
  const groups = useMemo(
    () =>
      GROUP_ORDER.map((g) => {
        if (g.state === "NotFound")
          return { ...g, chips: s.notFoundSamples.map((q) => ({ q, note: "No match", private: false })) };
        const chips = s.certificates
          .filter((c) => c.state === g.state)
          .map((c) => ({
            q: c.id,
            note: c.caseNote,
            private: s.learners.find((l) => l.id === c.learnerId)?.sharing === "private",
          }));
        if (g.state === "Legacy") {
          const reem = s.certificates.find((c) => c.id === "940285" && c.state === "Legacy");
          if (reem) chips.push({ q: reem.code, note: "Same certificate, by code", private: true });
        }
        return { ...g, chips };
      }).filter((g) => g.chips.length > 0),
    [s],
  );

  return (
    <section className="mt-12" aria-label="Try a sample">
      <h2 className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Try a sample
      </h2>
      <div className="mt-5 space-y-4">
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <p className="w-24 shrink-0 pt-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {g.title}
            </p>
            <div className="flex flex-wrap gap-2">
              {g.chips.map((c) => (
                <button
                  key={c.q}
                  disabled={disabled}
                  onClick={() => onPick(c.q)}
                  title={c.note}
                  className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs transition-colors hover:border-primary/60 hover:bg-accent disabled:opacity-50"
                >
                  <span className="font-mono font-semibold text-foreground">{c.q}</span>
                  <span className="text-muted-foreground group-hover:text-foreground">{c.note}</span>
                  {c.private && <Lock className="h-3 w-3 text-warning" aria-label="Private results" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
