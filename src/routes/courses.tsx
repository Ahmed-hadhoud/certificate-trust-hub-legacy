import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, BookOpen, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/lib/store";
import { currentVersion, DISCLOSURE_TEXT, itemsFor, itemTypeLabel } from "@/lib/domain";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses · Career-180" },
      { name: "description", content: "Career-180 courses, the items required for Verified, and how results are shared." },
      { property: "og:title", content: "Courses · Career-180" },
      {
        property: "og:description",
        content: "See what each Career-180 course requires for a Verified certificate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const s = useAppState();
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Catalogue</p>
      <h1 className="mt-2 text-4xl font-bold">Courses</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        What each course requires for a Verified certificate, and how your results are shared once you enroll.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {s.courses.map((c) => {
          const v = currentVersion(c);
          const req = itemsFor(c, v.required);
          return (
            <article key={c.id} className="panel flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <BookOpen className="h-5 w-5 text-primary" /> {c.name}
                </h2>
                <Badge variant="muted">v{v.version}</Badge>
              </div>
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <BadgeCheck className="h-3.5 w-3.5" /> Required for Verified (70% or more each)
                </p>
                {req.length ? (
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {req.map((i) => (
                      <li key={i.key} className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-1.5">
                        <span>
                          {i.label} <span className="text-muted-foreground">· {i.skill}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{itemTypeLabel(i)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    This course has no assessment. Certificates end at Completed.
                  </p>
                )}
              </div>
              <div className="mt-5 flex gap-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-muted-foreground">{DISCLOSURE_TEXT}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
