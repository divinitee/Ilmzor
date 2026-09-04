import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import VocabReviewRow from "@/components/vocab/VocabReviewRow";

const BANDS = ["A1", "A2", "B1", "B2", "C1"];

// Admin-only review surface for the AI-enriched vocabulary fields
// (english_definition, cefr, example_en). Read + correct only — it never
// generates content, so it's safe to open while enrichment is paused.
export default function VocabReview() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [band, setBand] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      // Paginate by id, not unit_number: most rows have no unit_number, so
      // that sort is non-deterministic and pages overlap — which produced
      // duplicate rows (and colliding React keys) in this list.
      const byId = new Map();
      let skip = 0;
      while (true) {
        const page = await base44.entities.VocabularyWord.list("id", 500, skip);
        page.forEach((w) => byId.set(w.id, w));
        if (page.length < 500) break;
        skip += 500;
      }
      setWords([...byId.values()].filter((w) => (w.english_definition || "").trim()));
      setLoading(false);
    })();
  }, []);

  const counts = useMemo(() => {
    const c = {};
    words.forEach((w) => { c[w.cefr || "—"] = (c[w.cefr || "—"] || 0) + 1; });
    return c;
  }, [words]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return words.filter((w) => {
      if (band !== "all" && w.cefr !== band) return false;
      if (!needle) return true;
      return (w.english || "").toLowerCase().includes(needle)
        || (w.english_definition || "").toLowerCase().includes(needle);
    });
  }, [words, band, q]);

  const saveWord = async (id, patch) => {
    await base44.entities.VocabularyWord.update(id, patch);
    setWords((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  return (
    <div className="min-h-screen pb-16">
      <div className="safe-header flex items-center gap-3 mb-4">
        <Link to="/" className="w-10 h-10 rounded-full glass flex items-center justify-center select-none">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold">Vocabulary Review</h1>
          <p className="text-xs text-muted-foreground">{words.length} enriched words</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        <div className="premium-card p-4 mb-4">
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search word or definition..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-card border border-input text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setBand("all")}
              className={`px-3 h-8 rounded-full text-xs font-semibold border select-none ${band === "all" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              All {words.length}
            </button>
            {BANDS.map((b) => (
              <button
                key={b}
                onClick={() => setBand(b)}
                className={`px-3 h-8 rounded-full text-xs font-semibold border select-none ${band === b ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                {b} {counts[b] || 0}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading words...
          </div>
        ) : visible.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">No words match this filter.</p>
        ) : (
          <div className="space-y-2.5">
            {visible.map((w) => (
              <VocabReviewRow key={w.id} word={w} bands={BANDS} onSave={saveWord} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}