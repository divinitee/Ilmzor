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

/** Splits text on one or more "_" blank markers into alternating segments.
 * Returns null when there's no blank marker; otherwise segments.length is
 * always (blank count + 1). */
const splitBlanks = (text) => {
  if (typeof text !== "string" || !text.includes("_")) return null;
  const parts = text.split(/_+/);
  return parts.length > 1 ? parts : null;
};

export default function GrammarItemPrompt({ item, value, onChange, disabled }) {
  const c = useGrammarCopy();
  const type = item?.answer?.type;
  const isWordOrder = item?.formatType === "word_order";

  // The sentence being worked on. gap_fill and sentence_correction put the
  // real sentence in content.source and a generic instruction in content.prompt.
  const source = item?.content?.source;
  const hint = item?.content?.hint;

  // Multi-gap fill (gap_fill items): render each blank inline in the sentence
  // itself, rather than a plain paragraph plus a separate stacked list of
  // inputs below it — so it's visually obvious which word goes where.
  const sourceBlanks = type === "sequence" && !isWordOrder ? splitBlanks(source) : null;
  const inlineSourceBlanks = sourceBlanks && sourceBlanks.length - 1 === gapCount(item) ? sourceBlanks : null;

  // Single-blank rewrite items (content.hint is a gapped sentence with one
  // blank, e.g. "Every summer my grandfather ______ fishing on the lake."):
  // the student only types the missing word(s), not the whole sentence, so
  // render the blank inline in the hint instead of a separate full-width
  // input that looks like it wants the entire sentence retyped.
  const hintBlanks = type === "exact" ? splitBlanks(hint) : null;
  const inlineHintBlanks = hintBlanks && hintBlanks.length === 2 ? hintBlanks : null;

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

      {source && !inlineSourceBlanks && (
        <p className="mt-3 text-base text-foreground/90 leading-relaxed premium-card rounded-2xl px-4 py-3">
          {source}
        </p>
      )}

      {hint && !inlineHintBlanks && (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
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

      {/* ---- sequence without tiles: one input per gap, inline in the sentence
           when the source text has matching blank markers; a stacked list of
           inputs is the defensive fallback if it doesn't. ---- */}
      {type === "sequence" && !isWordOrder && (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">{c("in_type_multi")}</p>
          {inlineSourceBlanks ? (
            <p className="premium-card rounded-2xl px-4 py-3 text-base text-foreground/90 leading-relaxed">
              {inlineSourceBlanks.map((seg, i) => (
                <React.Fragment key={i}>
                  {seg}
                  {i < inlineSourceBlanks.length - 1 && (
                    <input
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
                      aria-label={`${i + 1}`}
                      size={Math.max(4, (picked[i] ?? "").length || 4)}
                      className="inline-block mx-1 px-2 py-0.5 rounded-lg border-b-2 bg-white/5 text-foreground outline-none focus:ring-1 disabled:opacity-60 align-baseline"
                      style={{ borderColor: ACCENT, "--tw-ring-color": ACCENT, minWidth: "4.5ch" }}
                    />
                  )}
                </React.Fragment>
              ))}
            </p>
          ) : (
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
          )}
        </div>
      )}

      {/* ---- exact: single free text; when content.hint is a one-blank
           sentence, the blank renders inline so it's clear only the missing
           word(s) are wanted, not a full retyped sentence ---- */}
      {type === "exact" && (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
            {inlineHintBlanks ? c("in_type_blank") : c("in_type")}
          </p>
          {inlineHintBlanks ? (
            <p className="premium-card rounded-2xl px-4 py-3 text-base text-foreground/90 leading-relaxed">
              {inlineHintBlanks[0]}
              <input
                type="text"
                disabled={disabled}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                size={Math.max(6, (typeof value === "string" ? value.length : 0) || 8)}
                className="inline-block mx-1 px-2 py-0.5 rounded-lg border-b-2 bg-white/5 text-foreground outline-none focus:ring-1 disabled:opacity-60 align-baseline"
                style={{ borderColor: ACCENT, "--tw-ring-color": ACCENT, minWidth: "8ch" }}
              />
              {inlineHintBlanks[1]}
            </p>
          ) : (
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
          )}
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
