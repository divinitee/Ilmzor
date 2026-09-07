import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, X, Star, Flame, Target, Loader2, BookOpen, Trophy, RotateCcw, ArrowRight } from "lucide-react";
import { shuffle, pickN } from "@/lib/vocabGameUtils";
import { SKILLS } from "@/lib/gameSkills";
import { computeRoundXp, recordRoundReward, generateRoundId, roundPassed } from "@/lib/gameScoring";
import { logWordAttempts } from "@/lib/roundComposition";
import { useHuntCopy } from "@/components/games/antonymHuntCopy";

// ---------------------------------------------------------------------------
// Antonym Hunt — refined 2026-09-07 to the five-layer game standard.
//
// THE MECHANIC IS UNCHANGED: each entry is one target word with 4 synonyms and
// 1 antonym; the student spots the antonym among the synonym decoys. The bank
// is hand-curated (ODD_ONE_OUT_BANK, 20 entries) and independent of the
// VocabularyWord library — same as GrammarQuizGame's hardcoded QUESTION_BANK.
//
// WHAT CHANGED:
// 1. Scoring: was flat score × 10 XP with no ledger. Now gameScoring.js —
//    computeRoundXp / recordRoundReward / roundPassed, same as every other
//    Vocabulary game.
// 2. Failability: was a walk-through with no way to fail. Now an attempt
//    budget shown live in the HUD (ATTEMPTS_PER_ITEM multiplier), so
//    roundPassed() has real teeth.
// 3. Personalization: buildPersonalizedRound does NOT fit a fixed-bank game
//    — the bank's targets are capitalized ("Happy") while VocabularyWord.
//    english is lowercase ("happy"), so SavedWord / WordAttempt signal
//    matching would be unreliable, and 20 entries is too small a pool for
//    meaningful personalization anyway. Rounds are shuffle-picked from the
//    bank directly. logWordAttempts IS used (target word as `word`, no
//    wordId) so per-word history accumulates for future use.
// 4. Provenance badges: skipped — no personalization signals to badge.
// 5. Shell: was hardcoded blue/indigo. Now premium-mesh / premium-card /
//    neo-pill, accent #7C6BE8 from SKILLS (vocabulary).
// 6. i18n: was zero coverage. Now antonymHuntCopy.js, full en/uz/ru.
//
// No translation reveal: the bank has no uz/ru fields, and the mechanic is
// pure English synonym/antonym discrimination — knowing the Uzbek for "Happy"
// doesn't help you decide which of five English words is the antonym.
//
// POOL SIZE: 20 entries is thin for repeat play (8 per round = 40% of the
// bank; after 2-3 rounds you've seen most entries). Flagged as a content-
// authoring followup — the bank needs more entries and a CEFR level per
// entry before per-level filtering or personalization makes sense here.
// ---------------------------------------------------------------------------

const GAME = "odd_one_out";
const ACCENT = SKILLS.find((s) => s.key === "vocabulary")?.color || "#7C6BE8";

const ROUND_COUNT = 8;
const ATTEMPTS_PER_ITEM = 1.5;
const CORRECT_MS = 480;
const MISS_MS = 520;

const ODD_ONE_OUT_BANK = [
  { target: "Happy", synonyms: ["Glad", "Joyful", "Cheerful", "Pleased"], antonym: "Sad" },
  { target: "Big", synonyms: ["Large", "Huge", "Giant", "Massive"], antonym: "Tiny" },
  { target: "Fast", synonyms: ["Quick", "Rapid", "Swift", "Speedy"], antonym: "Slow" },
  { target: "Hot", synonyms: ["Warm", "Boiling", "Scorching", "Heated"], antonym: "Cold" },
  { target: "Easy", synonyms: ["Simple", "Effortless", "Basic", "Straightforward"], antonym: "Difficult" },
  { target: "Strong", synonyms: ["Powerful", "Tough", "Sturdy", "Mighty"], antonym: "Weak" },
  { target: "Brave", synonyms: ["Courageous", "Fearless", "Bold", "Daring"], antonym: "Cowardly" },
  { target: "Kind", synonyms: ["Gentle", "Caring", "Generous", "Friendly"], antonym: "Cruel" },
  { target: "Clean", synonyms: ["Spotless", "Tidy", "Neat", "Fresh"], antonym: "Dirty" },
  { target: "Rich", synonyms: ["Wealthy", "Affluent", "Prosperous", "Well-off"], antonym: "Poor" },
  { target: "Quiet", synonyms: ["Silent", "Calm", "Peaceful", "Hushed"], antonym: "Loud" },
  { target: "Young", synonyms: ["Youthful", "Juvenile", "Fresh", "New"], antonym: "Old" },
  { target: "Beautiful", synonyms: ["Pretty", "Lovely", "Gorgeous", "Stunning"], antonym: "Ugly" },
  { target: "Safe", synonyms: ["Secure", "Protected", "Sheltered", "Guarded"], antonym: "Dangerous" },
  { target: "Full", synonyms: ["Packed", "Filled", "Loaded", "Crammed"], antonym: "Empty" },
  { target: "Wide", synonyms: ["Broad", "Spacious", "Vast", "Expansive"], antonym: "Narrow" },
  { target: "Bright", synonyms: ["Radiant", "Vivid", "Shining", "Brilliant"], antonym: "Dark" },
  { target: "Early", synonyms: ["Prompt", "Timely", "Advance", "Beforehand"], antonym: "Late" },
  { target: "High", synonyms: ["Tall", "Elevated", "Lofty", "Towering"], antonym: "Low" },
  { target: "Open", synonyms: ["Unlocked", "Ajar", "Accessible", "Unsealed"], antonym: "Closed" },
];

export default function OddOneOutGame({ onBack, onXpEarned, onGameComplete, user, level }) {
  const { c, t } = useHuntCopy();
  const rm = useReducedMotion();

  const [sessionXp, setSessionXp] = useState(0);
  const [phase, setPhase] = useState("loading"); // loading | playing | result
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [ruledOut, setRuledOut] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakBest, setStreakBest] = useState(0);
  const [tries, setTries] = useState(0);
  const [budget, setBudget] = useState(0);
  const [summary, setSummary] = useState(null);
  const [flyups, setFlyups] = useState([]);

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

  const startRound = useCallback((startStreak) => {
    setPhase("loading");
    finishing.current = false;
    busy.current = false;
    roundId.current = generateRoundId();
    firstTry.current = new Set();
    missedOnce.current = new Set();

    const picks = pickN(ODD_ONE_OUT_BANK, Math.min(ROUND_COUNT, ODD_ONE_OUT_BANK.length));
    const built = picks.map((entry, i) => ({
      id: `${entry.target}-${i}`,
      word: entry.target,
      correct: entry.antonym,
      options: shuffle([...entry.synonyms, entry.antonym]),
    }));

    roundItems.current = built;
    budgetRef.current = Math.max(built.length, Math.round(built.length * ATTEMPTS_PER_ITEM));
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
    setPhase("playing");
  }, []);

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
    if (triesRef.current >= budgetRef.current) finishRound("budget");
  }, [finishRound]);

  const handlePick = (opt) => {
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
      setTimeout(() => {
        busy.current = false;
        if (finishing.current) return;
        setFeedback(null);
        advance();
      }, CORRECT_MS);
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

  const playing = phase === "playing";
  const q = questions[idx];
  const liveXp = sessionXp + (playing ? computeRoundXp({ itemsCorrect: firstTryCount, streakBest }).amount : 0);
  const progress = questions.length ? idx / questions.length : 0;
  const triesLeft = Math.max(0, budget - tries);

  return (
    <div className="min-h-screen bg-background premium-mesh flex flex-col">
      {/* HUD */}
      <header className="bg-background/70 backdrop-blur-xl border-b border-white/10 px-3 py-2 flex items-center justify-between safe-header gap-2">
        <button onClick={onBack} className="min-h-[44px] min-w-[44px] flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none px-1">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t("gameui.back")}
        </button>
        <span className="text-xs font-bold truncate" style={{ color: ACCENT }}>{c("title")}</span>
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
            <p className="text-xs text-muted-foreground text-center mb-3">{c("instruction")}</p>

            <AnimatePresence mode="wait">
              <motion.div key={q.id} initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={rm ? undefined : { opacity: 0, y: -12 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
                <div className="premium-card px-4 py-6 text-center mb-4">
                  <p className="text-3xl font-bold text-foreground tracking-tight">{q.word}</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {q.options.map((opt, i) => {
                    const out = ruledOut.includes(opt);
                    const isCorrect = revealed && opt === q.correct;
                    return (
                      <motion.button
                        key={`${opt}-${i}`}
                        onClick={() => handlePick(opt)}
                        disabled={out || revealed}
                        whileTap={{ scale: out || revealed ? 1 : 0.97 }}
                        className={`min-h-[64px] px-3 py-3 rounded-2xl border text-sm font-semibold flex items-center justify-center gap-1.5 text-center transition-colors select-none ${
                          isCorrect
                            ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                            : out
                            ? "border-rose-400/40 bg-rose-500/5 text-rose-300/70 line-through"
                            : "border-white/10 bg-white/[0.04] text-foreground hover:border-white/25"
                        }`}
                      >
                        <span className="break-words">{opt}</span>
                        {isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />}
                        {out && <X className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

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
                    <span className="text-[10px] text-muted-foreground truncate max-w-[45%]">{it.correct}</span>
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