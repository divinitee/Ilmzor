import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookmarkPlus, Check, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

// v1 vertical slice: tap the target word on a vocab item -> bookmark it for
// later, without ever showing its definition here. The definition is
// still captured accurately into SavedWord at save time (the system
// already knows it from item.definition) — it's just never displayed
// during a question, since showing it here would hand a student the exact
// answer to the "explain in your own words" prompt they're actively
// working on, graded or not. Reviewing the real definition is what "My
// Words" is for; this is a testing/practice context, not a review one.
export default function VocabWordChip({ word, definition, userEmail, lessonId }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!userEmail || !word) return;
    base44.entities.SavedWord.filter({ user_email: userEmail, word })
      .then((rows) => setSaved(rows.length > 0))
      .finally(() => setChecked(true));
  }, [userEmail, word]);

  const handleSave = async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      await base44.entities.SavedWord.create({
        user_email: userEmail,
        word,
        definition,
        source: "curated",
        ...(lessonId ? { source_lesson_id: lessonId } : {}),
        saved_at: new Date().toISOString(),
      });
      setSaved(true);
    } catch (e) {
      console.error("SavedWord create failed:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-400 text-sm font-semibold select-none"
      >
        {word}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border border-border shadow-xl rounded-2xl p-5 max-w-sm w-full"
            >
              <div className="flex items-start justify-between mb-4">
                <p className="text-base font-bold text-foreground">Save "{word}" to My Words?</p>
                <button onClick={() => setOpen(false)} className="text-muted-foreground select-none">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-5">You can review its meaning anytime in My Words — it won't be shown here, so it doesn't give away the answer.</p>
              <button
                onClick={handleSave}
                disabled={!checked || saving || saved}
                className={`w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 select-none ${
                  saved
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-gradient-to-b from-blue-500 to-blue-700 text-white disabled:opacity-50"
                }`}
              >
                {saved ? <><Check className="w-4 h-4" /> Saved</> : <><BookmarkPlus className="w-4 h-4" /> Save to My Words</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
