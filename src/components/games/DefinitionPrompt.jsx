import React from "react";
import { BookOpen, Sparkles } from "lucide-react";
import { useDefinitionCopy } from "@/components/games/definitionCopy";
import DefinitionMatchBadge from "@/components/games/DefinitionMatchBadge";

// The word card + task box. `item` = { english, uzbek, definition, example,
// provenance }. The shown definition is the student's own tier (resolved in
// the engine via definitionForLevel), the example is the word's example_en.
export default function DefinitionPrompt({ item, accent, minWords }) {
  const { t } = useDefinitionCopy();
  return (
    <>
      <div className="premium-card p-5 mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" style={{ color: accent }} aria-hidden="true" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t("gameui.def_word")}</p>
          </div>
          <DefinitionMatchBadge provenance={item.provenance} solved={false} />
        </div>
        <p className="text-2xl font-bold text-foreground">{item.english}</p>
        {item.uzbek && <p className="text-sm text-muted-foreground mt-1">{item.uzbek}</p>}
        {item.definition && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs font-semibold mb-1" style={{ color: accent }}>📖 {t("gameui.def_given")}</p>
            <p className="text-sm text-foreground/90 select-text">{item.definition}</p>
          </div>
        )}
        {item.example && <p className="text-xs italic text-muted-foreground mt-2">“{item.example}”</p>}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 mb-4">
        <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: accent }}>
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />{t("gameui.def_task")}
        </p>
        <p className="text-xs text-foreground/80">{t("gameui.def_task_desc", { min: minWords })}</p>
      </div>
    </>
  );
}