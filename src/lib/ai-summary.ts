// Deterministic "AI-style" answers built only from the evidence on the page. Works offline.
import { band, finalGrade, itemTypeLabel } from "./domain";
import type { CourseItem, ItemResult } from "./types";

export interface Evidence {
  learnerName: string;
  courseName: string;
  items: CourseItem[];
  results: Record<string, ItemResult>;
}

export const SUGGESTED_QUESTIONS = [
  "Summarize this learner's performance",
  "What are the strengths and weaknesses?",
  "Which skills are best evidenced, and which are not?",
] as const;

export const OUT_OF_SCOPE = "I can only answer from the evidence on this page.";

function rows(e: Evidence) {
  return e.items
    .map((i) => ({ item: i, r: e.results[i.key] }))
    .map(({ item, r }) => ({ item, score: r?.score ?? null, attempts: r?.attempts ?? 0, feedback: r?.feedback }));
}
const firstName = (e: Evidence) => e.learnerName.split(" ")[0] ?? e.learnerName;
const fmt = (x: { item: CourseItem; score: number | null }) =>
  `${x.item.label} (${x.item.skill}) at ${x.score ?? "—"}% — ${band(x.score)}`;

export function summarize(e: Evidence): string {
  const r = rows(e);
  const scored = r.filter((x) => x.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const fg = finalGrade(e.items, e.results);
  const top = scored[0];
  const low = scored[scored.length - 1];
  const firstTry = r.filter((x) => x.attempts === 1).length;
  const project = r.find((x) => x.item.type === "project");
  const parts = [
    `${firstName(e)} passed all ${r.length} required items in ${e.courseName}, with a final course grade of ${fg}% (${band(fg)}).`,
  ];
  if (top && low && top !== low) parts.push(`The strongest result is ${fmt(top)}; the lowest is ${fmt(low)}.`);
  parts.push(`${firstTry} of ${r.length} items were passed on the first attempt.`);
  if (project?.feedback) parts.push(`Instructor feedback on the project: “${project.feedback}”`);
  return parts.join(" ");
}

export function strengthsWeaknesses(e: Evidence): string {
  const r = rows(e);
  const strong = r.filter((x) => (x.score ?? 0) >= 85);
  const weak = r.filter((x) => (x.score ?? 0) < 80 || x.attempts > 1);
  const project = r.find((x) => x.item.type === "project");
  const s = strong.length
    ? `Strengths: ${strong.map(fmt).join("; ")}.`
    : "Strengths: no item reached 85% or more; every item is in the Good or Very good band.";
  const w = weak.length
    ? `Weaker areas: ${weak
        .map((x) => `${fmt(x)}${x.attempts > 1 ? `, after ${x.attempts} attempts` : ""}`)
        .join("; ")}.`
    : "Weaker areas: none stand out — every item was passed at 80% or more on the first attempt.";
  const fb = project?.feedback ? ` The project feedback adds: “${project.feedback}”` : "";
  return `${s} ${w}${fb}`;
}

export function skillsEvidence(e: Evidence): string {
  const r = rows(e).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const best = r.filter((x) => (x.score ?? 0) >= 85 || x.item.type !== "quiz");
  const lesser = r.filter((x) => !best.includes(x));
  const kind = (x: (typeof r)[number]) =>
    x.item.type === "quiz" ? "an auto-graded quiz" : itemTypeLabel(x.item).toLowerCase();
  const bestText = best.length
    ? `Best evidenced: ${best.map((x) => `${x.item.skill} (${kind(x)}, ${x.score}%)`).join("; ")}.`
    : "No skill is evidenced above 85% or by an exam or project.";
  const lesserText = lesser.length
    ? ` Less strongly evidenced: ${lesser.map((x) => `${x.item.skill} (${kind(x)}, ${x.score}%)`).join("; ")}.`
    : "";
  const gap = r.some((x) => x.item.type === "project")
    ? ""
    : " There is no graded project, so applied, hands-on work is not evidenced here.";
  return `${bestText}${lesserText}${gap}`;
}

const IN_SCOPE_WORDS = [
  "score", "grade", "result", "quiz", "exam", "project", "feedback", "attempt", "pass", "band",
  "skill", "strength", "weak", "perform", "summar", "overall", "best", "lowest", "highest", "item",
];

export function answer(e: Evidence, question: string): string {
  const q = question.toLowerCase();
  if (q.includes("strength") || q.includes("weak")) return strengthsWeaknesses(e);
  if (q.includes("skill") || q.includes("evidenc")) return skillsEvidence(e);
  if (q.includes("summar") || q.includes("perform") || q.includes("overall")) return summarize(e);
  const r = rows(e);
  if (q.includes("feedback") || q.includes("project")) {
    const p = r.find((x) => x.item.type === "project");
    return p
      ? `${fmt(p)}. Instructor feedback: “${p.feedback ?? "No written feedback recorded."}”`
      : "This course has no graded project, so there is no project feedback.";
  }
  if (q.includes("exam")) {
    const ex = r.find((x) => x.item.type === "exam");
    return ex ? `${fmt(ex)}, ${itemTypeLabel(ex.item).toLowerCase()}, ${ex.attempts} attempt(s).` : "This course has no exam.";
  }
  if (q.includes("attempt")) {
    return r.map((x) => `${x.item.label}: ${x.attempts} attempt(s)`).join("; ") + ".";
  }
  if (q.includes("grade") || q.includes("score") || q.includes("result")) {
    const fg = finalGrade(e.items, e.results);
    return `${r.map(fmt).join("; ")}. Final course grade: ${fg}% (${band(fg)}).`;
  }
  if (IN_SCOPE_WORDS.some((w) => q.includes(w))) return summarize(e);
  return OUT_OF_SCOPE;
}
