import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookmarkPlus, Trash2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Personal vocabulary collection — v1: a plain list of saved words, sorted
// newest first, with a way to remove a word. No quiz, no recall testing, no
// scheduling — reviewing-for-real is SRS's job later, not this screen's.
// Lives inside Skill Hub (entry point in Home.jsx/SkillHub.jsx header), not
// a new top-level nav destination.
export default function MyWords() {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me().catch(() => null);
      if (!me) { setLoading(false); return; }
      const rows = await base44.entities.SavedWord.filter({ user_email: me.email }, "-saved_at");
      setWords(rows);
      setLoading(false);
    })();
  }, []);

  const handleRemove = async (id) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
    await base44.entities.SavedWord.delete(id).catch((e) => console.error("SavedWord delete failed:", e));
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 select-none">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-xl font-bold text-foreground mb-1">My Words</h1>
      <p className="text-sm text-muted-foreground mb-6">Words you've saved while learning.</p>

      {words.length === 0 ? (
        <div className="text-center py-16">
          <BookmarkPlus className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No words saved yet. Tap a highlighted word during a lesson to save it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {words.map((w) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-4 flex items-start justify-between gap-3"
            >
              <div>
                <p className="text-base font-bold text-foreground">{w.word}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">{w.definition}</p>
              </div>
              <button onClick={() => handleRemove(w.id)} className="text-muted-foreground hover:text-rose-500 shrink-0 select-none">
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
