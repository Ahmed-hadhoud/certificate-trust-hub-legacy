import { Badge } from "@/components/ui/badge";
import { band } from "@/lib/domain";
import type { DisputeStatus, RequestStatus } from "@/lib/types";

export function BandBadge({ score }: { score: number | null }) {
  const b = band(score);
  const variant =
    b === "Excellent" ? "verified" : b === "Very good" ? "info" : b === "Good" ? "success" : b === "Not passed" ? "danger" : "muted";
  return <Badge variant={variant}>{b}</Badge>;
}

export function StatusBadge({ status }: { status: RequestStatus | DisputeStatus }) {
  const map = {
    pending: ["warning", "Pending"],
    approved: ["success", "Approved"],
    declined: ["danger", "Declined"],
    expired: ["muted", "Expired"],
    open: ["warning", "Open"],
    upheld: ["success", "Upheld"],
    rejected: ["muted", "Rejected"],
  } as const;
  const [variant, label] = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}
