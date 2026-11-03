import { cn } from "@/lib/utils";

/** Neutral logo placeholder for Career-180. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand font-display text-xs font-bold text-primary-foreground shadow-brand">
        C180
      </span>
      <span className="font-display text-base font-semibold tracking-tight">Career-180</span>
    </span>
  );
}
