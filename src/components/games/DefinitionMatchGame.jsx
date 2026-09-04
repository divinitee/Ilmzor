import React, { useState, useRef, useLayoutEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Star, RotateCcw, Trophy, BookOpen, Loader2, Check, X, RefreshCw, Shuffle,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { usableWords, pickN, shuffle } from "@/lib/vocabGameUtils";
import { demandPromptHint } from "@/lib/levels";

const ROUNDS = 4;
const PAIRS = 4;
const ACCENT = "#3b82f6";
const OK = "#10b981";
const BAD = "#f43f5e";

async function buildBoard(pool, level) {
  const targets = pickN(pool, PAIRS);
  const wordList = targets.map((t) => t.english).join(", ");
  // FIXED 2026-09-05: this prompt used to hardcode "B1 English learners"
  // regardless of who was actually playing — Definition Match unlocks at A1,
  // so an A1 student was getting the same subtly-different, B1-styled
  // definitions as a B2/C1 student. Now it reflects the real level and the
  // cognitive demand appropriate to it (see levels.js).
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a vocabulary quiz designer for ${level || "B1"}-level English learners. For each of these words, write a concise English definition (max 10 words). ${demandPromptHint(level)} Do not use the word itself in its definition.\nWords: ${wordList}\nReturn JSON only.`,
    response_json_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: { word: { type: "string" }, definition: { type: "string" } },
            required: ["word", "definition"],
          },
        },
      },
      required: ["items"],
    },
  });
  const items = res?.items || [];
  const byWord = {};
  items.forEach((it) => {
    if (it?.word && it?.definition) byWord[it.word.toLowerCase().trim()] = it.definition.trim();
  });
  const words = targets
    .map((t) => ({
      english: t.english,
      pronunciation: t.pronunciation,
      definition: byWord[t.english.toLowerCase().trim()] || "",
    }))
    .filter((w) => w.definition);
  if (words.length < PAIRS) throw new Error("insufficient");
  // ensure unique definitions
  const seen = new Set();
  const uniq = [];
  for (const w of words) {
    if (seen.has(w.definition)) continue;
    seen.add(w.definition);
    uniq.push(w);
  }
  if (uniq.length < PAIRS) throw new Error("insufficient");
  const finalWords = uniq.slice(0, PAIRS);
  const defs = shuffle(finalWords.map((w) => w.definition));
  const correctMap = {};
  finalWords.forEach((w, wi) => {
    correctMap[wi] = defs.indexOf(w.definition);
  });
  return { words: finalWords, defs, correctMap };
}

export default function DefinitionMatchGame({
  words = [],
  unitName = "Definition Match",
  onBack,
  onXpEarned,
  onGameComplete,
  level,
}) {
  const pool = useMemo(() => usableWords(words), [words]);

  const [round, setRound] = useState(0);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connections, setConnections] = useState({}); // wordIndex -> defIndex
  const [selected, setSelected] = useState(null); // {side, index}
  const [checked, setChecked] = useState(false);
  const [roundScore, setRoundScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const boardRef = useRef(null);
  const wordRefs = useRef([]);
  const defRefs = useRef([]);
  const [rects, setRects] = useState({ words: [], defs: [] });

  const fetchBoard = useCallback(
    async (r) => {
      if (pool.length < PAIRS) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const b = await buildBoard(pool, level);
        setBoard(b);
        setConnections({});
        setSelected(null);
        setChecked(false);
        setRoundScore(0);
      } catch (e) {
        console.error(e);
        setError("Couldn't build this round. Tap retry.");
      } finally {
        setLoading(false);
      }
    },
    [pool, level]
  );

  useLayoutEffect(() => {
    fetchBoard(0);
  }, [fetchBoard]);

  const measure = useCallback(() => {
    const c = boardRef.current;
    if (!c) return;
    const cr = c.getBoundingClientRect();
    const w = wordRefs.current.map((el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - cr.left + r.width, y: r.top - cr.top + r.height / 2 };
    });
    const d = defRefs.current.map((el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - cr.left, y: r.top - cr.top + r.height / 2 };
    });
    setRects({ words: w, defs: d });
  }, []);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (boardRef.current) ro.observe(boardRef.current);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [measure, board, connections, checked, loading]);

  const connect = (wordIdx, defIdx) => {
    setConnections((prev) => {
      const next = { ...prev };
      for (const k in next) if (Number(next[k]) === defIdx) delete next[k];
      next[wordIdx] = defIdx;
      return next;
    });
  };

  const onWordTap = (wi) => {
    if (checked || loading) return;
    if (selected?.side === "def") {
      connect(wi, selected.index);
      setSelected(null);
    } else if (selected?.side === "word" && selected.index === wi) {
      setConnections((prev) => {
        const n = { ...prev };
        delete n[wi];
        return n;
      });
      setSelected(null);
    } else {
      setSelected({ side: "word", index: wi });
    }
  };

  const onDefTap = (di) => {
    if (checked || loading) return;
    if (selected?.side === "word") {
      connect(selected.index, di);
      setSelected(null);
    } else if (selected?.side === "def" && selected.index === di) {
      setConnections((prev) => {
        const n = { ...prev };
        for (const k in n) if (Number(n[k]) === di) delete n[k];
        return n;
      });
      setSelected(null);
    } else {
      setSelected({ side: "def", index: di });
    }
  };

  const allConnected = board && Object.keys(connections).length === PAIRS;

  const handleCheck = () => {
    if (!board || !allConnected || checked) return;
    let s = 0;
    for (let wi = 0; wi < PAIRS; wi++) {
      if (Number(connections[wi]) === board.correctMap[wi]) s++;
    }
    setRoundScore(s);
    setTotalScore((t) => t + s);
    setChecked(true);
    setSelected(null);
  };

  const handleNext = () => {
    if (round + 1 >= ROUNDS) {
      const totalPairs = ROUNDS * PAIRS;
      const pct = Math.round((totalScore / totalPairs) * 100);
      setFinished(true);
      onGameComplete?.({ scorePct: pct });
      if (totalScore > 0) onXpEarned?.(totalScore * 10, totalScore);
    } else {
      setRound((r) => r + 1);
      fetchBoard(round + 1);
    }
  };

  const handleRetry = () => {
    setRound(0);
    setTotalScore(0);
    setFinished(false);
    fetchBoard(0);
  };

  /* ---------- Empty ---------- */
  if (pool.length < PAIRS) {
    return (
      <div className="min-h-screen bg-background premium-mesh flex flex-col items-center justify-center px-4">
        <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground mb-5 text-center">
          Not enough words for Definition Match yet.
        </p>
        <button
          onClick={onBack}
          className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold select-none"
        >
          Back to Skill Hub
        </button>
      </div>
    );
  }

  /* ---------- Finished ---------- */
  if (finished) {
    const totalPairs = ROUNDS * PAIRS;
    const pct = Math.round((totalScore / totalPairs) * 100);
    const earned = totalScore * 10;
    const pass = pct >= 60;
    return (
      <div className="min-h-screen bg-background premium-mesh flex flex-col items-center justify-center px-4 py-10">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm text-center">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-5 ${pass ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
            <Trophy className={`w-10 h-10 ${pass ? "text-emerald-400" : "text-amber-400"}`} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-1">Definition Match</p>
          <h2 className="text-2xl font-bold text-foreground mb-1">{pct}%</h2>
          <p className="text-sm text-muted-foreground mb-6">{totalScore} / {totalPairs} matched · {earned} XP</p>
          <div className="flex gap-3">
            <button onClick={handleRetry} className="flex-1 h-12 rounded-xl border border-border bg-card text-foreground font-semibold flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors select-none">
              <RotateCcw className="w-4 h-4" /> Play again
            </button>
            <button onClick={onBack} className="flex-1 h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg select-none">
              <BookOpen className="w-4 h-4" /> Skill Hub
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const connectedDefForWord = (wi) => (connections[wi] != null ? Number(connections[wi]) : null);

  return (
    <div className="min-h-screen bg-background premium-mesh flex flex-col">
      <header className="bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between safe-header">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-xs font-bold text-blue-400 truncate max-w-[55%] text-center">Definition Match</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold select-none">
          <Star className="w-3.5 h-3.5" /> {totalScore}
        </div>
      </header>

      <div className="h-1 bg-muted/40">
        <motion.div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" animate={{ width: `${((round + (checked ? 1 : 0)) / ROUNDS) * 100}%` }} />
      </div>

      <div className="flex-1 flex flex-col px-4 py-5 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground font-medium">Round {round + 1} of {ROUNDS}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Shuffle className="w-3 h-3" /> Tap a word, then its definition
          </p>
        </div>

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Crafting subtle definitions…</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button onClick={() => fetchBoard(round)} className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 select-none">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        )}

        {!loading && !error && board && (
          <>
            <div ref={boardRef} className="relative flex-1">
              {/* SVG connection layer */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
                {Object.entries(connections).map(([wi, di]) => {
                  const w = rects.words[Number(wi)];
                  const d = rects.defs[Number(di)];
                  if (!w || !d) return null;
                  const correct = board.correctMap[Number(wi)] === Number(di);
                  const color = checked ? (correct ? OK : BAD) : ACCENT;
                  const mid = (w.x + d.x) / 2;
                  return (
                    <path
                      key={wi}
                      d={`M ${w.x} ${w.y} C ${mid} ${w.y}, ${mid} ${d.y}, ${d.x} ${d.y}`}
                      stroke={color}
                      strokeWidth={3}
                      fill="none"
                      strokeLinecap="round"
                      style={{ filter: `drop-shadow(0 0 5px ${color})`, opacity: 0.9 }}
                    />
                  );
                })}
              </svg>

              <div className="relative grid grid-cols-2 gap-3 sm:gap-6">
                {/* Words */}
                <div className="space-y-3">
                  {board.words.map((w, wi) => {
                    const sel = selected?.side === "word" && selected.index === wi;
                    const con = connectedDefForWord(wi);
                    const correct = checked && board.correctMap[wi] === con;
                    const wrong = checked && con != null && board.correctMap[wi] !== con;
                    return (
                      <button
                        key={wi}
                        ref={(el) => (wordRefs.current[wi] = el)}
                        onClick={() => onWordTap(wi)}
                        className={`w-full text-left rounded-2xl border p-3.5 backdrop-blur-md transition-all select-none ${
                          wrong
                            ? "border-rose-500/70 bg-rose-500/10"
                            : correct
                            ? "border-emerald-500/70 bg-emerald-500/10"
                            : sel
                            ? "border-blue-400 bg-blue-500/10"
                            : con != null
                            ? "border-blue-500/40 bg-blue-500/5"
                            : "border-white/10 bg-white/[0.04] hover:border-white/25"
                        }`}
                      >
                        <p className="text-base font-bold text-foreground leading-tight">{w.english}</p>
                        {w.pronunciation && (
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{w.pronunciation}</p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Definitions */}
                <div className="space-y-3">
                  {board.defs.map((d, di) => {
                    const sel = selected?.side === "def" && selected.index === di;
                    const usedBy = Object.entries(connections).find(([, v]) => Number(v) === di);
                    const correct = checked && usedBy && board.correctMap[Number(usedBy[0])] === di;
                    const wrong = checked && usedBy && board.correctMap[Number(usedBy[0])] !== di;
                    return (
                      <button
                        key={di}
                        ref={(el) => (defRefs.current[di] = el)}
                        onClick={() => onDefTap(di)}
                        className={`w-full text-left rounded-2xl border p-3.5 backdrop-blur-md transition-all select-none min-h-[64px] flex items-center ${
                          wrong
                            ? "border-rose-500/70 bg-rose-500/10"
                            : correct
                            ? "border-emerald-500/70 bg-emerald-500/10"
                            : sel
                            ? "border-blue-400 bg-blue-500/10"
                            : usedBy
                            ? "border-blue-500/40 bg-blue-500/5"
                            : "border-white/10 bg-white/[0.04] hover:border-white/25"
                        }`}
                      >
                        <p className="text-sm text-foreground/90 leading-snug">{d}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Result strip */}
            <AnimatePresence>
              {checked && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center justify-center gap-2 text-sm">
                  {roundScore === PAIRS ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5"><Check className="w-4 h-4" /> Perfect! {roundScore}/{PAIRS}</span>
                  ) : (
                    <span className="text-amber-400 font-semibold flex items-center gap-1.5"><X className="w-4 h-4" /> {roundScore}/{PAIRS} correct</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 flex gap-3">
              {!checked ? (
                <>
                  <button
                    onClick={() => { setConnections({}); setSelected(null); }}
                    disabled={Object.keys(connections).length === 0}
                    className="h-12 px-4 rounded-xl border border-border bg-card text-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-40 select-none"
                  >
                    <RefreshCw className="w-4 h-4" /> Clear
                  </button>
                  <button
                    onClick={handleCheck}
                    disabled={!allConnected}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg disabled:opacity-40 disabled:shadow-none select-none"
                  >
                    Check answers
                  </button>
                </>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg flex items-center justify-center gap-2 select-none"
                >
                  {round + 1 >= ROUNDS ? "See results" : "Next round"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}