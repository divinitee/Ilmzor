import React from "react";
import { motion } from "framer-motion";

// Renders one composed practice item and collects a response.
// Presentation only — it never grades, never decides what comes next.
//
// Blanks render inline, in the sentence, rather than as a separate input below
// it. That was a real defect in the assessment: a student shown a gapped
// sentence and a full-width box underneath started retyping the whole sentence,
// because nothing said the box was only for the missing words.

const ACCENT = "#3E9E92";

const splitBlanks = (text) => {
  if (typeof text !== "string" || !text.includes("_")) return null;
  const parts = text.split(/_+/);
  return parts.length > 1 ? parts : null;
};

function Blank({ value, onChange, disabled, width = 8, label }) {
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-label={label}
      size={Math.max(width, String(value || "").length + 1)}
      className="inline-block mx-1 px-2 py-0.5 rounded-lg border-b-2 bg-white/5 text-foreground outline-none focus:ring-1 align-baseline disabled:opacity-70"
      style={{ borderColor: ACCENT, "--tw-ring-color": ACCENT, minWidth: `${width}ch` }}
    />
  );
}

/** A sentence with its blanks rendered inline as inputs. */
function GappedSentence({ text, values, onChangeAt, disabled }) {
  const segs = splitBlanks(text);
  if (!segs) return <p className="text-base text-foreground/90 leading-relaxed">{text}</p>;
  return (
    <p className="text-base md:text-lg text-foreground leading-loose">
      {segs.map((seg, i) => (
        <React.Fragment key={i}>
          {seg}
          {i < segs.length - 1 && (
            <Blank
              value={Array.isArray(values) ? values[i] : values}
              onChange={(v) => onChangeAt(i, v)}
              disabled={disabled}
              label={`blank ${i + 1}`}
            />
          )}
        </React.Fragment>
      ))}
    </p>
  );
}

export default function PracticeItem({ item, response, onChange, disabled }) {
  if (!item) return null;
  const multi = Array.isArray(item.key);

  const setBlank = (i, v) => {
    if (!multi) return onChange(v);
    const next = Array.isArray(response) ? [...response] : item.key.map(() => "");
    next[i] = v;
    onChange(next);
  };

  return (
    <div>
      {item.instr && (
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-3">{item.instr}</p>
      )}

      {/* rewrite shows the original sentence as context, above the gapped target */}
      {item.format === "rewrite" && item.source && (
        <p className="premium-card rounded-2xl px-4 py-3 mb-4 text-base text-foreground/80 leading-relaxed">
          {item.source}
        </p>
      )}

      {item.format === "mcq" && (
        <>
          <p className="text-base md:text-lg font-semibold text-foreground leading-relaxed mb-4">
            {item.prompt}
          </p>
          <div className="grid gap-2">
            {item.options.map((opt, i) => {
              const on = response === i;
              return (
                <motion.button
                  key={i}
                  type="button"
                  disabled={disabled}
                  whileTap={disabled ? undefined : { scale: 0.985 }}
                  onClick={() => onChange(i)}
                  className={`premium-card w-full text-left rounded-2xl px-4 py-3 text-sm md:text-base transition-colors select-none disabled:opacity-70 ${
                    on ? "text-foreground" : "text-foreground/80 hover:bg-white/5"
                  }`}
                  style={on ? { borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}` } : undefined}
                >
                  <span
                    className="inline-flex w-6 h-6 mr-3 items-center justify-center rounded-lg text-[11px] font-bold"
                    style={{ background: on ? ACCENT : "rgba(255,255,255,0.06)", color: on ? "#04201d" : "inherit" }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      {item.format === "gap_fill" && (
        <GappedSentence text={item.source} values={response} onChangeAt={setBlank} disabled={disabled} />
      )}

      {item.format === "rewrite" && (
        <GappedSentence text={item.hint} values={response} onChangeAt={setBlank} disabled={disabled} />
      )}
    </div>
  );
}
