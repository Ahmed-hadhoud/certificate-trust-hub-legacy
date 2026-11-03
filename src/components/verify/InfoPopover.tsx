import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LEGACY_POLICY_TEXT, VERIFIED_EXPLANATION } from "@/lib/domain";

export function InfoPopover({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className="inline-grid h-5 w-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Info className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm">
        <p className="mb-1 font-display font-semibold">{title}</p>
        <div className="leading-relaxed text-muted-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

export function VerifiedInfo() {
  return (
    <InfoPopover label="What does Verified mean?" title="What Verified means">
      {VERIFIED_EXPLANATION}
    </InfoPopover>
  );
}

export function LegacyInfo() {
  return (
    <InfoPopover label="What did the previous standard mean?" title="Previous standard (before 1 Jan 2027)">
      {LEGACY_POLICY_TEXT}
    </InfoPopover>
  );
}
