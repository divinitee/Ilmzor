import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Lightbulb, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppLang } from "@/hooks/useAppLang";

const DIFF_CONFIG = {
  beginner:     { rounds: 3, ask: ["noun", "verb"], allowHint: true },
  intermediate: { rounds: 4, ask: ["noun", "verb", "adjective"], allowHint: true },
  advanced:      { rounds: 5, ask: ["noun", "verb", "adjective", "adverb"], allowHint: false },
  proficient:    { rounds: 6, ask: ["noun", "verb", "adjective", "adverb"], allowHint: false },
};

const FORM_EMOJI = { noun: "📌", verb: "⚡", adjective: "🎨", adverb: "💨" };

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

export default function WordFormsGame({ words, unitName, onBack, onCoinsEarned, onGameComplete, difficulty = "intermediate" }) {
  const { t } = useAppLang();
  const cfg = DIFF_CONFIG[difficulty] || DIFF_CONFIG.intermediate;
  const [formsData, setFormsData] = useState([]); // [{word, noun, verb, adjective, adverb}]
  const [idx, setIdx] = useState(0);
  const [askForm, setAskForm] = useState("noun");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState(null); // {correct, expected, explanation}
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState([]);
  const [done, setDone] = useState(false);
  const [coinAnim, setCoinAnim] = useState(null);
  const [showHint, setShowHint] = useState(false);

  const buildGame = async () => {
    setLoading(true);
    const pool = words.filter(w => w.english).slice();
    const picked = shuffle(pool).slice(0, cfg.rounds);
    if (picked.length === 0) { setLoading(false); return; }
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `For each English word below, provide its grammatical forms. Use the most common correct form. If a form does not exist or is the same as the base, still return the best valid word (do NOT leave empty unless truly impossible). Return JSON array.
Words: ${JSON.stringify(picked.map(w => w.english))}`,
        response_json_schema: {
          type: "object",
          properties: {
            forms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  word: { type: "string" },
                  base: { type: "string" },
                  noun: { type: "string" },
                  verb: { type: "string" },
                  adjective: { type: "string" },
                  adverb: { type: "string" }
                }
              }
            }
          }
        }
      });
      const arr = (res.forms || []).filter(f => f && f.word);
      // merge uzbek meaning
      const merged = arr.map(f => {
        const w = picked.find(p => p.english.toLowerCase() === String(f.word).toLowerCase());
        return { ...f, uzbek: w?.uzbek || "", english: w?.english || f.word };
      });
      setFormsData(merged.length > 0 ? merged : picked.map(w => ({ word: w.english, base: w.english, noun: w.english, verb: w.english, adjective: w.english, adverb: w.english, uzbek: w.uzbek, english: w.english })));
    } catch {
      setFormsData(picked.map(w => ({ word: w.english, base: w.english, noun: w.english, verb: w.english, adjective: w.english, adverb: w.english, uzbek: w.uzbek, english: w.english })));
    }
    setIdx(0);
    setScores([]);
    setDone(false);
    pickAsk(0);
    setLoading(false);
  };

  useEffect(() => { buildGame(); /* eslint-disable-next-line */ }, [words, difficulty]);

  const pickAsk = (i) => {
    const data = formsData[i];
    if (!data) return;
    const available = cfg.ask.filter(f => data[f] && String(data[f]).trim());
    const choice = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : cfg.ask[0];
    setAskForm(choice);
    setInput("");
    setStatus(null);
    setShowHint(false);
  };

  const current = formsData[idx];

  const normalize = (s) => String(s || "").toLowerCase().trim();

  const submit = async () => {
    if (!input.trim() || checking || status) return;
    setChecking(true);
    const expected = normalize(current[askForm]);
    const got = normalize(input);
    const correct = got === expected || got === normalize(current.base);
    // simple explanation
    const formLabel = t(`gameui.forms.${askForm}`);
    const explanation = correct
      ? t("gameui.form_correct_explain", { word: current.english, form: formLabel, expected })
      : t("gameui.form_wrong_explain", { word: current.english, form: formLabel, expected });
    setStatus({ correct, expected, explanation });
    setScores(s => [...s, correct ? 1 : 0]);
    if (correct) { setCoinAnim("+1 🪙"); setTimeout(() => setCoinAnim(null), 900); }
    setChecking(false);
  };

  const nextRound = () => {
    if (idx + 1 >= formsData.length) { setDone(true); return; }
    setIdx(i => i + 1);
    pickAsk(idx + 1);
  };

  // award coins once on completion
  useEffect(() => {
    if (!done || scores.length === 0) return;
    const correctCount = scores.filter(Boolean).length;
    const pct = scores.length ? Math.round((correctCount / scores.length) * 100) : 0;
    if (onCoinsEarned) onCoinsEarned(correctCount, correctCount);
    if (onGameComplete) onGameComplete({ scorePct: pct, correct: correctCount, total: scores.length });
  }, [done]); /* eslint-disable-next-line */

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">{t("gameui.wordforms_loading")}</p>
      </div>
    );
  }

  if (done) {
    const correctCount = scores.filter(Boolean).length;
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto px-4 py-10 text-center">
        <div className="text-6xl mb-4">{correctCount / formsData.length >= 0.7 ? "🏆" : "📚"}</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("gameui.wordforms_done")}</h2>
        <p className="text-muted-foreground text-sm mb-1">{unitName}</p>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4 mb-4 flex items-center justify-center gap-3">
          <span className="text-3xl">🪙</span>
          <div><p className="text-2xl font-bold text-amber-600">+{correctCount}</p><p className="text-xs text-muted-foreground">{t("gameui.coins_added")}</p></div>
        </motion.div>
        <div className="bg-primary/10 rounded-2xl p-5 mb-5">
          <p className="text-3xl font-bold text-primary">{correctCount} / {formsData.length}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("gameui.wordforms_correct_answers")}</p>
        </div>
        <Button onClick={buildGame} className="w-full mb-2">{t("gameui.retry")}</Button>
        <Button variant="outline" onClick={onBack} className="w-full">{t("gameui.back")}</Button>
      </motion.div>
    );
  }

  if (!current) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-6 relative">
      <AnimatePresence>
        {coinAnim && (
          <motion.div initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -60, scale: 1.4 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-50 text-xl font-bold text-amber-500 pointer-events-none">
            {coinAnim}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-muted-foreground text-sm hover:text-foreground select-none flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> {t("gameui.back")}
        </button>
        <span className="text-xs text-muted-foreground font-medium">{idx + 1} / {formsData.length}</span>
        <span className="w-10" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
          {/* Base word */}
          <div className="bg-background border border-border rounded-2xl p-5 mb-5 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">{t("gameui.wordforms_base_word")}</p>
            <p className="text-3xl font-bold text-foreground">{current.english}</p>
            {current.uzbek && <p className="text-sm text-muted-foreground mt-1">{current.uzbek}</p>}
          </div>

          {/* Asked form */}
          <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-300 dark:border-violet-700 rounded-2xl p-4 mb-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{t("gameui.wordforms_asked_form")}</p>
            <p className="text-lg font-bold text-foreground">{FORM_EMOJI[askForm]} {t(`gameui.forms.${askForm}`)}</p>
          </div>

          {/* Input */}
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t("gameui.wordforms_form_placeholder", { form: t(`gameui.forms.${askForm}`) })}
            disabled={!!status}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            className="w-full h-12 px-4 border-2 border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors mb-3"
          />

          {/* Hint */}
          {cfg.allowHint && !status && (
            <div className="mb-3">
              {!showHint ? (
                <button onClick={() => setShowHint(true)} className="text-xs text-amber-600 hover:underline flex items-center gap-1 select-none">
                  <Lightbulb className="w-3.5 h-3.5" /> {t("gameui.wordforms_show_hint")}
                  </button>
                  ) : (
                  <p className="text-xs text-muted-foreground bg-amber-500/10 rounded-lg p-2">
                  {t("gameui.wordforms_hint_letter")} <strong className="text-foreground">{(current[askForm] || "").charAt(0).toUpperCase() || "?"}</strong>
                </p>
              )}
            </div>
          )}

          {/* Status / explanation */}
          {status && (
            <div className={`rounded-xl p-3 text-sm mb-3 ${status.correct ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
              <p className="font-semibold">{status.correct ? t("gameui.wordforms_correct_explain") : t("gameui.wordforms_wrong_explain")}</p>
              <p className="text-xs font-normal mt-1 text-muted-foreground">{status.explanation}</p>
            </div>
          )}

          {!status ? (
            <Button onClick={submit} disabled={!input.trim() || checking} className="w-full select-none">
              {checking ? t("gameui.checking") : t("gameui.check_answer")}
              </Button>
              ) : (
              <Button onClick={nextRound} className="w-full select-none">
              {idx + 1 >= formsData.length ? t("gameui.finish") : t("gameui.next_word")} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}