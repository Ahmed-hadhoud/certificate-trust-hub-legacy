import { useState } from "react";
import { CalendarClock, Download, FastForward, RotateCcw, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { act, resetStore, snapshot, useAppState } from "@/lib/store";
import { fastForward } from "@/lib/actions";
import { formatDate } from "@/lib/domain";
import { exportCsvFiles, exportJson } from "@/lib/export";

export function DemoTools() {
  const s = useAppState();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="panel w-72 p-4 animate-rise">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-sm font-semibold">Demo tools</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close demo tools"
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <CalendarClock className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Prototype date</span>
            <span className="ml-auto font-mono font-semibold">{formatDate(s.today)}</span>
          </div>
          <div className="grid gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                act((d) => fastForward(d, 14));
                toast.success(`Clock moved to ${formatDate(snapshot().today)}`);
              }}
            >
              <FastForward /> Fast-forward 14 days
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                resetStore();
                toast.success("Demo data restored from seed");
              }}
            >
              <RotateCcw /> Reset demo data
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => exportJson(snapshot())}>
                <Download /> JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportCsvFiles(snapshot())}>
                <Download /> CSV
              </Button>
            </div>
          </div>
        </div>
      )}
      <Button variant="brand" size="sm" className="rounded-full" onClick={() => setOpen((o) => !o)}>
        <Wrench /> Demo · {formatDate(s.today)}
      </Button>
    </div>
  );
}
