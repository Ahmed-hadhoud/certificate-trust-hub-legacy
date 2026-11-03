import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  learnerName: string;
  courseName: string;
  certId: string;
  code: string;
  verified: boolean;
}

/** Light certificate card rendered in HTML (not an image). */
export function CertificatePreview({ learnerName, courseName, certId, code, verified }: Props) {
  const [origin, setOrigin] = useState("https://career-180.example");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-paper-border bg-paper text-paper-foreground shadow-card">
      <div className="h-1.5 bg-gradient-brand" />
      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-brand font-display text-[10px] font-bold text-primary-foreground">
              C180
            </span>
            <span className="font-display text-sm font-semibold">Career-180</span>
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-paper-muted">
            {verified ? "Certificate of Achievement" : "Certificate of Completion"}
          </p>
          <p className="mt-3 text-sm text-paper-muted">This certifies that</p>
          <p className="mt-1 font-serif text-4xl font-semibold leading-tight sm:text-5xl">{learnerName}</p>
          <p className="mt-3 text-sm text-paper-muted">has completed the course</p>
          <p className="mt-1 font-display text-lg font-semibold">{courseName}</p>
        </div>
        <div className="flex flex-col items-center justify-end gap-2 sm:items-end">
          <div className="rounded-lg border border-paper-border bg-paper p-2">
            <QRCodeSVG value={`${origin}/?verify=${certId}`} size={96} level="M" bgColor="transparent" />
          </div>
          <div className="text-center font-mono text-xs sm:text-right">
            <p>
              ID <span className="font-bold">{certId}</span>
            </p>
            <p>
              Code <span className="font-bold">{code}</span>
            </p>
          </div>
        </div>
      </div>
      <p className="border-t border-paper-border px-6 py-3 text-center text-xs text-paper-muted sm:px-8">
        To verify, scan the QR or enter the ID at Career-180 verification.
      </p>
    </div>
  );
}
