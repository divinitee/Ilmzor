import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, RotateCcw } from "lucide-react";
import { CARD_FLIP_VARIANTS } from "@/lib/cardFlipVariants";
import { levelOf, wordsForLevel, cognitiveDemandForLevel, difficultyForLevel, LEVELS } from "@/lib/levels";

// Temporary dev-only harness for the Memory Flip bake-off (see
// claude/ilmzor-game-template.md, "Bake-off setup"). Admin-gated, not
// linked in any nav — reach it directly at /dev-cardflip-bakeoff. Lets Tee
// flip between Original / CardFlip Fable / (later) CardFlip Opus on one
// screen, and clear this account's personalization history between plays
// — a played round changes what the next one shows (the "bake-off
// contamination" note in the template), so this keeps repeated
// side-by-side testing on one account clean.
//
// XP earned here is tracked locally on screen only and never written to
// this account's real UserCoins balance, so repeated test rounds don't
// inflate Tee's own coin total. The RewardEvent/WordAttempt writes a
// migrated game performs are real, though — that ledger is exactly what's
// being verified — and "Reset my game history" clears them for this
// account between plays.
export default function DevCardFlipBakeoff() {
  const [me, setMe] = useState(null);
  const [checking, setChecking] = useState(true);
  const [words, setWords] = useState([]);
  const [loadingWords, setLoadingWords] = useState(true);
  const [variantId, setVariantId] = useState(CARD_FLIP_VARIANTS[0].id);
  const [level, setLevel] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [devXp, setDevXp] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState(null);

  useEffect(() => {
    base44.auth.me()
      .then((u) => { setMe(u); setLevel(levelOf(u)); setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!me || me.role !== "admin") return;
    let cancelled = false;
    (async () => {
      const byId = new Map();
      let skip = 0;
      const PAGE = 500;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const page = await base44.entities.VocabularyWord.list("id", PAGE, skip);
        page.forEach((w) => byId.set(w.id, w));
        if (page.length < PAGE) break;
        skip += PAGE;
      }
      if (!cancelled) { setWords([...byId.values()]); setLoadingWords(false); }
    })();
    return () => { cancelled = true; };
  }, [me]);

  const poolWords = useMemo(() => (level ? wordsForLevel(words, level) : []), [words, level]);
  const variant = CARD_FLIP_VARIANTS.find((v) => v.id === variantId) || CARD_FLIP_VARIANTS[0];

  const resetHistory = async () => {
    if (!me) return;
    setResetting(true);
    setResetMsg(null);
    try {
      const [attempts, rewards] = await Promise.all([
        base44.entities.WordAttempt.filter({ user_email: me.email }),
        base44.entities.RewardEvent.filter({ user_email: me.email }),
      ]);
      await Promise.all([
        ...attempts.map((r) => base44.entities.WordAttempt.delete(r.id).catch(() => {})),
        ...rewards.map((r) => base44.entities.RewardEvent.delete(r.id).catch(() => {})),
      ]);
      setResetMsg(`Cleared ${attempts.length} attempt row(s) and ${rewards.length} reward row(s).`);
    } catch (e) {
      setResetMsg(`Reset failed: ${e.message}`);
    }
    setResetting(false);
  };

  if (checking || (me && me.role === "admin" && loadingWords)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!me || me.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  if (playing) {
    const Comp = variant.Component;
    return (
      <div>
        <div className="bg-amber-500/10 border-b border-amber-400/20 px-4 py-2 flex items-center justify-between text-xs font-semibold text-amber-600">
          <span>Bake-off: {variant.label} · dev XP this session: {devXp}</span>
          <button onClick={() => setPlaying(false)} className="underline select-none">Exit to picker</button>
        </div>
        <Comp
          words={poolWords}
          unitName="Bake-off"
          level={level}
          cognitiveDemand={cognitiveDemandForLevel(level)}
          difficulty={difficultyForLevel(level)}
          user={me}
          onBack={() => setPlaying(false)}
          onXpEarned={(xp) => setDevXp((v) => v + (xp || 0))}
          onGameComplete={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-1">Memory Flip bake-off</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Dev-only, admin-gated, not linked anywhere in the app. Delete this
        page, the registry, and the bake-off components once a winner is
        picked (see claude/ilmzor-game-template.md).
      </p>

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Version</p>
      <div className="grid grid-cols-1 gap-2 mb-6">
        {CARD_FLIP_VARIANTS.map((v) => (
          <button
            key={v.id}
            onClick={() => setVariantId(v.id)}
            className={`text-left px-4 py-3 rounded-xl border-2 select-none ${variantId === v.id ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <span className="font-semibold text-foreground">{v.label}</span>
          </button>
        ))}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Level (for testing across tiers)</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 select-none ${level === l ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <button
        onClick={() => { setDevXp(0); setPlaying(true); }}
        disabled={poolWords.length === 0}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold mb-3 disabled:opacity-40 select-none"
      >
        Play {variant.label}
      </button>

      <button
        onClick={resetHistory}
        disabled={resetting}
        className="w-full h-11 rounded-xl border-2 border-border text-foreground font-semibold flex items-center justify-center gap-2 select-none disabled:opacity-50"
      >
        <RotateCcw className="w-4 h-4" /> {resetting ? "Clearing…" : "Reset my game history (WordAttempt + RewardEvent)"}
      </button>
      {resetMsg && <p className="text-xs text-muted-foreground mt-2 text-center">{resetMsg}</p>}
    </div>
  );
}
