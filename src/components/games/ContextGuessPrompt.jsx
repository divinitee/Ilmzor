import React from "react";
import { Languages } from "lucide-react";
import ContextGuessBadge from "@/components/games/ContextGuessBadge";

// The sentence card: the word used in context, emphasized in the skill accent,
// with the Starter emoji beside it when one exists. The optional translation
// reveal sits under the sentence (A2+ only) — presented as a help, never a
// penalty, exactly like Definition Match's example toggle.
export default function ContextGuessPrompt({ q, accent, showTranslation }) {
  const { before, match, after } = q.parts;
  return (
    <div className="premium-card p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {q.emoji && <span className="text-2xl leading-none" aria-hidden="true">{q.emoji}</span>}
          <span className="text-sm font-bold truncate" style={{ color: accent }}>{q.word}</span>
          {q.pronunciation && <span className="text-[10px] text-muted-foreground truncate">{q.pronunciation}</span>}
        </div>
        <ContextGuessBadge provenance={q.provenance} />
      </div>

      <p className="text-base text-foreground leading-relaxed">
        “{before}
        <b className="font-bold" style={{ color: accent }}>{match || q.word}</b>
        {after}”
      </p>

      {showTranslation && q.translation && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Languages className="w-3.5 h-3.5" aria-hidden="true" /> {q.translation}
        </p>
      )}
    </div>
  );
}