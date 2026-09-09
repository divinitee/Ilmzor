import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useGrammarCopy } from "@/lib/grammarCopy";

// Renders one assessment item and collects an answer in the shape the engine's
// scorer expects for that item's `answer.type`:
//
//   index     -> number (index into content.options)
//   exact     -> string
//   sequence  -> string[]   (word_order: tapped tiles · gap_fill: one per gap)
//   rubric    -> string     (free sentence; the ONLY type that reaches the AI)
//
// The component is presentation only. It never scores, never decides what comes
// next, and never calls anything — the engine owns all of that.

const ACCENT = "#3E9E92"; // grammar skill accent, per GAME_SKILL_MAP

/** Number of gaps in a multi-gap item, from its expected answer shape. */
const gapCount = (item) =>
  Array.isArray(item?.answer?.expected) ? item.answer.expected.length : 1;

export default function GrammarItemPrompt({ item, value, onChange, disabled }) {
  const c = useGrammarCopy();
  const type = item?.answer?.type;
  const isWordOrder = item?.formatType === "word_order";

  // The sentence being worked on. gap_fill and sentence_correction put the
  // real sentence in content.source and a generic instruction in content.prompt.
  const source = item?.content?.source;

  const tokens = useMemo(() => item?.content?.tokens ?? [], [item]);
  const picked = Array.isArray(value) ? value : [];
  const remaining = useMemo(() => {
    const left = [...tokens];
    picked.forEach((t) => {
      const i = left.indexOf(t);
      if (i >= 0) left.splice(i, 1);
    });
    return left;
  }, [tokens, picked]);

  if (!item) return null;

  return (
    <div>
      <p className="text-base md:text-lg font-semibold text-foreground leading-relaxed">
        {item.content.prompt}
      </p>

      {source && (
        <p className="mt-3 text-base text-foreground/90 leading-relaxed premium-card rounded-2xl px-4 py-3">
          {source}
        </p>
      )}

      {item.content.hint && (
        <p className="mt-2 text-xs text-muted-foreground">{item.content.hint}</p>
      )}

      {/* ---- index: one of N options ---- */}
      {type === "index" && (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">{c("in_choose")}</p>
          <div className="grid gap-2">
            {item.content.options.map((opt, i) => {
              const on = value === i;
              return (
                <motion.button
                  key={i}
                  type="button"
                  disabled={disabled}
                  whileTap={disabled ? undefined : { scale: 0.985 }}
                  onClick={() => onChange(i)}
                  className={`premium-card w-full text-left rounded-2xl px-4 py-3 text-sm md:text-base transition-colors select-none disabled:opacity-60 ${
                    on ? "text-foreground" : "text-foreground/80 hover:bg-white/5"
                  }`}
                  style={on ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}
                >
                  <span
                    className="inline-flex w-6 h-6 mr-3 items-center justify-center rounded-lg text-[11px] font-bold"
                    style={{
                      background: on ? ACCENT : "rgba(255,255,255,0.06)",
                      color: on ? "#04201d" : "inherit",
                    }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- sequence + word_order: tap tiles into order ---- */}
      {type === "sequence" && isWordOrder && (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">{c("in_order")}</p>

          <div className="premium-card rounded-2xl px-3 py-3 min-h-[52px] flex flex-wrap gap-2 items-center">
            {picked.length === 0 && <span className="text-sm text-muted-foreground px-1">…</span>}
            {picked.map((t, i) => (
              <button
                key={`${t}-${i}`}
                type="button"
                disabled={disabled}
                onClick={() => onChange(picked.filter((_, j) => j !== i))}
                className="neo-pill px-3 py-1.5 text-sm font-medium text-foreground select-none disabled:opacity-60"
                style={{ borderColor: ACCENT }}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {remaining.map((t, i) => (
              <button
                key={`${t}-${i}`}
                type="button"
                disabled={disabled}
                onClick={() => onChange([...picked, t])}
                className="neo-pill px-3 py-1.5 text-sm font-medium text-foreground/85 hover:bg-white/10 transition-colors select-none disabled:opacity-60"
              >
                {t}
              </button>
            ))}
          </div>

          {picked.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange([])}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors select-none"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {c("in_order_reset")}
            </button>
          )}
        </div>
      )}

      {/* ---- sequence without tiles: one input per gap ---- */}
      {type === "sequence" && !isWordOrder && (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">{c("in_type_multi")}</p>
          <div className="grid gap-2">
            {Array.from({ length: gapCount(item) }).map((_, i) => (
              <input
                key={i}
                type="text"
                disabled={disabled}
                value={picked[i] ?? ""}
                onChange={(e) => {
                  const next = [...picked];
                  while (next.length < gapCount(item)) next.push("");
                  next[i] = e.target.value;
                  onChange(next);
                }}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={`${i + 1}`}
                className="premium-card w-full rounded-2xl px-4 py-3 text-base text-foreground bg-transparent outline-none focus:ring-1 disabled:opacity-60"
                style={{ "--tw-ring-color": ACCENT }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- exact: single free text ---- */}
      {type === "exact" && (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">{c("in_type")}</p>
          <input
            type="text"
            disabled={disabled}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="premium-card w-full rounded-2xl px-4 py-3 text-base text-foreground bg-transparent outline-none focus:ring-1 disabled:opacity-60"
            style={{ "--tw-ring-color": ACCENT }}
          />
        </div>
      )}

      {/* ---- rubric: the only AI-evaluated format ---- */}
      {type === "rubric" && (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">{c("in_write")}</p>
          <textarea
            rows={3}
            disabled={disabled}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            className="premium-card w-full rounded-2xl px-4 py-3 text-base text-foreground bg-transparent outline-none focus:ring-1 resize-none disabled:opacity-60"
            style={{ "--tw-ring-color": ACCENT }}
          />
          <p className="mt-2 text-xs text-muted-foreground">{c("in_write_hint")}</p>
        </div>
      )}
    </div>
  );
}

/** True when the current value is a submittable answer for this item. */
export function hasAnswer(item, value) {
  const type = item?.answer?.type;
  if (type === "index") return Number.isInteger(value);
  if (type === "exact" || type === "rubric") return typeof value === "string" && value.trim().length > 0;
  if (type === "sequence") {
    if (!Array.isArray(value)) return false;
    if (item.formatType === "word_order") return value.length === (item.content.tokens?.length ?? 0);
    return value.length === gapCount(item) && value.every((v) => String(v ?? "").trim().length > 0);
  }
  return false;
}

/** The empty value for a fresh item, so inputs reset cleanly between questions. */
export const emptyAnswer = (item) =>
  item?.answer?.type === "sequence" ? [] : item?.answer?.type === "index" ? null : "";
