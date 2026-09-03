import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { checkAiGate, incrementAiUsage } from "@/lib/aiLimits";

const AI_LIMIT_MSG = "You've reached today's AI-graded practice. It refreshes tomorrow, or upgrade your plan for more.";

const DIFF_CONFIG = {
  beginner:     { count: 5,  minWords: 5 },
  intermediate: { count: 6,  minWords: 8 },
  advanced:     { count: 7,  minWords: 12 },
  proficient:   { count: 8,  minWords: 16 },
};

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// Generate definitions for a batch of words via LLM.
async function generateDefinitions(words) {
  const wordList = words.map(w => ({ uzbek: w.uzbek, english: w.english, russian: w.russian || "" }));
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an English vocabulary teacher for B1 learners. For each word below, write a clear, simple English definition (one sentence, max 18 words). Reply as a JSON array where each item has "english" (the word), "definition" (your definition), and "example" (a short example sentence using the word). Words: ${JSON.stringify(wordList)}`,
    response_json_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              english: { type: "string" },
              definition: { type: "string" },
              example: { type: "string" },
            },
          },
        },
      },
    },
  });
  const items = res.items || [];
  const map = {};
  items.forEach(it => { map[it.english?.toLowerCase()] = it; });
  return map;
}

// Evaluate a user-written definition and award 1-5 XP.
async function evaluateDefinition(userDef, word, cfg) {
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: [
        `You are a strict but fair English vocabulary examiner for B1 learners.`,
        `Target word (English): "${word.english}" — Uzbek: "${word.uzbek}".`,
        `Reference definition: "${word.definition || ""}".`,
        `The student rewrote the definition in their own words:`,
        `"${userDef}".`,
        ``,
        `Evaluate the student's text ONLY on meaning, not wording. A paraphrase that uses completely different words but keeps the correct meaning is EXCELLENT (accuracy 90-100). A definition that is factually wrong scores 0-20 on accuracy.`,
        ``,
        `Score these criteria each 0-100 (whole numbers):`,
        `- accuracy: does it convey the CORRECT meaning of "${word.english}"? (synonyms/paraphrase = high; wrong meaning = low)`,
        `- completeness: does it capture the key idea, not just a vague synonym?`,
        `- own_words: did the student paraphrase rather than copy the reference almost word-for-word? (near-copy = 0-30)`,
        ``,
        `Then reward XP (integer 1-5) from the AVERAGE of the three scores:`,
        `>=85 → 5, 70-84 → 4, 55-69 → 3, 35-54 → 2, <35 → 1.`,
        `Minimum ${cfg.minWords} words expected; much shorter answers subtract ~10 from each score.`,
        `Also give ONE concrete, specific tip (max 15 words) pointing out exactly what to improve — not generic praise.`,
        `Reply as JSON only.`,
      ].join("\n"),
      response_json_schema: {
        type: "object",
        properties: {
          accuracy: { type: "number" },
          completeness: { type: "number" },
          own_words: { type: "number" },
          xp: { type: "number" },
          tip: { type: "string" },
        },
      },
    });
    const clamp = v => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    let xp = Math.round(Number(res.xp) || 0);
    xp = Math.max(1, Math.min(5, xp));
    return {
      accuracy: clamp(res.accuracy),
      completeness: clamp(res.completeness),
      own_words: clamp(res.own_words),
      xp,
      tip: res.tip || "",
    };
  } catch {
    return { accuracy: 0, completeness: 0, own_words: 0, xp: 1, tip: "" };
  }
}

export default function DefinitionGame({ words, unitName, onBack, user, onXpEarned, onGameComplete, difficulty = "intermediate" }) {
  const { t } = useAppLang();
  const cfg = DIFF_CONFIG[difficulty] || DIFF_CONFIG.intermediate;

  const [pool, setPool] = useState([]);
  const [defs, setDefs] = useState({});
  const [loadingDefs, setLoadingDefs] = useState(true);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const [done, setDone] = useState(false);
  // Capture words once on mount so a parent re-render (e.g. XP update) does NOT
  // re-run start() and reset the in-progress round.
  const wordsRef = useRef(words);
  wordsRef.current = words;
  const startedRef = useRef(false);

  const [gateBlocked, setGateBlocked] = useState(false);

  const start = useCallback(async () => {
    const ws = wordsRef.current;
    if (!ws.length) return;
    const target = Math.min(cfg.count, ws.length);
    const picked = shuffle(ws).slice(0, target);
    setPool(picked);
    setQIndex(0);
    setAnswer("");
    setResult(null);
    setTotalXp(0);
    setDone(false);
    setGateBlocked(false);

    // Building the round's definitions is itself an AI call (one per
    // session, not per answer) — no local fallback content source exists
    // for it, so if today's allowance is already gone there's nothing
    // honest to show; block before spending anything rather than starting
    // a game that can never finish.
    if (user) {
      const gate = await checkAiGate(user.email, user.id, user.role === "admin");
      if (!gate.allowed) { setGateBlocked(true); return; }
    }

    setLoadingDefs(true);
    generateDefinitions(picked)
      .then(map => { setDefs(map); if (user) incrementAiUsage(user.email, user.id, "").catch(() => {}); })
      .finally(() => setLoadingDefs(false));
  }, [cfg.count, user]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start();
  }, [start]);

  const current = pool[qIndex];
  const currentDef = current ? defs[current.english?.toLowerCase()] : null;

  const handleSubmit = async () => {
    if (!answer.trim() || checking || !current) return;
    setChecking(true);
    if (user) {
      const gate = await checkAiGate(user.email, user.id, user.role === "admin");
      if (!gate.allowed) {
        // Don't fabricate a score/XP for an ungraded answer — same rule
        // as LessonRunner: no allowance left means this attempt just stays
        // ungraded, not silently wrong.
        setResult({ blocked: true });
        setChecking(false);
        return;
      }
    }
    const enriched = { ...current, definition: currentDef?.definition || current.description || "" };
    const res = await evaluateDefinition(answer, enriched, cfg);
    if (user) incrementAiUsage(user.email, user.id, "").catch(() => {});
    setResult(res);
    setTotalXp(c => c + res.xp);
    if (onXpEarned && user) onXpEarned(res.xp, res.xp);
    setChecking(false);
  };

  const handleNext = () => {
    if (qIndex + 1 >= pool.length) { setDone(true); return; }
    setQIndex(i => i + 1);
    setAnswer("");
    setResult(null);
  };

  // record skill progress once on completion
  useEffect(() => {
    if (!done || pool.length === 0) return;
    const max = pool.length * 5;
    const pct = max ? Math.round((totalXp / max) * 100) : 0;
    if (onGameComplete) onGameComplete({ scorePct: pct, correct: totalXp, total: max });
  }, [done]); /* eslint-disable-next-line */

  if (!words.length) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground text-sm mb-4">{t("gameui.def_no_words")}</p>
        <Button variant="outline" onClick={onBack} className="w-full">{t("gameui.back")}</Button>
      </div>
    );
  }

  if (gateBlocked) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground text-sm mb-4">{AI_LIMIT_MSG}</p>
        <Button variant="outline" onClick={onBack} className="w-full">{t("gameui.back")}</Button>
      </div>
    );
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto px-4 py-10 text-center">
        <div className="text-6xl mb-4">{totalXp >= pool.length * 4 ? "🏆" : totalXp >= pool.length * 2 ? "👍" : "📚"}</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("gameui.def_done")}</h2>
        <p className="text-muted-foreground mb-1">{unitName}</p>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-5 mb-5 mt-4 flex items-center justify-center gap-3"
        >
          <span className="text-3xl">⚡</span>
          <div>
            <p className="text-3xl font-bold text-amber-600">+{totalXp}</p>
            <p className="text-xs text-muted-foreground">{t("gameui.def_total_coins")}</p>
          </div>
        </motion.div>
        <p className="text-sm text-muted-foreground mb-6">{t("gameui.def_max_possible", { max: pool.length * 5 })}</p>
        <Button onClick={start} className="w-full mb-2">{t("gameui.retry")}</Button>
        <Button variant="outline" onClick={onBack} className="w-full">{t("gameui.back")}</Button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="text-muted-foreground text-sm hover:text-foreground flex items-center gap-1 select-none">
          <ArrowLeft className="w-4 h-4" /> {t("gameui.back")}
        </button>
        <span className="text-xs text-muted-foreground font-medium">{qIndex + 1} / {pool.length}</span>
        <span className="text-xs bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold px-2.5 py-1 rounded-full">⚡ {totalXp}</span>
      </div>

      {loadingDefs && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mb-3" />
          <p className="text-xs text-muted-foreground">{t("gameui.def_preparing")}</p>
        </div>
      )}

      {!loadingDefs && current && (
        <AnimatePresence mode="wait">
          <motion.div key={qIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
            <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-200 dark:border-rose-800 rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-rose-600" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t("gameui.def_word")}</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{current.english}</p>
              {current.uzbek && <p className="text-sm text-muted-foreground mt-1">{current.uzbek}</p>}
              {currentDef?.definition && (
                <div className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-800">
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mb-1">📖 {t("gameui.def_given")}</p>
                  <p className="text-sm text-foreground/90">{currentDef.definition}</p>
                </div>
              )}
              {currentDef?.example && (
                <p className="text-xs italic text-muted-foreground mt-2">“{currentDef.example}”</p>
              )}
            </div>

            <div className="bg-amber-500/10 border border-amber-300 dark:border-amber-700 rounded-xl p-3 mb-4">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                <Sparkles className="inline w-3.5 h-3.5 mr-1" />{t("gameui.def_task")}
              </p>
              <p className="text-xs text-foreground/80">{t("gameui.def_task_desc", { min: cfg.minWords })}</p>
            </div>

            {!result ? (
              <>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder={t("gameui.def_placeholder")}
                  className="w-full h-32 px-4 py-3 border-2 border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors resize-none mb-4"
                  disabled={checking}
                />
                <Button onClick={handleSubmit} disabled={!answer.trim() || checking} className="w-full select-none">
                  {checking ? t("gameui.checking") : t("gameui.def_submit")}
                </Button>
              </>
            ) : result.blocked ? (
              <div className="bg-background border border-border rounded-2xl p-5 mb-4 text-center">
                <p className="text-sm text-muted-foreground mb-4">{AI_LIMIT_MSG}</p>
                <Button variant="outline" onClick={onBack} className="w-full select-none">{t("gameui.back")}</Button>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-background border border-border rounded-2xl p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-foreground">
                    {result.xp >= 4 ? t("gameui.def_reward_great") : result.xp >= 2 ? t("gameui.def_reward_ok") : t("gameui.def_reward_low")}
                  </span>
                  <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-full">
                    <span className="text-lg">⚡</span>
                    <span className="text-xl font-bold text-amber-600">+{result.xp}</span>
                    <span className="text-xs text-muted-foreground">/ 5</span>
                  </motion.div>
                </div>
                <div className="space-y-2 mb-4">
                  {[
                    { label: t("gameui.def_accuracy"), val: result.accuracy },
                    { label: t("gameui.def_completeness"), val: result.completeness },
                    { label: t("gameui.def_own_words"), val: result.own_words },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{label}</span><span className="font-semibold text-foreground">{val}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} className="h-full rounded-full bg-rose-500" />
                      </div>
                    </div>
                  ))}
                </div>
                {result.tip && (
                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">💬 {result.tip}</p>
                )}
                <Button onClick={handleNext} className="w-full mt-4 select-none">
                  {qIndex + 1 >= pool.length ? t("gameui.finish") : t("gameui.next_question")}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}