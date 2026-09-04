import React, { useState } from "react";
import { Check, Loader2, Pencil } from "lucide-react";

const BAND_COLOR = {
  A1: "text-emerald-400 border-emerald-400/40",
  A2: "text-sky-400 border-sky-400/40",
  B1: "text-blue-400 border-blue-400/40",
  B2: "text-purple-400 border-purple-400/40",
  C1: "text-rose-400 border-rose-400/40",
};

// One reviewable enriched word: shows the AI output, and lets an admin
// correct the band or definition in place.
export default function VocabReviewRow({ word, bands, onSave }) {
  const [editing, setEditing] = useState(false);
  const [def, setDef] = useState(word.english_definition || "");
  const [ex, setEx] = useState(word.example_en || "");
  const [band, setBand] = useState(word.cefr || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(word.id, {
      english_definition: def.trim().slice(0, 300),
      example_en: ex.trim().slice(0, 300),
      cefr: band,
    });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="premium-card p-4">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">{word.english}</span>
          <span className={`px-2 h-5 inline-flex items-center rounded-full border text-[10px] font-bold ${BAND_COLOR[word.cefr] || "text-muted-foreground border-border"}`}>
            {word.cefr || "—"}
          </span>
          <span className="text-xs text-muted-foreground">{word.uzbek}</span>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="w-8 h-8 rounded-lg glass flex items-center justify-center shrink-0 select-none"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {!editing ? (
        <>
          <p className="text-sm text-foreground/90">{word.english_definition}</p>
          {word.example_en && <p className="text-xs text-muted-foreground italic mt-1">"{word.example_en}"</p>}
        </>
      ) : (
        <div className="space-y-2 mt-2">
          <textarea
            value={def}
            onChange={(e) => setDef(e.target.value)}
            className="w-full h-16 px-3 py-2 rounded-lg bg-card border border-input text-sm text-foreground focus:border-primary focus:outline-none resize-none"
          />
          <input
            value={ex}
            onChange={(e) => setEx(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-card border border-input text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {bands.map((b) => (
              <button
                key={b}
                onClick={() => setBand(b)}
                className={`px-2.5 h-7 rounded-full text-[11px] font-bold border select-none ${band === b ? BAND_COLOR[b] : "text-muted-foreground border-border"}`}
              >
                {b}
              </button>
            ))}
          </div>
          <button
            onClick={save}
            disabled={saving || !def.trim() || !band}
            className="h-9 px-4 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 select-none"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
          </button>
        </div>
      )}
    </div>
  );
}