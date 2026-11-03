import { BadgeCheck, Ban, CheckCircle2, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CertState } from "@/lib/types";
import { LegacyInfo, VerifiedInfo } from "./InfoPopover";

export function LevelBadge({ state, withInfo = true }: { state: CertState; withInfo?: boolean }) {
  if (state === "Verified")
    return (
      <span className="inline-flex items-center gap-1.5">
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> Completed
        </Badge>
        <Badge variant="verified" className="gap-1">
          <BadgeCheck className="h-3.5 w-3.5" /> Verified
        </Badge>
        {withInfo && <VerifiedInfo />}
      </span>
    );
  if (state === "Legacy")
    return (
      <span className="inline-flex items-center gap-1.5">
        <Badge variant="warning" className="gap-1">
          <History className="h-3.5 w-3.5" /> Legacy
        </Badge>
        {withInfo && <LegacyInfo />}
      </span>
    );
  if (state === "Revoked")
    return (
      <Badge variant="danger" className="gap-1">
        <Ban className="h-3.5 w-3.5" /> Revoked
      </Badge>
    );
  return (
    <Badge variant="success" className="gap-1">
      <CheckCircle2 className="h-3.5 w-3.5" /> Completed
    </Badge>
  );
}
