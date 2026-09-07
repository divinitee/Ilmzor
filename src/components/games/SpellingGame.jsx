import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, Star, Flame, Target, Loader2, BookOpen, Trophy, RotateCcw, ArrowRight, Check, X, Volume2, Eraser, HelpCircle } from "lucide-react";
import { usableWords, shuffle } from "@/lib/vocabGameUtils";
import { meaningInLang } from "@/lib/vocabGameUtils";
import { SKILLS } from "@/lib/gameSkills";
import { hintXpMultiplier } from "@/lib/levels";
import { computeRoundXp, recordRoundReward, generateRoundId, roundPassed } from "@/lib/gameScoring";
import { buildPersonalizedRound, logWordAttempts, PROVENANCE } from "@/lib/roundComposition";
import { useSpellingCopy } from "@/components/games/spellingCopy";

// ---------------------------------------------------------------------------
// Spelling — rebuilt 2026-09-07 to the five-layer standard.
//
// THE PROBLEM: three labels (Typing, Letter Order, Missing Letters) all
// pointed at the same `game: "spelling"` key with zero distinction — one
// component, one mechanic (hear → unscramble tiles). SkillHub routes purely
// on `game`, never on `name`, so clicking any of the three rendered the
// literal same experience.
//
// THE FIX: same shape as GrammarQuizGame — a `bank` field on each
// skillTreeData entry, and this engine branches on it. One file, one
// component, three genuinely distinct mechanics forming a real difficulty
// ladder:
//
//   missing_letters (lightest): word shown with 1-2 letters blanked, student
//     fills just the gaps. Most of the word is already visible.
//   letter_order (medium): today's existing mechanic — hear the word,
//     unscramble shuffled letter tiles into the correct slots. Kept as-is,
//     just brought to the shared standard.
//   typing (hardest): no letters shown at all. Word is spoken + meaning
//     shown as support, student types the whole word from memory. Pure
//     production recall, no scaffolding.
//
// No new content dependency — all three modes work off the same VocabularyWord
// `english` + `uzbek`/`russian`/`english_definition` fields that already exist.
//
// SHARED INFRASTRUCTURE FLOOR (same as every rebuilt game):
// 1. gameScoring.js — computeRoundXp / recordRoundReward / roundPassed
// 2. Attempt budget shown live (ATTEMPTS_PER_ITEM multiplier)
// 3. buildPersonalizedRound + logWordAttempts (both signals — a wrong
//    spelling is an unambiguous miss)
// 4. Provenance badges (three-state: saved / wrong / fresh)
// 5. premium-mesh / premium-card / neo-pill shell, accent #B08D57 (spelling
//    skill per GAME_SKILL_MAP — not vocabulary's purple, even though this
//    lives under the Vocabulary tab; the skill mapping is cross-cutting)
// 6. spellingCopy.js — full en/uz/ru
// 7. Mini blitz lesson — 1-2 screens per mode, shown once before first play
//
// FAILABILITY: each word gets one attempt. A wrong attempt costs a try from
// the budget; the correct spelling is revealed and the student moves on.
// itemsCorrect counts first-try words only.
// ---------------------------------------------------------------------------

const GAME = "spelling";
const ACCENT = SKILLS.find((s) => s.key === "spelling")?.color || "#B08D57";

const TIER = {
  beginner: { items: 6, minLen: 3, maxLen: 6 },
  intermediate: { items: 8, minLen: 4, maxLen: 9 },
  advanced: { items: 10, minLen: 5, maxLen: 12 },
  proficient: { items: 12, minLen: 6, maxLen: 14 },
};
const MIN_POOL = 6;
const ATTEMPTS_PER_ITEM = 1.5;
const REVEAL_MS = 1100;

// How many letters to blank in missing_letters mode, scaled by difficulty.
// 1 gap at beginner, up to 3 at proficient. Never more than half the word.
const GAPS_FOR_DIFF = { beginner: 1, intermediate: 2, advanced: 2, proficient: 3 };

const BLITZ_KEY = "vm_spelling_blitz_seen";

export default function SpellingGame({ words = [], level, difficulty = "intermediate", bank = "letter_order", user, onBack, onXpEarned, onGameComplete }) {
  const { c, t, lang } = useSpellingCopy();
  const rm = useReducedMotion();
  const tier = TIER[difficulty] || TIER.intermediate;
  const mode = bank; // "missing_letters" | "letter_order" | "typing"

  // Pool: words in the student's band, filtered to length range for this tier.
  const pool = useMemo(() => {
    const usable = usableWords(words).filter((w) => {
      const len = (w.english || "").replace(/[^a-zA-Z]/g, "").length;
      return len >= tier.minLen && len <= tier.maxLen;
    });
    return usable.length >= MIN_POOL ? usable : usableWords(words);
  }, [words, tier]);

  const [sessionXp, setSessionXp] = useState(0);
  const [phase, setPhase] = useState(pool.length < MIN_POOL ? "empty" : "loading");
  const [round, setRound] = useState([]);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState(null); // "correct" | "wrong" | null
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [tries, setTries] = useState(0);
  const [budget, setBudget] = useState(0);
  const [summary, setSummary] = useState(null);
  const [flyups, setFlyups] = useState([]);
  const [showBlitz, setShowBlitz] = useState(false);

  // mode-specific state
  const [letters, setLetters] = useState([]); // letter_order: shuffled tiles
  const [placed, setPlaced] = useState([]); // letter_order: placed chars
  const [gaps, setGaps] = useState([]); // missing_letters: indices of blanked positions
  const [gapInput, setGapInput] = useState({}); // missing_letters: {pos: char}
  const [typed, setTyped] = useState(""); // typing: raw input

  const roundId = useRef(null);
  const roundItems = useRef([]);
  const firstTry = useRef(new Set());
  const missedOnce = useRef(new Set());
  const triesRef = useRef(0);
  const budgetRef = useRef(0);
  const streakBestRef = useRef(0);
  const idxRef = useRef(0);
  const finishing = useRef(false);

  // Translation reveal (available at all levels for spelling — the meaning
  // is shown as support, not as the answer). Always framed as a bonus for
  // going English-only.
  const baseMultiplier = hintXpMultiplier(level);
  const [showMeaning, setShowMeaning] = useState(false);
  const helpUsed = useRef(false);
  const currentMultiplier = () => (helpUsed.current ? baseMultiplier : 1);

  const speak = useCallback((text) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }, []);

  // Blitz lesson: show once per mode, then never again (re-viewable via "?")
  useEffect(() => {
    try {
      const seen = JSON.parse(localStorage.getItem(BLITZ_KEY) || "{}");
      if (!seen[mode]) {
        setShowBlitz(true);
        seen[mode] = true;
        localStorage.setItem(BLITZ_KEY, JSON.stringify(seen));
      }
    } catch { /* ignore */ }
  }, [mode]);

  const startRound = useCallback(async (startStreak) => {
    if (pool.length < MIN_POOL) { setPhase("empty"); return; }
    setPhase("loading");
    finishing.current = false;
    roundId.current = generateRoundId();
    firstTry.current = new Set();
    missedOnce.current = new Set();

    const chosen = await buildPersonalizedRound({ words: pool, userEmail: user?.email, count: tier.items });
    roundItems.current = chosen;
    budgetRef.current = Math.max(chosen.length, Math.round(chosen.length * ATTEMPTS_PER_ITEM));
    triesRef.current = 0;
    streakBestRef.current = startStreak;
    idxRef.current = 0;

    setRound(chosen);
    setIdx(0);
    setStatus(null);
    setFirstTryCount(0);
    setStreak(startStreak);
    setStreakBest(startStreak);
    setTries(0);
    setBudget(budgetRef.current);
    setSummary(null);
    setFlyups([]);
    setShowMeaning(false);
    helpUsed.current = false;
    setPhase(chosen.length >= 2 ? "playing" : "empty");
    loadWord(chosen[0]);
  }, [pool, tier.items, user?.email, level, mode, speak]);

  useEffect(() => { startRound(0); }, [startRound]);
  useEffect(() => () => { try { window.speechSynthesis.cancel(); } catch { /* */ } }, []);

  function loadWord(word) {
    if (!word) { setPhase("empty"); return; }
    const clean = (word.english || "").replace(/[^a-zA-Z]/g, "").toLowerCase();

    if (mode === "letter_order") {
      setLetters(shuffle(clean.split("")).map((ch) => ({ char: ch, used: false })));
      setPlaced([]);
    } else if (mode === "missing_letters") {
      const len = clean.length;
      const gapCount = Math.min(GAPS_FOR_DIFF[difficulty] || 2, Math.floor(len / 2));
      const positions = shuffle([...Array(len).keys()]).slice(0, gapCount).sort((a, b) => a - b);
      setGaps(positions);
      setGapInput({});
    } else {
      setTyped("");
    }
    setStatus(null);
    setTimeout(() => speak(clean), 200);
  }

  const finishRound = useCallback((reason) => {
    if (finishing.current || !roundItems.current.length) return;
    finishing.current = true;
    const items = roundItems.current;
    const itemsTotal = items.length;
    const itemsCorrect = firstTry.current.size;
    const finalStreakBest = streakBestRef.current;
    const usedTries = triesRef.current;
    const mult = currentMultiplier();

    const { amount, streakBonus } = computeRoundXp({ itemsCorrect, streakBest: finalStreakBest, hintMultiplier: mult });
    recordRoundReward({ userEmail: user?.email, game: GAME, roundId: roundId.current, itemsTotal, itemsCorrect, streakBest: finalStreakBest, hintMultiplier: mult, level });
    logWordAttempts({
      userEmail: user?.email,
      game: GAME,
      level,
      roundId: roundId.current,
      items: items.map((it) => ({ word: it.english, wordId: it.id, correct: firstTry.current.has(it.english) })),
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
      hintMultiplier: mult,
    });
    setPhase("result");
  }, [user?.email, level, onXpEarned, onGameComplete, baseMultiplier]);

  const advance = useCallback(() => {
    const next = idxRef.current + 1;
    if (next >= roundItems.current.length) { finishRound("clear"); return; }
    idxRef.current = next;
    setIdx(next);
    loadWord(roundItems.current[next]);
    if (triesRef.current >= budgetRef.current) finishRound("budget");
  }, [finishRound]);

  // ---- letter_order handlers ----
  const pickLetter = (li) => {
    if (status || letters[li].used) return;
    const next = [...placed, letters[li].char];
    setPlaced(next);
    setLetters((ls) => ls.map((l, j) => (j === li ? { ...l, used: true } : l)));
    const target = cleanTarget;
    if (next.length === target.length) checkAnswer(next.join(""));
  };

  const removeLast = () => {
    if (status || placed.length === 0) return;
    const last = placed[placed.length - 1];
    let freed = false;
    setLetters((ls) => ls.map((l) => {
      if (!freed && l.used && l.char === last) { freed = true; return { ...l, used: false }; }
      return l;
    }));
    setPlaced((p) => p.slice(0, -1));
  };

  // ---- missing_letters handlers ----
  const onGapChange = (pos, val) => {
    if (status) return;
    const ch = val.replace(/[^a-zA-Z]/g, "").toLowerCase().slice(0, 1);
    setGapInput((g) => ({ ...g, [pos]: ch }));
  };

  // ---- typing handlers ----
  const onTypeChange = (val) => {
    if (status) return;
    setTyped(val.replace(/[^a-zA-Z]/g, "").toLowerCase());
  };

  // ---- shared check ----
  const checkAnswer = (attempt) => {
    const target = cleanTarget;
    triesRef.current += 1;
    setTries(triesRef.current);
    const ok = attempt === target;
    setStatus(ok ? "correct" : "wrong");

    if (ok) {
      const clean = !missedOnce.current.has(currentWord.english);
      if (clean) {
        firstTry.current.add(currentWord.english);
        setFirstTryCount(firstTry.current.size);
        const s = streak + 1;
        streakBestRef.current = Math.max(streakBestRef.current, s);
        setStreak(s);
        setStreakBest(streakBestRef.current);
        const fid = `${roundId.current}-${idx}`;
        setFlyups((f) => [...f, { id: fid, amount: computeRoundXp({ itemsCorrect: 1 }).amount }]);
        setTimeout(() => setFlyups((f) => f.filter((x) => x.id !== fid)), 900);
      }
    } else {
      missedOnce.current.add(currentWord.english);
      setStreak(0);
    }

    // Reveal correct spelling
    if (mode === "letter_order") setPlaced(target.split(""));
    if (mode === "missing_letters") {
      const full = {};
      target.split("").forEach((ch, i) => { full[i] = ch; });
      setGapInput(full);
    }
    if (mode === "typing") setTyped(target);

    setTimeout(() => {
      if (finishing.current) return;
      if (triesRef.current >= budgetRef.current && !ok) { finishRound("budget"); return; }
      advance();
    }, REVEAL_MS);
  };

  const handleSubmit = () => {
    if (status) return;
    if (mode === "letter_order") {
      if (placed.length === cleanTarget.length) checkAnswer(placed.join(""));
    } else if (mode === "missing_letters") {
      // Reconstruct the FULL word from visible letters + filled gaps, not
      // just the gap letters — checkAnswer compares against cleanTarget.
      const full = cleanTarget.split("").map((ch, i) =>
        gaps.includes(i) ? (gapInput[i] || "").toLowerCase() : ch
      ).join("");
      checkAnswer(full);
    } else {
      if (typed.length > 0) checkAnswer(typed);
    }
  };

  const toggleMeaning = () => {
    setShowMeaning((v) => { if (!v) helpUsed.current = true; return !v; });
  };

  const currentWord = round[idx];
  const cleanTarget = (currentWord?.english || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  const playing = phase === "playing";
  const liveXp = sessionXp + (playing ? computeRoundXp({ itemsCorrect: firstTryCount, streakBest, hintMultiplier: currentMultiplier() }).amount : 0);
  const progress = round.length ? idx / round.length : 0;
  const triesLeft = Math.max(0, budget - tries);
  const titleKey = `title_${mode}`;
  const instructionKey = `${mode === "missing_letters" ? "ml" : mode === "letter_order" ? "lo" : "ty"}_instruction`;
  const meaningText = currentWord ? meaningInLang(currentWord, lang) : "";

  // ---- Blitz lesson ----
  const blitzScreens = useMemo(() => {
    if (mode === "missing_letters") return [c("ml_blitz_1"), c("ml_blitz_2")];
    if (mode === "letter_order") return [c("lo_blitz_1"), c("lo_blitz_2")];
    return [c("ty_blitz_1"), c("ty_blitz_2")];
  }, [mode, c]);
  const [blitzIdx, setBlitzIdx] = useState(0);

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
            <span className={`neo-pill px-2.5 h-8 ${budget > 0 && triesLeft <= Math.ceil(budget * 0.25) ? "text-destructive" : "text-muted-foreground"}`} aria-label={c("attempts")}>
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

        {playing && currentWord && (
          <>
            <div className="flex items-center justify-between gap-2 mb-3 text-[11px] text-muted-foreground">
              <span>{c("question", { n: idx + 1, total: round.length })} · {c("item_progress", { n: firstTryCount, total: round.length })}</span>
              <button onClick={toggleMeaning} className="min-h-[44px] flex items-center gap-1 font-semibold select-none px-2" style={{ color: showMeaning ? undefined : ACCENT }}>
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" /> {showMeaning ? c("meaning") : c("meaning")}
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center mb-3">{c(instructionKey)}</p>

            <AnimatePresence mode="wait">
              <motion.div key={idx} initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={rm ? undefined : { opacity: 0, y: -12 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>

                {/* Audio button + meaning */}
                <div className="premium-card px-4 py-5 text-center mb-4">
                  <button onClick={() => speak(cleanTarget)} className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg active:scale-95 transition-transform select-none" style={{ background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)`, boxShadow: `0 10px 30px -10px ${ACCENT}88` }}>
                    <Volume2 className="w-7 h-7 text-white" aria-hidden="true" />
                  </button>
                  {showMeaning && meaningText && (
                    <p className="text-sm font-semibold text-foreground mt-3">{meaningText}</p>
                  )}
                </div>

                {/* === missing_letters mode === */}
                {mode === "missing_letters" && (
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {cleanTarget.split("").map((ch, i) => {
                      const isGap = gaps.includes(i);
                      const val = gapInput[i] || "";
                      if (!isGap) {
                        return (
                          <div key={i} className="w-9 h-11 rounded-xl border-2 border-white/15 bg-white/[0.04] flex items-center justify-center text-lg font-bold text-muted-foreground">
                            {ch.toUpperCase()}
                          </div>
                        );
                      }
                      const isCorrect = status === "correct";
                      const isWrong = status === "wrong" && val.toLowerCase() !== ch;
                      return (
                        <input
                          key={i}
                          value={val}
                          onChange={(e) => onGapChange(i, e.target.value)}
                          disabled={!!status}
                          maxLength={1}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className={`w-9 h-11 rounded-xl border-2 text-center text-lg font-bold uppercase outline-none transition-colors ${
                            isCorrect ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                            : isWrong ? "border-rose-400 bg-rose-500/10 text-rose-300"
                            : "border-white/20 bg-white/[0.06] text-foreground focus:border-white/40"
                          }`}
                          style={{ caretColor: ACCENT }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* === letter_order mode === */}
                {mode === "letter_order" && (
                  <>
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                      {cleanTarget.split("").map((_, i) => {
                        const ch = placed[i];
                        let cls = "w-9 h-11 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-colors";
                        if (status === "correct") cls += " border-emerald-400 bg-emerald-500/10 text-emerald-300";
                        else if (status === "wrong") cls += " border-rose-400 bg-rose-500/10 text-rose-300";
                        else if (ch) cls += " border-white/30 bg-white/[0.08] text-foreground";
                        else cls += " border-white/15 bg-white/[0.03] text-muted-foreground";
                        return <div key={i} className={cls}>{(ch || "").toUpperCase()}</div>;
                      })}
                    </div>
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {letters.map((l, i) => (
                        <button
                          key={i}
                          onClick={() => pickLetter(i)}
                          disabled={l.used || !!status}
                          className={`h-12 rounded-xl text-lg font-bold border-2 select-none transition-all ${
                            l.used ? "border-white/5 bg-white/[0.02] text-transparent"
                            : "border-white/15 bg-white/[0.05] text-foreground hover:border-white/30 active:scale-95"
                          }`}
                        >
                          {l.char.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* === typing mode === */}
                {mode === "typing" && (
                  <div className="flex flex-col items-center mb-4">
                    <input
                      value={typed}
                      onChange={(e) => onTypeChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !status) handleSubmit(); }}
                      disabled={!!status}
                      placeholder="..."
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className={`w-full max-w-xs h-14 rounded-2xl border-2 text-center text-xl font-bold lowercase outline-none transition-colors mb-2 ${
                        status === "correct" ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                        : status === "wrong" ? "border-rose-400 bg-rose-500/10 text-rose-300"
                        : "border-white/20 bg-white/[0.06] text-foreground focus:border-white/40"
                      }`}
                      style={{ caretColor: ACCENT }}
                    />
                  </div>
                )}

                {/* Feedback */}
                {status && (
                  <div className="text-center mb-3">
                    <div className={`flex items-center justify-center gap-1.5 text-sm font-semibold ${status === "correct" ? "text-emerald-400" : "text-rose-400"}`}>
                      {status === "correct" ? <Check className="w-4 h-4" aria-hidden="true" /> : <X className="w-4 h-4" aria-hidden="true" />}
                      {status === "correct" ? c("correct") : c("miss")}
                    </div>
                    {status === "wrong" && (
                      <div className="text-xs text-muted-foreground mt-1">{currentWord.english}</div>
                    )}
                  </div>
                )}

                {/* Controls */}
                {!status ? (
                  <div className="flex gap-2">
                    {mode === "letter_order" && (
                      <button onClick={removeLast} disabled={placed.length === 0} className="flex-1 h-11 rounded-xl border border-white/15 bg-white/[0.04] text-foreground text-sm font-semibold flex items-center justify-center gap-1.5 select-none disabled:opacity-40">
                        <Eraser className="w-4 h-4" aria-hidden="true" /> {c("erase")}
                      </button>
                    )}
                    <button onClick={() => speak(cleanTarget)} className="flex-1 h-11 rounded-xl border border-white/15 bg-white/[0.04] text-foreground text-sm font-semibold flex items-center justify-center gap-1.5 select-none">
                      <Volume2 className="w-4 h-4" aria-hidden="true" /> {c("replay")}
                    </button>
                    <button onClick={handleSubmit} className="flex-1 h-11 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5 select-none" style={{ background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)` }}>
                      <Check className="w-4 h-4" aria-hidden="true" /> {c("submit")}
                    </button>
                  </div>
                ) : (
                  <button onClick={advance} className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 select-none" style={{ background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)` }}>
                    {idx + 1 >= round.length ? c("keep_going") : c("question", { n: idx + 2, total: round.length })} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
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
                {roundItems.current.map((it, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className={`font-semibold truncate ${firstTry.current.has(it.english) ? "text-foreground" : "text-muted-foreground"}`}>{it.english}</span>
                    {it._provenance === PROVENANCE.SAVED && <span className="text-[9px] text-sky-300 shrink-0">★</span>}
                    {it._provenance === PROVENANCE.WRONG && <span className="text-[9px] text-amber-300 shrink-0">{firstTry.current.has(it.english) ? "✓" : "↻"}</span>}
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