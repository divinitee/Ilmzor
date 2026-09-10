import React, { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ArrowRight, RotateCcw, Trophy } from "lucide-react";
import PracticeItem from "@/components/grammar/PracticeItem";
import { composeRound, recordSeen } from "@/lib/grammarPractice/composition";
import { gradeItem, hasResponse, emptyResponse, scoreRound } from "@/lib/grammarPractice/grading";
import { historyFor, saveHistory } from "@/lib/grammarPractice/history";

// One round: compose, ask, mark, summarise. The composer decides WHICH items
// and the grader decides IF an answer is right; this owns only the sequence and
// what the student sees.

const ACCENT = "#3E9E92";
const ROUND_SIZE = 10;

export default function PracticeRunner({ items, stage, topicKey, onExit, onAgain }) {
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));

  const round = useMemo(
    () => composeRound({ items, stage, size: ROUND_SIZE, seed, history: historyFor(topicKey) }),
    [items, stage, seed, topicKey]
  );

  const [i, setI] = useState(0);
  const [responses, setResponses] = useState(() => round.items.map((it) => emptyResponse(it)));
  const [marked, setMarked] = useState(null);
  const [done, setDone] = useState(false);

  const item = round.items[i];
  const ready = item && hasResponse(item, responses[i]);

  const setResponse = useCallback((v) => {
    setResponses((prev) => { const next = [...prev]; next[i] = v; return next; });
  }, [i]);

  const submit = () => { if (ready && !marked) setMarked(gradeItem(item, responses[i])); };

  const next = () => {
    setMarked(null);
    if (i + 1 < round.items.length) { setI(i + 1); return; }
    saveHistory(topicKey, recordSeen(historyFor(topicKey), round.variantIds));
    setDone(true);
  };

  if (!round.items.length) {
    return (
      <div className="premium-card rounded-[28px] p-8 text-center">
        <p className="text-sm text-muted-foreground">No practice content for this stage yet.</p>
        <button onClick={onExit} className="neo-pill mt-5 px-5 py-2 text-sm font-semibold text-foreground select-none">Back</button>
      </div>
    );
  }

  if (done) {
    const { correct, total, pct } = scoreRound(round.items, responses);
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="premium-card rounded-[28px] p-6 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
             style={{ background: "rgba(62,158,146,0.15)", border: `1px solid ${ACCENT}40` }}>
          <Trophy className="w-7 h-7" style={{ color: ACCENT }} />
        </div>
        <p className="text-3xl font-bold text-foreground">{correct}<span className="text-muted-foreground text-xl"> / {total}</span></p>
        <p className="text-sm text-muted-foreground mt-1 mb-5">{pct}% this round</p>
        <div className="flex gap-2 justify-center">
          <button onClick={onAgain} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-[#04201d] select-none"
                  style={{ background: `linear-gradient(180deg, #4fb9ab, ${ACCENT})` }}>
            <RotateCcw className="w-4 h-4" /> Practise again
          </button>
          <button onClick={onExit} className="neo-pill px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-white/10 transition-colors select-none">Done</button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">Question {i + 1} <span className="text-muted-foreground font-normal">of {round.items.length}</span></p>
        <button onClick={onExit} className="neo-pill px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors select-none">Exit</button>
      </div>

      <div className="h-1 rounded-full bg-white/10 mb-5 overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: ACCENT }}
                    animate={{ width: `${((i + (marked ? 1 : 0)) / round.items.length) * 100}%` }} transition={{ duration: 0.3 }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={item.variantId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2 }} className="premium-card rounded-[28px] p-5 md:p-6">
          <PracticeItem item={item} response={responses[i]} onChange={setResponse} disabled={Boolean(marked)} />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {marked && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="premium-card rounded-2xl px-4 py-3 mt-3 flex items-start gap-3">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: marked.correct ? `${ACCENT}22` : "#E08E6022",
                           border: `1px solid ${marked.correct ? ACCENT : "#E08E60"}40` }}>
              {marked.correct ? <Check className="w-4 h-4" style={{ color: ACCENT }} /> : <X className="w-4 h-4" style={{ color: "#E08E60" }} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                {marked.correct ? "Correct" : <>Not quite — it&rsquo;s <span style={{ color: ACCENT }}>{marked.expected}</span></>}
              </span>
              {item.why && <span className="block text-xs text-muted-foreground mt-0.5">{item.why}</span>}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <button type="button" disabled={!ready} onClick={marked ? next : submit}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-[#04201d] select-none transition-all active:scale-[0.99] disabled:opacity-40"
              style={{ background: `linear-gradient(180deg, #4fb9ab, ${ACCENT})` }}>
        {marked ? <>{i + 1 < round.items.length ? "Next" : "Finish"} <ArrowRight className="w-4 h-4" /></> : "Check"}
      </button>
    </>
  );
}
