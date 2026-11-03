import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { act } from "@/lib/store";
import { openDispute } from "@/lib/actions";
import { isEmail } from "@/lib/domain";

export function DisputeDialog({ certId }: { certId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (reason.trim().length < 5) return setError("Please describe the reason (at least 5 characters).");
    if (!isEmail(email)) return setError("Please enter a valid contact email.");
    const id = act((d) => openDispute(d, certId, reason, email));
    toast.success(`Dispute ${id} submitted. Career-180 will review it.`);
    setOpen(false);
    setReason("");
    setEmail("");
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        <Flag className="h-3.5 w-3.5" /> Dispute this result
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispute this result</DialogTitle>
          <DialogDescription>
            Tell us why the result for certificate {certId} looks wrong. An admin will review it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="dispute-reason">Reason</Label>
            <Textarea id="dispute-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dispute-email">Contact email</Label>
            <Input id="dispute-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="brand" onClick={submit}>
            Submit dispute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
