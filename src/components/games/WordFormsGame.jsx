import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, Star, Flame, Target, Loader2, BookOpen, Trophy, RotateCcw, ArrowRight, Check, X, HelpCircle } from "lucide-react";
import { shuffle, pickN } from "@/lib/vocabGameUtils";
import { SKILLS } from "@/lib/gameSkills";
import { computeRoundXp, recordRoundReward, generateRoundId, roundPassed } from "@/lib/gameScoring";
import { logWordAttempts } from "@/lib/roundComposition";
import { useWordFormsCopy } from "@/components/games/wordFormsCopy";
import {
  WORD_FAMILY_BANK, PREFIX_BANK, SUFFIX_BANK, ROOT_BANK,
  PREFIXES, SUFFIXES,
} from "@/lib/wordFormsBank";

// ---------------------------------------------------------------------------
// Word Forms — rebuilt 2026-09-07 to the five-layer standard.
//
// THE PROBLEMS:
// 1. Four labels (Word Family Builder, Prefix Match, Suffix Builder, Root
//    Hunt) all pointed at the same `game: "wordforms"` key via gen() — one
//    component, one mechanic (type the requested form). Same fake-duplicate
//    situation as Spelling.
// 2. The old engine called InvokeLLM on EVERY round start to generate
//    noun/verb/adjective/adverb forms — a live per-play AI cost for content
//    that should be authored once. This rebuild eliminates that call
//    entirely by using hand-authored banks (wordFormsBank.js), same pattern
//    as OddOneOutGame's fixed bank.
//
// THE FOUR MECHANICS (all genuinely different):
//   word_family (Easy): given a base word, fill a 4-row table (noun/verb/
//     adjective/adverb) by picking the correct form from MCQ options.
//     Complete-the-table, not one-form-at-a-time.
//   prefix_match (Medium): given a base word + target meaning, pick the
//     correct prefix from 6 options (un-/re-/dis-/mis-/pre-/non-).
//   suffix_builder (Hard): given a base word + target POS, pick the
//     correct suffix from 6 options (-tion/-ness/-ful/-ly/-able/-er).
//   root_hunt (Medium): given a root + meaning, tap all words in a set of
//     6 that share that root (4 correct + 2 distractors). Recognition/
//     grouping, not production.
//
// No InvokeLLM. No VocabularyWord dependency. Fixed curated banks, same
// as OddOneOutGame / GrammarQuizGame.
//
// SHARED INFRASTRUCTURE FLOOR:
// 1. gameScoring.js — computeRoundXp / recordRoundReward / roundPassed
// 2. Attempt budget shown live (scaled by picks-per-item per mode)
// 3. logWordAttempts (both signals — wrong picks are unambiguous)
// 4. Provenance badges: skipped — fixed bank, no personalization signals
// 5. premium-mesh / premium-card / neo-pill, accent #3E9E92 (grammar skill
//    per GAME_SKILL_MAP — intentional cross-cut, keep it)
// 6. wordFormsCopy.js — full en/uz/ru
// 7. Mini blitz lesson — 2 screens per mode, shown once, re-viewable via "?"
// ---------------------------------------------------------------------------

const GAME = "wordforms";
const ACCENT = SKILLS.find((s) => s.key === "grammar")?.color || "#3E9E92";

const MODE_CONFIG = {
  word_family:    { items: { beginner: 3, intermediate: 4, advanced: 5, proficient: 6 },   picksPerItem: 4, bank: WORD_FAMILY_BANK },
  prefix_match:   { items: { beginner: 4, intermediate: 6, advanced: 8, proficient: 10 },  picksPerItem: 1, bank: PREFIX_BANK },
  suffix_builder: { items: { beginner: 4, intermediate: 6, advanced: 8, proficient: 10 },  picksPerItem: 1, bank: SUFFIX_BANK },
  root_hunt:      { items: { beginner: 3, intermediate: 5, advanced: 6, proficient: 8 },    picksPerItem: 2, bank: ROOT_BANK },
};

const ATTEMPTS_MULTIPLIER = 1.5;
const CORRECT_MS = 600;
const MISS_MS = 520;
const BLITZ_KEY = "vm_wordforms_blitz_seen";

const FORM_LABELS = ["noun", "verb", "adjective", "adverb"];

// Build MCQ options for word_family: correct + 3 distractors from other entries
function buildFamilyOptions(entry, bank) {
  const others = bank.filter((e) => e.base !== entry.base);
  const opts = {};
  for (const form of FORM_LABELS) {
    const correct = entry[form];
    const distractors = shuffle(others).slice(0, 3).map((e) => e[form]).filter((d) => d !== correct);
    while (distractors.length < 3) {
      const rand = others[Math.floor(Math.random() * others.length)];
      if (rand && rand[form] !== correct && !distractors.includes(rand[form])) distractors.push(rand[form]);
    }
    opts[form] = shuffle([correct, ...distractors]);
  }
  return opts;
}

// Build root_hunt question: 4 members + 2 distractors from other groups
function buildRootQuestion(group, allGroups) {
  const otherWords = allGroups.filter((g) => g.root !== group.root).flatMap((g) => g.members);
  const distractors = shuffle(otherWords).slice(0, 2);
  return shuffle([...group.members, ...distractors]);
}

export default function WordFormsGame({ bank: mode = "word_family", user, level, difficulty = "intermediate", onBack, onXpEarned, onGameComplete }) {
  const { c, t } = useWordFormsCopy();
  const rm = useReducedMotion();
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.word_family;
  const itemCount = cfg.items[difficulty] || cfg.items.intermediate;

  const [sessionXp, setSessionXp] = useState(0);
  const [phase, setPhase] = useState("loading");
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [ruledOut, setRuledOut] = useState([]); // ruled-out option strings
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [tries, setTries] = useState(0);
  const [budget, setBudget] = useState(0);
  const [summary, setSummary] = useState(null);
  const [flyups, setFlyups] = useState([]);
  const [showBlitz, setShowBlitz] = useState(false);

  // word_family state: track which forms are correctly filled
  const [wfFilled, setWfFilled] = useState({}); // {noun: "happiness", verb: "beautify", ...}
  // root_hunt state: track which words have been tapped
  const [rhTapped, setRhTapped] = useState(new Set());

  const roundId = useRef(null);
  const roundItems = useRef([]);
  const firstTry = useRef(new Set());
  const missedOnce = useRef(new Set());
  const triesRef = useRef(0);
  const budgetRef = useRef(0);
  const streakBestRef = useRef(0);
  const idxRef = useRef(0);
  const finishing = useRef(false);
  const busy = useRef(false);

  const titleKey = `title_${mode}`;

  // Blitz lesson: show once per mode
  useEffect(() => {
    try {
      const seen = JSON.parse(localStorage.getItem(BLITZ_KEY) || "{}");
      if (!seen[mode]) { setShowBlitz(true); seen[mode] = true; localStorage.setItem(BLITZ_KEY, JSON.stringify(seen)); }
    } catch { /* ignore */ }
  }, [mode]);

  const startRound = useCallback((startStreak) => {
    setPhase("loading");
    finishing.current = false;
    busy.current = false;
    roundId.current = generateRoundId();
    firstTry.current = new Set();
    missedOnce.current = new Set();

    const bank = cfg.bank;
    let built = [];

    if (mode === "word_family") {
      const picks = pickN(bank, Math.min(itemCount, bank.length));
      built = picks.map((entry, i) => ({
        id: `${entry.base}-${i}`,
        word: entry.base,
        forms: { noun: entry.noun, verb: entry.verb, adjective: entry.adjective, adverb: entry.adverb },
        options: buildFamilyOptions(entry, bank),
      }));
    } else if (mode === "prefix_match") {
      const picks = pickN(bank, Math.min(itemCount, bank.length));
      built = picks.map((entry, i) => ({
        id: `${entry.base}-${i}`,
        word: entry.base,
        correct: entry.prefix,
        meaning: entry.meaning,
        result: entry.result,
        options: PREFIXES,
      }));
    } else if (mode === "suffix_builder") {
      const picks = pickN(bank, Math.min(itemCount, bank.length));
      built = picks.map((entry, i) => ({
        id: `${entry.base}-${i}`,
        word: entry.base,
        correct: entry.suffix,
        pos: entry.pos,
        meaning: entry.meaning,
        result: entry.result,
        options: SUFFIXES,
      }));
    } else if (mode === "root_hunt") {
      const picks = pickN(bank, Math.min(itemCount, bank.length));
      built = picks.map((group, i) => ({
        id: `${group.root}-${i}`,
        word: group.root,
        root: group.root,
        rootMeaning: group.meaning,
        correct: new Set(group.members),
        words: buildRootQuestion(group, bank),
      }));
    }

    if (built.length === 0) { setPhase("empty"); return; }

    roundItems.current = built;
    budgetRef.current = Math.max(built.length, Math.round(built.length * cfg.picksPerItem * ATTEMPTS_MULTIPLIER));
    triesRef.current = 0;
    streakBestRef.current = startStreak;
    idxRef.current = 0;

    setQuestions(built);
    setIdx(0);
    setRuledOut([]);
    setRevealed(false);
    setFeedback(null);
    setFirstTryCount(0);
    setStreak(startStreak);
    setStreakBest(startStreak);
    setTries(0);
    setBudget(budgetRef.current);
    setSummary(null);
    setFlyups([]);
    setWfFilled({});
    setRhTapped(new Set());
    setPhase("playing");
  }, [cfg, itemCount, mode]);

  useEffect(() => { startRound(0); }, [startRound]);

  const finishRound = useCallback((reason) => {
    if (finishing.current || !roundItems.current.length) return;
    finishing.current = true;
    const items = roundItems.current;
    const itemsTotal = items.length;
    const itemsCorrect = firstTry.current.size;
    const finalStreakBest = streakBestRef.current;
    const usedTries = triesRef.current;

    const { amount, streakBonus } = computeRoundXp({ itemsCorrect, streakBest: finalStreakBest });
    recordRoundReward({ userEmail: user?.email, game: GAME, roundId: roundId.current, itemsTotal, itemsCorrect, streakBest: finalStreakBest, hintMultiplier: 1, level });
    logWordAttempts({
      userEmail: user?.email,
      game: GAME,
      level,
      roundId: roundId.current,
      items: items.map((it) => ({ word: it.word, correct: firstTry.current.has(it.word) })),
    });

    const scorePct = Math.round((itemsCorrect / itemsTotal) * 100);
    onXpEarned?.(amount, itemsCorrect);
    onGameComplete?.({ scorePct, correct: itemsCorrect, total: itemsTotal });
    setSessionXp((v) => v + amount);
    setSummary({
      passed: roundPassed(itemsCorrect, itemsTotal),
      reason,
      firstTry: [...firstTry.current],
      tries: usedTries,
      budget: budgetRef.current,
      accuracyPct: usedTries ? Math.round((itemsCorrect / usedTries) * 100) : 0,
      streakBest: finalStreakBest,
      amount,
      streakBonus,
      itemsCorrect,
      itemsTotal,
    });
    setPhase("result");
  }, [user?.email, level, onXpEarned, onGameComplete]);

  const advance = useCallback(() => {
    const next = idxRef.current + 1;
    if (next >= roundItems.current.length) { finishRound("clear"); return; }
    idxRef.current = next;
    setIdx(next);
    setRuledOut([]);
    setRevealed(false);
    setFeedback(null);
    setWfFilled({});
    setRhTapped(new Set());
    if (triesRef.current >= budgetRef.current) finishRound("budget");
  }, [finishRound]);

  // ---- word_family: pick a form option ----
  const handleFamilyPick = (form, opt) => {
    const q = roundItems.current[idxRef.current];
    if (phase !== "playing" || busy.current || !q || revealed) return;
    if (wfFilled[form]) return; // already filled
    busy.current = true;

    if (opt === q.forms[form]) {
      // Correct pick for this form
      const filled = { ...wfFilled, [form]: opt };
      setWfFilled(filled);
      setFeedback("correct");
      setTimeout(() => { busy.current = false; if (finishing.current) return; setFeedback(null); }, 300);

      // Check if all 4 forms are filled
      if (FORM_LABELS.every((f) => filled[f])) {
        const clean = !missedOnce.current.has(q.word);
        if (clean) {
          firstTry.current.add(q.word);
          setFirstTryCount(firstTry.current.size);
          const s = streak + 1;
          streakBestRef.current = Math.max(streakBestRef.current, s);
          setStreak(s);
          setStreakBest(streakBestRef.current);
          const fid = `${roundId.current}-${q.id}`;
          setFlyups((f) => [...f, { id: fid, amount: computeRoundXp({ itemsCorrect: 1 }).amount }]);
          setTimeout(() => setFlyups((f) => f.filter((x) => x.id !== fid)), 900);
        }
        setRevealed(true);
        setTimeout(() => { if (finishing.current) return; advance(); }, CORRECT_MS);
      }
    } else {
      // Wrong pick
      triesRef.current += 1;
      setTries(triesRef.current);
      missedOnce.current.add(q.word);
      setStreak(0);
      setRuledOut((r) => [...r, opt]);
      setFeedback("miss");
      setTimeout(() => { busy.current = false; if (finishing.current) return; setFeedback(null); if (triesRef.current >= budgetRef.current) finishRound("budget"); }, MISS_MS);
    }
  };

  // ---- prefix_match / suffix_builder: pick one option ----
  const handleSinglePick = (opt) => {
    const q = roundItems.current[idxRef.current];
    if (phase !== "playing" || busy.current || !q || revealed) return;
    busy.current = true;
    triesRef.current += 1;
    setTries(triesRef.current);

    if (opt === q.correct) {
      const clean = !missedOnce.current.has(q.word);
      if (clean) {
        firstTry.current.add(q.word);
        setFirstTryCount(firstTry.current.size);
        const s = streak + 1;
        streakBestRef.current = Math.max(streakBestRef.current, s);
        setStreak(s);
        setStreakBest(streakBestRef.current);
        const fid = `${roundId.current}-${q.id}`;
        setFlyups((f) => [...f, { id: fid, amount: computeRoundXp({ itemsCorrect: 1 }).amount }]);
        setTimeout(() => setFlyups((f) => f.filter((x) => x.id !== fid)), 900);
      }
      setRevealed(true);
      setFeedback("correct");
      setTimeout(() => { busy.current = false; if (finishing.current) return; advance(); }, CORRECT_MS);
    } else {
      missedOnce.current.add(q.word);
      setStreak(0);
      setRuledOut((r) => [...r, opt]);
      setFeedback("miss");
      setTimeout(() => {
        busy.current = false;
        if (finishing.current) return;
        setFeedback(null);
        if (triesRef.current >= budgetRef.current) finishRound("budget");
      }, MISS_MS);
    }
  };

  // ---- root_hunt: tap a word ----
  const handleRootTap = (word) => {
    const q = roundItems.current[idxRef.current];
    if (phase !== "playing" || busy.current || !q || revealed) return;
    if (rhTapped.has(word)) return; // already tapped
    busy.current = true;

    if (q.correct.has(word)) {
      // Correct tap
      const tapped = new Set(rhTapped);
      tapped.add(word);
      setRhTapped(tapped);
      setFeedback("correct");
      setTimeout(() => { busy.current = false; if (finishing.current) return; setFeedback(null); }, 250);

      // Check if all correct words are tapped
      if ([...q.correct].every((w) => tapped.has(w))) {
        const clean = !missedOnce.current.has(q.word);
        if (clean) {
          firstTry.current.add(q.word);
          setFirstTryCount(firstTry.current.size);
          const s = streak + 1;
          streakBestRef.current = Math.max(streakBestRef.current, s);
          setStreak(s);
          setStreakBest(streakBestRef.current);
          const fid = `${roundId.current}-${q.id}`;
          setFlyups((f) => [...f, { id: fid, amount: computeRoundXp({ itemsCorrect: 1 }).amount }]);
          setTimeout(() => setFlyups((f) => f.filter((x) => x.id !== fid)), 900);
        }
        setRevealed(true);
        setTimeout(() => { if (finishing.current) return; advance(); }, CORRECT_MS);
      }
    } else {
      // Wrong tap
      triesRef.current += 1;
      setTries(triesRef.current);
      missedOnce.current.add(q.word);
      setStreak(0);
      setRuledOut((r) => [...r, word]);
      setFeedback("miss");
      setTimeout(() => {
        busy.current = false;
        if (finishing.current) return;
        setFeedback(null);
        if (triesRef.current >= budgetRef.current) finishRound("budget");
      }, MISS_MS);
    }
  };

  const handlePick = (opt, form) => {
    if (mode === "word_family") handleFamilyPick(form, opt);
    else if (mode === "root_hunt") handleRootTap(opt);
    else handleSinglePick(opt);
  };

  // ---- Blitz lesson ----
  const blitzScreens = useMemo(() => {
    const prefix = mode === "word_family" ? "wf" : mode === "prefix_match" ? "pm" : mode === "suffix_builder" ? "sb" : "rh";
    return [c(`${prefix}_blitz_1`), c(`${prefix}_blitz_2`)];
  }, [mode, c]);
  const [blitzIdx, setBlitzIdx] = useState(0);

  // ---- Derived ----
  const playing = phase === "playing";
  const q = questions[idx];
  const liveXp = sessionXp + (playing ? computeRoundXp({ itemsCorrect: firstTryCount, streakBest }).amount : 0);
  const progress = questions.length ? idx / questions.length : 0;
  const triesLeft = Math.max(0, budget - tries);
  const instructionKey = `${mode === "word_family" ? "wf" : mode === "prefix_match" ? "pm" : mode === "suffix_builder" ? "sb" : "rh"}_instruction`;

  if (showBlitz) {
    const isLast = blitzIdx >= blitzScreens.length - 1;
    return (
      <div className="min-h-screen bg-background premium-mesh flex flex-col items-center justify-center px-4">
        <motion.div initial={rm ? false : { opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="premium-card p-6 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${ACCENT}22`, border: `1px solid ${ACCENT}44` }}>
            <HelpCircle className="w-7 h-7" style={{ color: ACCENT }} aria-hidden="true" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>{c(titleKey)}</p>
          <p className="text-base text-foreground leading-relaxed mb-6">{blitzScreens[blitzIdx]}</p>
          <div className="flex gap-2">
            <button onClick={() => setShowBlitz(false)} className="flex-1 h-11 rounded-xl border border-white/15 bg-white/[0.04] text-foreground text-sm font-semibold select-none">{c("blitz_skip")}</button>
            <button onClick={() => { if (isLast) setShowBlitz(false); else setBlitzIdx((i) => i + 1); }} className="flex-1 h-11 rounded-xl text-white font-semibold select-none" style={{ background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)` }}>{isLast ? c("blitz_start") : c("blitz_next")}</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background premium-mesh flex flex-col">
      {/* HUD */}
      <header className="bg-background/70 backdrop-blur-xl border-b border-white/10 px-3 py-2 flex items-center justify-between safe-header gap-2">
        <button onClick={onBack} className="min-h-[44px] min-w-[44px] flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none px-1">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t("gameui.back")}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold truncate" style={{ color: ACCENT }}>{c(titleKey)}</span>
          <button onClick={() => setShowBlitz(true)} className="min-h-[28px] min-w-[28px] flex items-center justify-center text-muted-foreground hover:text-foreground select-none">
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold select-none">
          {playing && budget > 0 && (
            <span className={`neo-pill px-2.5 h-8 ${triesLeft <= Math.ceil(budget * 0.25) ? "text-destructive" : "text-muted-foreground"}`} aria-label={c("attempts")}>
              <Target className="w-3.5 h-3.5" aria-hidden="true" /> {triesLeft}
            </span>
          )}
          <span className="neo-pill px-2.5 h-8 text-amber-300" aria-label={c("xp")}>
            <Star className="w-3.5 h-3.5" aria-hidden="true" /> {liveXp}
          </span>
          <span className={`neo-pill px-2.5 h-8 ${streak > 0 ? "text-orange-300" : "text-muted-foreground"}`} aria-label={c("streak")}>
            <Flame className="w-3.5 h-3.5" aria-hidden="true" /> {streak}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-white/5" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="h-full" style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}aa)` }} animate={{ width: `${progress * 100}%` }} transition={{ duration: rm ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      </div>

      <div className="flex-1 flex flex-col px-3 py-4 max-w-2xl mx-auto w-full relative">
        {/* XP flyups */}
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center z-20" aria-live="polite">
          <AnimatePresence>
            {flyups.map((f) => (
              <motion.span key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: -18 }} exit={{ opacity: 0, y: -40 }} transition={{ duration: rm ? 0.1 : 0.8, ease: "easeOut" }} className="absolute text-sm font-bold text-amber-300 drop-shadow">
                +{f.amount} {c("xp")}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        {phase === "empty" && (
          <div className="premium-card flex-1 flex flex-col items-center justify-center text-center p-8">
            <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" aria-hidden="true" />
            <p className="text-sm text-muted-foreground mb-5">{c("empty")}</p>
            <button onClick={onBack} className="h-12 px-6 rounded-xl text-white font-semibold select-none" style={{ background: ACCENT }}>{t("nav.skill_hub")}</button>
          </div>
        )}

        {phase === "loading" && (
          <div className="premium-card flex-1 flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: ACCENT }} aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{c("loading")}</p>
          </div>
        )}

        {playing && q && (
          <>
            <div className="flex items-center justify-between gap-2 mb-3 text-[11px] text-muted-foreground">
              <span>{c("question", { n: idx + 1, total: questions.length })} · {c("item_progress", { n: firstTryCount, total: questions.length })}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center mb-3">{c(instructionKey)}</p>

            <AnimatePresence mode="wait">
              <motion.div key={q.id} initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={rm ? undefined : { opacity: 0, y: -12 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>

                {/* === word_family mode === */}
                {mode === "word_family" && (
                  <div>
                    <div className="premium-card px-4 py-5 text-center mb-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{t("gameui.wordforms_base_word")}</p>
                      <p className="text-3xl font-bold text-foreground">{q.word}</p>
                    </div>
                    {FORM_LABELS.map((form) => {
                      const filled = wfFilled[form];
                      const label = c(`wf_${form}`);
                      return (
                        <div key={form} className="mb-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {q.options[form].map((opt, i) => {
                              const out = ruledOut.includes(opt) && !filled;
                              const isFilled = filled === opt;
                              return (
                                <button
                                  key={`${opt}-${i}`}
                                  onClick={() => handlePick(opt, form)}
                                  disabled={!!filled || out || revealed}
                                  className={`min-h-[44px] px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors select-none ${
                                    isFilled ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                                    : out ? "border-rose-400/40 bg-rose-500/5 text-rose-300/70 line-through"
                                    : "border-white/10 bg-white/[0.04] text-foreground hover:border-white/25"
                                  }`}
                                >
                                  {opt}
                                  {isFilled && <Check className="w-3.5 h-3.5 inline ml-1 text-emerald-400" aria-hidden="true" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* === prefix_match mode === */}
                {mode === "prefix_match" && (
                  <div>
                    <div className="premium-card px-4 py-5 text-center mb-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{t("gameui.wordforms_base_word")}</p>
                      <p className="text-3xl font-bold text-foreground mb-2">{q.word}</p>
                      <p className="text-sm text-muted-foreground">{c("pm_target")}: <span className="font-semibold text-foreground">{q.meaning}</span></p>
                      {revealed && <p className="text-lg font-bold mt-2" style={{ color: ACCENT }}>{q.result}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {q.options.map((opt, i) => {
                        const out = ruledOut.includes(opt);
                        const isCorrect = revealed && opt === q.correct;
                        return (
                          <button
                            key={`${opt}-${i}`}
                            onClick={() => handlePick(opt)}
                            disabled={out || revealed}
                            className={`min-h-[48px] px-2 py-3 rounded-xl border text-sm font-bold transition-colors select-none ${
                              isCorrect ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                              : out ? "border-rose-400/40 bg-rose-500/5 text-rose-300/70 line-through"
                              : "border-white/10 bg-white/[0.04] text-foreground hover:border-white/25"
                            }`}
                          >
                            {opt}
                            {isCorrect && <Check className="w-3.5 h-3.5 inline ml-1 text-emerald-400" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* === suffix_builder mode === */}
                {mode === "suffix_builder" && (
                  <div>
                    <div className="premium-card px-4 py-5 text-center mb-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{t("gameui.wordforms_base_word")}</p>
                      <p className="text-3xl font-bold text-foreground mb-2">{q.word}</p>
                      <p className="text-sm text-muted-foreground">{c("sb_target")}: <span className="font-semibold text-foreground">{q.pos}</span></p>
                      <p className="text-xs text-muted-foreground mt-1">{q.meaning}</p>
                      {revealed && <p className="text-lg font-bold mt-2" style={{ color: ACCENT }}>{q.result}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {q.options.map((opt, i) => {
                        const out = ruledOut.includes(opt);
                        const isCorrect = revealed && opt === q.correct;
                        return (
                          <button
                            key={`${opt}-${i}`}
                            onClick={() => handlePick(opt)}
                            disabled={out || revealed}
                            className={`min-h-[48px] px-2 py-3 rounded-xl border text-sm font-bold transition-colors select-none ${
                              isCorrect ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                              : out ? "border-rose-400/40 bg-rose-500/5 text-rose-300/70 line-through"
                              : "border-white/10 bg-white/[0.04] text-foreground hover:border-white/25"
                            }`}
                          >
                            {opt}
                            {isCorrect && <Check className="w-3.5 h-3.5 inline ml-1 text-emerald-400" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* === root_hunt mode === */}
                {mode === "root_hunt" && (
                  <div>
                    <div className="premium-card px-4 py-5 text-center mb-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{c("rh_root")}</p>
                      <p className="text-3xl font-bold text-foreground">-{q.root}-</p>
                      <p className="text-sm text-muted-foreground mt-1">{c("rh_meaning")}: {q.rootMeaning}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {q.words.map((word, i) => {
                        const tapped = rhTapped.has(word);
                        const out = ruledOut.includes(word);
                        const isCorrect = revealed && q.correct.has(word);
                        const isWrong = revealed && !q.correct.has(word) && !out;
                        return (
                          <button
                            key={`${word}-${i}`}
                            onClick={() => handlePick(word)}
                            disabled={tapped || out || revealed}
                            className={`min-h-[56px] px-3 py-3 rounded-xl border text-sm font-semibold transition-colors select-none ${
                              isCorrect || tapped ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                              : isWrong ? "border-rose-400/40 bg-rose-500/5 text-rose-300/70"
                              : out ? "border-rose-400/40 bg-rose-500/5 text-rose-300/70 line-through"
                              : "border-white/10 bg-white/[0.04] text-foreground hover:border-white/25"
                            }`}
                          >
                            {word}
                            {(tapped || isCorrect) && <Check className="w-3.5 h-3.5 inline ml-1 text-emerald-400" aria-hidden="true" />}
                            {out && <X className="w-3.5 h-3.5 inline ml-1 text-rose-400" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Feedback */}
                <div className="h-8 mt-3 flex items-center justify-center" aria-live="polite">
                  <AnimatePresence mode="wait">
                    {feedback && (
                      <motion.span key={feedback + idx + ruledOut.length} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: rm ? 0 : 0.2 }} className={`flex items-center gap-1.5 text-sm font-semibold ${feedback === "correct" ? "text-emerald-400" : "text-rose-400"}`}>
                        {feedback === "correct" ? <Check className="w-4 h-4" aria-hidden="true" /> : <X className="w-4 h-4" aria-hidden="true" />}
                        {feedback === "correct" ? c("correct") : c("miss")}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </AnimatePresence>
          </>
        )}

        {phase === "result" && summary && (
          <div className="flex-1 flex items-center">
            <motion.div initial={rm ? false : { opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="premium-card p-5 w-full max-w-sm mx-auto">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${summary.passed ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
                <Trophy className={`w-8 h-8 ${summary.passed ? "text-emerald-400" : "text-amber-400"}`} aria-hidden="true" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-center mb-1" style={{ color: ACCENT }}>
                {summary.reason === "budget" ? c("result_out_of_attempts") : c("result_title")}
              </p>
              <h2 className="text-xl font-bold text-foreground text-center flex items-center justify-center gap-1.5">
                {summary.passed ? <Check className="w-5 h-5 text-emerald-400" aria-hidden="true" /> : <X className="w-5 h-5 text-amber-400" aria-hidden="true" />}
                {summary.passed ? c("result_pass") : c("result_fail")}
              </h2>
              <p className="text-3xl font-bold text-center mt-2 text-amber-300">+{summary.amount} {c("xp")}</p>
              {summary.streakBonus > 0 && (
                <p className="text-[11px] text-muted-foreground text-center mt-0.5">{c("streak_bonus", { n: summary.streakBonus })}</p>
              )}

              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-foreground leading-none">{summary.itemsCorrect}/{summary.itemsTotal}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{c("first_try")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-foreground leading-none">{summary.tries}/{summary.budget}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{c("tries_used")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-foreground leading-none">{summary.accuracyPct}%</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{c("accuracy")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-foreground leading-none">{summary.streakBest}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{c("best_streak")}</p>
                </div>
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-1.5">{c("words_this_round")}</p>
              <ul className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {roundItems.current.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className={`font-semibold truncate ${firstTry.current.has(it.word) ? "text-foreground" : "text-muted-foreground"}`}>{it.word}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[45%]">
                      {mode === "prefix_match" && it.result}
                      {mode === "suffix_builder" && it.result}
                      {mode === "root_hunt" && it.rootMeaning}
                      {mode === "word_family" && it.forms?.noun}
                    </span>
                  </li>
                ))}
              </ul>

              <button onClick={() => startRound(streak)} className="mt-4 w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg select-none" style={{ background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)` }}>
                {c("keep_going")} <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setSessionXp(0); startRound(0); }} className="flex-1 h-11 rounded-xl border border-white/15 bg-white/[0.04] text-foreground text-sm font-semibold flex items-center justify-center gap-1.5 select-none">
                  <RotateCcw className="w-4 h-4" aria-hidden="true" /> {c("play_again")}
                </button>
                <button onClick={onBack} className="flex-1 h-11 rounded-xl border border-white/15 bg-white/[0.04] text-foreground text-sm font-semibold flex items-center justify-center gap-1.5 select-none">
                  <BookOpen className="w-4 h-4" aria-hidden="true" /> {t("nav.skill_hub")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}