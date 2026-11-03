import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { act } from "@/lib/store";
import { publishCourseVersion, toggleDraftRequired } from "@/lib/actions";
import { currentVersion, formatDate, itemTypeLabel } from "@/lib/domain";
import type { AppState, Course } from "@/lib/types";

export function CoursesTab({ s }: { s: AppState }) {
  return (
    <div className="space-y-4">
      <p className="panel-info p-3 text-sm text-muted-foreground">
        Toggle required items, then publish a new version with a change note. Existing certificates keep their state
        and version; older certificates show a newer-version notice.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {s.courses.map((c) => (
          <CourseCard key={c.id} course={c} s={s} />
        ))}
      </div>
    </div>
  );
}

function CourseCard({ course, s }: { course: Course; s: AppState }) {
  const [note, setNote] = useState("");
  const cur = currentVersion(course);
  const draft = course.draftRequired ?? cur.required;
  const changed = draft.join(",") !== cur.required.join(",");
  const certCount = s.certificates.filter((x) => x.courseId === course.id).length;

  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{course.name}</h3>
          <p className="text-xs text-muted-foreground">{certCount} certificate(s)</p>
        </div>
        <Badge variant="info">Current v{cur.version}</Badge>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Required for Verified (next version)</p>
        {course.items.map((i) => (
          <label
            key={i.key}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm"
          >
            <span>
              {i.label} · <span className="text-muted-foreground">{i.skill}</span>
              <span className="ml-2 text-xs text-muted-foreground">{itemTypeLabel(i)}</span>
            </span>
            <Switch
              checked={draft.includes(i.key)}
              onCheckedChange={() => act((d) => toggleDraftRequired(d, course.id, i.key))}
              aria-label={`${i.label} required`}
            />
          </label>
        ))}
        {changed && <p className="text-xs text-warning">Unpublished changes. Publish a new version to apply them.</p>}
      </div>

      <div className="mt-4 grid gap-1.5">
        <Label htmlFor={`note-${course.id}`}>Change note (required)</Label>
        <Textarea id={`note-${course.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        <Button
          size="sm"
          variant="brand"
          className="mt-1 w-fit"
          disabled={!note.trim()}
          onClick={() => {
            if (act((d) => publishCourseVersion(d, course.id, note))) {
              toast.success(`${course.name} v${cur.version + 1} published`);
              setNote("");
            }
          }}
        >
          <Upload /> Publish v{cur.version + 1}
        </Button>
      </div>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Version history</p>
        <ol className="mt-2 space-y-1.5 text-sm">
          {[...course.versions].reverse().map((v) => (
            <li key={v.version} className="flex gap-2">
              <span className="font-mono font-semibold">v{v.version}</span>
              <span className="text-muted-foreground">
                {formatDate(v.publishedAt)} · {v.required.length ? v.required.join(", ") : "no required items"}
                {v.changeNote && ` — ${v.changeNote}`}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
