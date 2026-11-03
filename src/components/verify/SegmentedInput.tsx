import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface Props {
  length: number;
  value: string;
  onChange: (v: string) => void;
  onComplete: (v: string) => void;
  /** Characters allowed, e.g. /[0-9]/ */
  allowed: RegExp;
  disabled?: boolean;
  label: string;
}

/** One box per character with auto-advance, backspace, arrows and paste support. */
export function SegmentedInput({ length, value, onChange, onComplete, allowed, disabled, label }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  const clean = (raw: string) =>
    raw
      .toUpperCase()
      .split("")
      .filter((c) => allowed.test(c))
      .join("");

  const setAt = (i: number, ch: string) => {
    const next = chars.slice();
    next[i] = ch;
    const v = next.join("").slice(0, length);
    onChange(v);
    return next;
  };

  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const handleInput = (i: number, raw: string) => {
    const c = clean(raw);
    if (!c) return;
    if (c.length > 1) return fill(i, c);
    const next = setAt(i, c);
    if (i < length - 1) focus(i + 1);
    if (next.every(Boolean)) onComplete(next.join(""));
  };

  const fill = (start: number, text: string) => {
    const next = chars.slice();
    let i = start;
    for (const ch of text) {
      if (i >= length) break;
      next[i++] = ch;
    }
    const v = next.join("");
    onChange(v);
    focus(i);
    if (next.every(Boolean)) onComplete(v);
  };

  const handlePaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const c = clean(e.clipboardData.getData("text"));
    if (c) fill(c.length >= length ? 0 : i, c);
  };

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (chars[i]) setAt(i, "");
      else if (i > 0) {
        setAt(i - 1, "");
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft") focus(i - 1);
    else if (e.key === "ArrowRight") focus(i + 1);
    else if (e.key === "Enter") onComplete(chars.join(""));
  };

  return (
    <div role="group" aria-label={label} className="flex justify-center gap-1.5 sm:gap-2.5">
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={ch}
          disabled={disabled}
          aria-label={`${label} character ${i + 1}`}
          inputMode={length === 6 ? "numeric" : "text"}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={length}
          onChange={(e) => handleInput(i, e.target.value.replace(ch, "") || e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-12 w-9 rounded-lg border border-input bg-surface text-center font-mono text-lg font-bold uppercase text-foreground outline-none transition-all sm:h-14 sm:w-12 sm:text-xl",
            "focus:border-primary focus:ring-2 focus:ring-primary/30",
            ch && "border-primary/60",
            disabled && "opacity-50",
          )}
        />
      ))}
    </div>
  );
}
