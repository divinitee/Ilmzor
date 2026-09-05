import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, Flame, Star, Clock, Check, X, Languages, Trophy, RotateCcw, ChevronRight, Bookmark, Swords, BookOpen } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { usableWords, meaningInLang, shuffle } from "@/lib/vocabGameUtils";
import { hintXpMultiplier } from "@/lib/levels";
import { computeRoundXp, recordRoundReward, generateRoundId, PASS_THRESHOLD } from "@/lib/gameScoring";
import { fetchPersonalizationSignals, composeRound, logWordAttempts, PROVENANCE } from "@/lib/roundComposition";
import { SKILLS } from "@/lib/gameSkills";
import { CARD_FLIP_OPUS_COPY, fill } from "@/components/games/cardFlipOpusCopy";

// ---------------------------------------------------------------------------
// CardFlip Opus — the Opus entry in the Memory Flip bake-off.
// Brief: claude/ilmzor-game-template.md (five layers). Reachable through
// /dev-cardflip-bakeoff. The production MemoryFlipGame.jsx is untouched.
//
// The three design judgments this implementation makes, which the template
// deliberately leaves open:
//
// 1. ROLLING BOARD, NOT A GRID YOU EXHAUST. Today's Memory Flip deals 12
//    cards and ends when they're all matched, which means the score is
//    always 100% and the game is winnable purely on card positions without
//    ever reading a word. Here the board is a small window (3–6 pairs' worth
//    of cards) over a deeper shuffled stream: a matched pair is removed and
//    two fresh cards deal into the freed slots. The dealer prefers a card
//    whose partner is already on the board, so there is almost always a
//    findable match — but never a free one, because the two freed slots are
//    never filled with the same pair.
//
// 2. THE ROUND IS TIMED, SO THE SCORE MEANS SOMETHING. 90 seconds (Layer 1)
//    with the block ending on the clock or on a full clear. itemsCorrect is
//    pairs actually matched out of pairs dealt, so PASS_THRESHOLD (60%) is a
//    real bar and the round is legitimately failable — which is what makes
//    beating your own score worth anything.
//
// 3. THE MATCH IS WORD -> ENGLISH DEFINITION, WITH THE STUDENT'S LANGUAGE
//    ONE TAP AWAY. This is what finally wires HINT_XP_MULTIPLIER (defined in
//    levels.js since the level system shipped, used by nothing). Solving from
//    the English definition keeps full XP; revealing the uz/ru translation
//    applies the multiplier — free at Starter/A1, where the translation is
//    shown inline from the start instead. Framed in the UI as a bonus you
//    kept, never a penalty you took.
//    NOTE for Tee: this does change what a uz/ru-mode student sees on the
//    meaning card (English definition first, their language on tap) versus
//    every other game, which shows their language outright. That is the
//    deliberate trade behind the hint multiplier and is worth a look during
//    play-testing.
// ---------------------------------------------------------------------------

const GAME_KEY = "memory_flip";
const ACCENT = SKILLS.find((s) => s.key === "vocabulary")?.color || "#6366f1";

// Layer 1: recognition/matching family, 8–14 items, scaling with the tier
// from difficultyForLevel(). boardPairs is how much of the round is on
// screen at once; seconds is the core round.
const DIFF_CONFIG = {
  beginner: { pairs: 8, boardPairs: 3, seconds: 90, peekMs: 2500 },
  intermediate: { pairs: 10, boardPairs: 4, seconds: 90, peekMs: 2000 },
  advanced: { pairs: 12, boardPairs: 5, seconds: 90, peekMs: 1500 },
  proficient: { pairs: 14, boardPairs: 6, seconds: 90, peekMs: 1200 },
};

const AUTO_TRANSLATE_LEVELS = ["Starter", "A1"];

export default function CardFlipOpus({
  words = [],
  unitName,
  level,
  difficulty = "intermediate",
  user,
  onBack,
  onXpEarned,
  onGameComplete,
}) {
  const { t, lang } = useAppLang();
  const reduced = useReducedMotion();
  const cfg = DIFF_CONFIG[difficulty] || DIFF_CONFIG.intermediate;
  const copy = CARD_FLIP_OPUS_COPY[lang] || CARD_FLIP_OPUS_COPY.en;

  const autoTranslate = AUTO_TRANSLATE_LEVELS.includes(level);
  const supportAvailable = lang !== "en";

  const [phase, setPhase] = useState("loading"); // loading | peek | playing | result | empty
  const [blockWords, setBlockWords] = useState([]);
  const [deck, setDeck] = useState({ board: [], pile: [] });
  const [flipped, setFlipped] = useState([]);
  const [matchedKeys, setMatchedKeys] = useState(new Set());
  const [lastOutcome, setLastOutcome] = useState(null); // "match" | "miss"
  const [busy, setBusy] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState(new Set());
  const [secondsLeft, setSecondsLeft] = useState(cfg.seconds);
  const [streak, setStreak] = useState(0);
  const [blockStreakBest, setBlockStreakBest] = useState(0);
  const [xpPop, setXpPop] = useState(null);
  const [cumulativeXp, setCumulativeXp] = useState(0);
  const [result, setResult] = useState(null);

  const signalsRef = useRef({ previouslyWrong: [], saved: [] });
  const usedEnglishRef = useRef(new Set());
  const matchedRef = useRef(new Set());
  const matchedWordsRef = useRef([]);
  const usedRevealRef = useRef(false);
  const roundIdRef = useRef(null);
  const finishedRef = useRef(false);
  const finishRef = useRef(null);

  const currentMultiplier = autoTranslate || usedRevealRef.current ? hintXpMultiplier(level) : 1;

  // ---- round setup -------------------------------------------------------

  const startBlock = (signals) => {
    const pool = usableWords(words).filter((w) => !usedEnglishRef.current.has(w.english));
    const picked = composeRound({ words: pool, signals, count: cfg.pairs });
    if (picked.length < 4) {
      setPhase("empty");
      return;
    }
    picked.forEach((w) => usedEnglishRef.current.add(w.english));

    const cards = [];
    picked.forEach((w, i) => {
      const pairKey = `p${i}`;
      cards.push({ uid: `${pairKey}-w`, pairKey, side: "word", word: w });
      cards.push({ uid: `${pairKey}-m`, pairKey, side: "meaning", word: w });
    });
    const stream = shuffle(cards);
    const boardSize = Math.min(cfg.boardPairs * 2, stream.length);

    matchedRef.current = new Set();
    matchedWordsRef.current = [];
    finishedRef.current = false;
    roundIdRef.current = generateRoundId();

    setBlockWords(picked);
    setDeck({ board: stream.slice(0, boardSize), pile: stream.slice(boardSize) });
    setMatchedKeys(new Set());
    setFlipped([]);
    setRevealedKeys(new Set());
    setLastOutcome(null);
    setSecondsLeft(cfg.seconds);
    setBlockStreakBest(streak); // streak carries across blocks (Layer 1)
    setResult(null);
    setPhase("peek");
  };

  // First block. Signals are fetched once and reused for every later block,
  // so "Keep going" costs no extra queries.
  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    usedEnglishRef.current = new Set();
    setCumulativeXp(0);
    setStreak(0);
    (async () => {
      const signals = await fetchPersonalizationSignals(user?.email);
      if (cancelled) return;
      signalsRef.current = signals;
      startBlock(signals);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, difficulty, user?.email]);

  // Peek beat: the whole board face-up before it flips down. An encoding
  // opportunity, so the round rewards reading rather than blind guessing.
  useEffect(() => {
    if (phase !== "peek") return;
    const id = setTimeout(() => setPhase("playing"), reduced ? 900 : cfg.peekMs);
    return () => clearTimeout(id);
  }, [phase, cfg.peekMs, reduced]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          finishRef.current?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ---- finishing a block -------------------------------------------------

  const finishBlock = async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const itemsTotal = blockWords.length;
    const itemsCorrect = matchedRef.current.size;
    const hintMultiplier = autoTranslate || usedRevealRef.current ? hintXpMultiplier(level) : 1;
    const streakBest = Math.max(blockStreakBest, streak);

    setPhase("result");

    const { amount, baseXp, streakBonus, passed } = await recordRoundReward({
      userEmail: user?.email,
      game: GAME_KEY,
      roundId: roundIdRef.current,
      itemsTotal,
      itemsCorrect,
      streakBest,
      hintMultiplier,
      level,
    });

    // Positive signal only for matching games (Layer 4.1): found pairs are
    // logged, mismatches are never logged at all.
    logWordAttempts({
      userEmail: user?.email,
      game: GAME_KEY,
      level,
      roundId: roundIdRef.current,
      items: matchedWordsRef.current.map((w) => ({ word: w.english, wordId: w.id, correct: true })),
    });

    const scorePct = itemsTotal ? Math.round((itemsCorrect / itemsTotal) * 100) : 0;
    setCumulativeXp((v) => v + amount);
    setResult({ itemsTotal, itemsCorrect, scorePct, amount, baseXp, streakBonus, passed, streakBest, hintMultiplier });

    onXpEarned?.(amount, itemsCorrect);
    onGameComplete?.({ scorePct, correct: itemsCorrect, total: itemsTotal });
  };
  finishRef.current = finishBlock;

  // ---- interaction -------------------------------------------------------

  const dealInto = (freedIdx) => {
    setDeck((prev) => {
      const board = [...prev.board];
      let pile = [...prev.pile];
      const liveKeys = new Set(
        board.filter((c) => c && !matchedRef.current.has(c.pairKey)).map((c) => c.pairKey)
      );
      freedIdx.forEach((idx) => {
        if (!pile.length) {
          board[idx] = null;
          return;
        }
        // Prefer a card whose partner is already face-down on the board, so
        // a match stays findable — but never fill both freed slots from the
        // same pair, which would hand out a free match every time.
        let pick = pile.findIndex((c) => liveKeys.has(c.pairKey));
        if (pick === -1) pick = 0;
        const card = pile[pick];
        pile = pile.filter((_, i) => i !== pick);
        board[idx] = card;
        liveKeys.add(card.pairKey);
      });
      return { board, pile };
    });
  };

  const resolveMatch = (pairKey, freedIdx) => {
    const word = blockWords.find((_, i) => `p${i}` === pairKey);
    matchedRef.current = new Set(matchedRef.current).add(pairKey);
    if (word) matchedWordsRef.current.push(word);

    setMatchedKeys(new Set(matchedRef.current));
    setFlipped([]);
    setLastOutcome("match");
    setStreak((s) => {
      const next = s + 1;
      setBlockStreakBest((b) => Math.max(b, next));
      return next;
    });

    const preview = computeRoundXp({
      itemsCorrect: 1,
      streakBest: 0,
      hintMultiplier: autoTranslate || usedRevealRef.current ? hintXpMultiplier(level) : 1,
    });
    setXpPop({ id: pairKey, amount: preview.amount });
    setTimeout(() => setXpPop(null), 800);

    if (matchedRef.current.size >= blockWords.length) {
      finishBlock();
      return;
    }
    dealInto(freedIdx);
  };

  const handleFlip = (card, idx) => {
    if (phase !== "playing" || busy || !card) return;
    if (matchedKeys.has(card.pairKey)) return;
    if (flipped.some((f) => f.uid === card.uid)) return;
    if (flipped.length >= 2) return;

    const next = [...flipped, { uid: card.uid, pairKey: card.pairKey, idx }];
    setFlipped(next);
    if (next.length < 2) return;

    setBusy(true);
    const [a, b] = next;
    if (a.pairKey === b.pairKey) {
      setTimeout(() => {
        resolveMatch(a.pairKey, [a.idx, b.idx]);
        setBusy(false);
      }, reduced ? 150 : 320); // correct feedback ≤350ms (Layer 2)
    } else {
      setLastOutcome("miss");
      setTimeout(() => {
        setFlipped([]);
        setStreak(0);
        setBusy(false);
      }, reduced ? 350 : 820); // wrong feedback ≤850ms then clear (Layer 2)
    }
  };

  const revealSupport = (pairKey) => {
    usedRevealRef.current = true;
    setRevealedKeys((prev) => new Set(prev).add(pairKey));
  };

  const keepGoing = () => startBlock(signalsRef.current);

  const playAgain = () => {
    usedEnglishRef.current = new Set();
    usedRevealRef.current = false;
    setCumulativeXp(0);
    setStreak(0);
    startBlock(signalsRef.current);
  };

  // ---- chrome ------------------------------------------------------------

  const livePreview = computeRoundXp({
    itemsCorrect: matchedKeys.size,
    streakBest: Math.max(blockStreakBest, streak),
    hintMultiplier: currentMultiplier,
  });
  const progressPct = blockWords.length ? (matchedKeys.size / blockWords.length) * 100 : 0;

  const Chrome = ({ children }) => (
    <div className="min-h-screen premium-mesh flex flex-col">
      <header className="bg-background/70 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between safe-header">
        <button
          onClick={onBack}
          aria-label={t("gameui.back")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none min-h-[44px] px-1"
        >
          <ArrowLeft className="w-4 h-4" /> {t("gameui.back")}
        </button>
        <span className="text-xs font-bold tracking-wide" style={{ color: ACCENT }}>
          {copy.title}
        </span>
        <div className="flex items-center gap-2 text-xs font-bold select-none">
          <span className="neo-pill px-2.5 py-1 flex items-center gap-1 text-amber-300">
            <Star className="w-3.5 h-3.5" /> {cumulativeXp + (phase === "result" ? 0 : livePreview.amount)}
          </span>
          <span
            className={`neo-pill px-2.5 py-1 flex items-center gap-1 ${streak > 1 ? "text-orange-300" : "text-muted-foreground"}`}
            aria-label={copy.streak}
          >
            <Flame className="w-3.5 h-3.5" /> {streak}
          </span>
        </div>
      </header>

      <div className="h-1 bg-muted/40">
        <motion.div
          className="h-full"
          style={{ background: ACCENT }}
          animate={{ width: `${progressPct}%` }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 30 }}
        />
      </div>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full">{children}</div>
    </div>
  );

  // ---- states ------------------------------------------------------------

  if (phase === "loading") {
    return (
      <Chrome>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">{copy.dealing}</p>
        </div>
      </Chrome>
    );
  }

  if (phase === "empty") {
    return (
      <Chrome>
        <div className="premium-card rounded-[24px] p-8 text-center mt-10">
          <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-5">{copy.notEnough}</p>
          <button
            onClick={onBack}
            className="neo-pill px-5 py-2.5 text-sm font-semibold text-foreground select-none min-h-[44px]"
          >
            {t("gameui.back")}
          </button>
        </div>
      </Chrome>
    );
  }

  if (phase === "result" && result) {
    const headline =
      result.scorePct >= 90
        ? t("gameui.result_great")
        : result.passed
        ? t("gameui.result_good")
        : t("gameui.result_try_again");
    const rematches = blockWords.filter((w) => w._provenance === PROVENANCE.WRONG);

    return (
      <Chrome>
        <motion.div
          initial={reduced ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
          transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 260, damping: 24 }}
          className="premium-card rounded-[28px] p-6 text-center mt-6"
        >
          <div
            className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
            style={{ background: `${ACCENT}22`, border: `1px solid ${ACCENT}44` }}
          >
            <Trophy className="w-8 h-8" style={{ color: ACCENT }} />
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            {secondsLeft === 0 ? copy.timeUp : copy.roundDone}
          </p>
          <h2 className="text-3xl font-bold text-foreground">{result.scorePct}%</h2>
          <p className="text-sm font-semibold mt-1" style={{ color: ACCENT }}>{headline}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {fill(copy.pairsOf, { n: result.itemsCorrect, total: result.itemsTotal })}
            {unitName ? ` · ${unitName}` : ""}
          </p>

          <div className="grid grid-cols-3 gap-2 my-5">
            <div className="neo-pill flex-col py-3">
              <span className="text-lg font-bold text-amber-300">+{result.amount}</span>
              <span className="text-[10px] text-muted-foreground">{copy.xpEarned}</span>
            </div>
            <div className="neo-pill flex-col py-3">
              <span className="text-lg font-bold text-orange-300">{result.streakBest}</span>
              <span className="text-[10px] text-muted-foreground">{copy.bestStreak}</span>
            </div>
            <div className="neo-pill flex-col py-3">
              <span className="text-lg font-bold text-foreground">{result.itemsCorrect}</span>
              <span className="text-[10px] text-muted-foreground">{copy.pairs}</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground mb-4">
            {result.hintMultiplier >= 1 ? `⚡ ${copy.englishOnly}` : `🌐 ${copy.translationUsed} · ×${result.hintMultiplier}`}
          </p>

          {rematches.length > 0 && (
            <div className="text-left mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {copy.yourWords}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rematches.map((w, i) => {
                  const beaten = matchedRef.current.has(`p${blockWords.indexOf(w)}`);
                  return (
                    <span
                      key={`${w.english}-${i}`}
                      className={`text-[11px] px-2 py-1 rounded-lg border flex items-center gap-1 ${
                        beaten
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-border bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      {beaten ? <Check className="w-3 h-3" /> : <Swords className="w-3 h-3" />} {w.english}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={keepGoing}
            className="w-full h-12 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-lg select-none mb-3"
            style={{ background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}cc)` }}
          >
            {copy.keepGoing} <ChevronRight className="w-4 h-4" />
          </button>
          <div className="flex gap-3">
            <button
              onClick={playAgain}
              className="flex-1 h-12 rounded-2xl border-2 border-border bg-card text-foreground font-semibold flex items-center justify-center gap-2 select-none"
            >
              <RotateCcw className="w-4 h-4" /> {t("gameui.retry")}
            </button>
            <button
              onClick={onBack}
              className="flex-1 h-12 rounded-2xl border-2 border-border bg-card text-foreground font-semibold flex items-center justify-center gap-2 select-none"
            >
              <BookOpen className="w-4 h-4" /> {t("gameui.exit")}
            </button>
          </div>
        </motion.div>
      </Chrome>
    );
  }

  // playing / peek
  const peeking = phase === "peek";

  return (
    <Chrome>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground font-medium">
          {peeking ? copy.peek : copy.howTo}
        </p>
        <span
          className={`neo-pill px-2.5 py-1 text-xs font-bold flex items-center gap-1 ${
            secondsLeft <= 10 ? "text-rose-300" : "text-muted-foreground"
          }`}
          aria-label={copy.time}
        >
          <Clock className="w-3.5 h-3.5" /> {secondsLeft}s
        </span>
      </div>

      {/* Feedback in text + icon, never colour alone (Layer 5) */}
      <div className="h-6 mb-1 flex items-center justify-center" aria-live="polite">
        <AnimatePresence mode="wait">
          {lastOutcome && !peeking && (
            <motion.span
              key={`${lastOutcome}-${matchedKeys.size}-${streak}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-xs font-semibold flex items-center gap-1 ${
                lastOutcome === "match" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {lastOutcome === "match" ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              {lastOutcome === "match" ? copy.matched : copy.notAPair}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="relative grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        <AnimatePresence>
          {xpPop && (
            <motion.div
              key={xpPop.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -50, scale: 1.3 }}
              transition={{ duration: reduced ? 0.2 : 0.7 }}
              className="absolute left-1/2 -translate-x-1/2 top-1/3 z-40 text-xl font-bold text-amber-300 pointer-events-none"
            >
              +{xpPop.amount} ⚡
            </motion.div>
          )}
        </AnimatePresence>

        {deck.board.map((card, idx) => {
          if (!card) return <div key={`empty-${idx}`} className="min-h-[86px] rounded-2xl border border-dashed border-border/40" />;
          const isMatched = matchedKeys.has(card.pairKey);
          const isFlipped = flipped.some((f) => f.uid === card.uid);
          const isUp = peeking || isFlipped || isMatched;
          const isMiss = lastOutcome === "miss" && isFlipped;
          const w = card.word;
          const prov = w._provenance;
          const showSupport = supportAvailable && (autoTranslate || revealedKeys.has(card.pairKey));

          return (
            <motion.button
              key={card.uid}
              onClick={() => handleFlip(card, idx)}
              disabled={isUp || busy || peeking}
              aria-label={isUp ? `${card.side === "word" ? w.english : meaningInLang(w, "en")}` : copy.title}
              animate={
                reduced
                  ? {}
                  : isMiss
                  ? { x: [0, -6, 6, -4, 0] }
                  : isMatched
                  ? { scale: [1, 1.05, 1] }
                  : {}
              }
              transition={{ duration: isMatched ? 0.32 : 0.4 }}
              className="relative min-h-[86px]"
              style={{ perspective: 800 }}
            >
              <motion.div
                className="relative w-full h-full min-h-[86px]"
                animate={reduced ? {} : { rotateY: isUp ? 180 : 0 }}
                transition={{ duration: reduced ? 0 : 0.35 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* back */}
                <div
                  className="absolute inset-0 rounded-2xl border-2 border-border bg-card flex items-center justify-center"
                  style={{ backfaceVisibility: "hidden", opacity: reduced && isUp ? 0 : 1 }}
                >
                  <span className="text-2xl text-muted-foreground/30">?</span>
                </div>

                {/* face */}
                <div
                  className={`absolute inset-0 rounded-2xl border-2 flex flex-col items-center justify-center text-center px-2 py-2 gap-1 ${
                    isMatched
                      ? "border-emerald-500/70 bg-emerald-500/10"
                      : isMiss
                      ? "border-rose-500/70 bg-rose-500/10"
                      : "bg-card"
                  }`}
                  style={{
                    backfaceVisibility: "hidden",
                    transform: reduced ? "none" : "rotateY(180deg)",
                    borderColor: !isMatched && !isMiss ? `${ACCENT}88` : undefined,
                    opacity: reduced && !isUp ? 0 : 1,
                  }}
                >
                  {card.side === "word" ? (
                    <>
                      <span className="text-sm font-bold text-foreground leading-tight">{w.english}</span>
                      {prov === PROVENANCE.SAVED && (
                        <span className="text-[9px] text-blue-300 flex items-center gap-0.5 leading-none">
                          <Bookmark className="w-2.5 h-2.5" /> {copy.badgeSaved}
                        </span>
                      )}
                      {prov === PROVENANCE.WRONG && (
                        <span className="text-[9px] text-amber-300 flex items-center gap-0.5 leading-tight">
                          <Swords className="w-2.5 h-2.5" />
                          {isMatched ? copy.badgeBeatIt : copy.badgeWrongBefore}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] text-muted-foreground leading-tight line-clamp-3">
                        {meaningInLang(w, "en")}
                      </span>
                      {showSupport && (
                        <span className="text-[10px] font-semibold text-foreground/80 leading-tight line-clamp-2">
                          {meaningInLang(w, lang)}
                        </span>
                      )}
                      {supportAvailable && !showSupport && !isMatched && (
                        <span
                          role="button"
                          tabIndex={-1}
                          aria-label={copy.showTranslation}
                          onClick={(e) => { e.stopPropagation(); revealSupport(card.pairKey); }}
                          className="text-[9px] text-blue-300 flex items-center gap-0.5 leading-none underline"
                        >
                          <Languages className="w-2.5 h-2.5" /> {copy.showTranslation}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground text-center mt-4">
        {fill(copy.pairsOf, { n: matchedKeys.size, total: blockWords.length })}
        {" · "}
        {t("gameui.level_label", { level: t(`gameui.diff.${difficulty}`) })}
        {" · "}
        {PASS_THRESHOLD * 100}%+
      </p>
    </Chrome>
  );
}
