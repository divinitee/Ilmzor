import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { EXPLAIN_CONTENT, HELP_LABEL, LANG_NAME } from "@/lib/explainContent";

// Two-tier contextual help, Lesson Runner only for now (not "on all pages"
// yet, per explicit scope). Tier 1: an always-visible Explain button, plain
// English, explaining what to do on the current screen. Tier 2: only if
// the student's language isn't English, a Help button (labeled in their
// own language) appears inside the Explain panel. Choosing it shows a
// genuine, non-shaming pause first ("try English first"), then reveals the
// translated explanation only if they still want it. No accusation, no
// guilt-tripping — reusing the same encouraging-nudge pattern already used
// for the free-plan confirmation in onboarding.
export default function ExplainHelp({ contentKey }) {
  const { lang } = useAppLang();
  const [stage, setStage] = useState(null); // null | "explain" | "nudge" | "help"
  const content = EXPLAIN_CONTENT[contentKey];
  if (!content) return null;

  const canOfferHelp = lang !== "en" && content.help && content.help[lang];

  return (
    <>
      <button
        onClick={() => setStage("explain")}
        className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm text-xs font-semibold text-foreground select-none"
      >
        <HelpCircle className="w-3.5 h-3.5 text-blue-500" /> Explain
      </button>

      <AnimatePresence>
        {stage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
            onClick={() => setStage(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-wide">
                  {stage === "help" ? "Help" : "Explain"}
                </p>
                <button onClick={() => setStage(null)} className="text-muted-foreground select-none">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {stage === "explain" && (
                <>
                  <p className="text-sm text-foreground leading-relaxed mb-4">{content.explain}</p>
                  {canOfferHelp && (
                    <button
                      onClick={() => setStage("nudge")}
                      className="text-xs font-semibold text-blue-500 select-none"
                    >
                      {HELP_LABEL[lang]}
                    </button>
                  )}
                </>
              )}

              {stage === "nudge" && (
                <>
                  <p className="text-sm text-foreground leading-relaxed mb-5">
                    Try reading it in English first \u2014 you might understand more than you think! \ud83d\udcaa
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStage("explain")}
                      className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground select-none"
                    >
                      Try again
                    </button>
                    <button
                      onClick={() => setStage("help")}
                      className="flex-1 h-10 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white text-sm font-semibold select-none"
                    >
                      Show me in {LANG_NAME[lang]}
                    </button>
                  </div>
                </>
              )}

              {stage === "help" && (
                <p className="text-sm text-foreground leading-relaxed">{content.help[lang]}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
