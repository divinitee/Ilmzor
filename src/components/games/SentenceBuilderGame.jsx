import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Shuffle, CheckCircle2 } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";

// Difficulty drives sentence-complexity targets.
const DIFFICULTY = {
  beginner:     { minWords: 3,  label: "Beginner",     target: "one simple complete sentence (subject + verb)",     connectors: [], hintKey: "beginner" },
  intermediate: { minWords: 5,  label: "Intermediate",  target: "one complete sentence (5+ words)",                connectors: [], hintKey: "intermediate" },
  advanced:     { minWords: 7,  label: "Advanced",      target: "a compound or complex sentence (7+ words) using a linking word", connectors: ["and", "but", "because", "although", "while", "so", "however"], hintKey: "advanced" },
  proficient:   { minWords: 9,  label: "Proficient",    target: "a complex / compound-complex sentence (9+ words) with a subordinate clause", connectors: ["because", "although", "while", "when", "if", "that", "which", "since", "unless"], hintKey: "proficient" },
};

// Groups of semantically related words
const WORD_GROUPS = [
  ["travel", "journey", "trip", "voyage", "expedition", "tour"],
  ["happy", "joyful", "glad", "pleased", "delighted", "cheerful"],
  ["angry", "furious", "upset", "irritated", "annoyed"],
  ["speak", "talk", "say", "tell", "communicate", "discuss"],
  ["big", "large", "huge", "enormous", "vast", "immense"],
  ["small", "tiny", "little", "miniature", "petite"],
  ["fast", "quick", "rapid", "swift", "speedy"],
  ["beautiful", "lovely", "gorgeous", "attractive", "stunning"],
  ["work", "job", "task", "duty", "occupation", "career"],
  ["friend", "companion", "buddy", "pal", "colleague"],
];

function tokenise(s) {
  return s.trim().toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
}

// Catch word-list / random spam before we spend an LLM call.
function quickFail(sentence, theme) {
  const words = tokenise(sentence);
  if (words.length === 0) {
    return { grammar: 0, relevance: 0, creativity: 0, tipKey: "empty" };
  }

  const themeWords = tokenise(theme);
  const themeMatchCount = words.filter(w => themeWords.some(tw => w === tw || w.startsWith(tw) || tw.startsWith(w))).length;

  const hasVerbish = /\b(is|are|was|were|be|been|being|am|go|goes|went|gone|come|came|make|made|see|saw|seen|do|did|done|have|has|had|want|wanted|like|liked|travel|travels|travelled|work|works|worked|talk|talks|talked|say|said|tell|told)\b/i.test(sentence);
  if (themeMatchCount >= 3 && !hasVerbish && words.length <= 12) {
    return {
      grammar: 0,
      relevance: Math.round((themeMatchCount / Math.max(words.length, 1)) * 40),
      creativity: 0,
      tipKey: "no_verb"
    };
  }

  const unique = new Set(words);
  if (words.length >= 4 && unique.size <= 2) {
    return { grammar: 0, relevance: 5, creativity: 0, tipKey: "repeat" };
  }

  if (words.length < 2) {
    return { grammar: 0, relevance: 0, creativity: 0, tipKey: "too_short" };
  }

  return null;
}

async function evaluateSentence(sentence, theme, themeWords, difficulty) {
  const fail = quickFail(sentence, theme);
  if (fail) return fail;

  const cfg = DIFFICULTY[difficulty] || DIFFICULTY.intermediate;

  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: [
        `You are a strict, calibrated English-language examiner for ${cfg.label.toUpperCase()} learners.`,
        `Theme words the student may use: ${themeWords.join(", ")}.`,
        `Level target: the student must write ${cfg.target}. Minimum ${cfg.minWords} words.`,
        `The student submitted: "${sentence}".`,
        ``,
        `Grade STRICTLY and calibrated to this level:`,
        difficulty === "proficient"
          ? `PROFICIENT: require a complex/compound-complex sentence with a subordinate clause (because/although/while/when/if/that/which). A simple sentence must score low on grammar and creativity even if correct.`
          : difficulty === "advanced"
            ? `ADVANCED: require a compound or complex sentence with a linking word. A correct but merely simple sentence caps grammar at ~55 and creativity at ~40.`
            : difficulty === "intermediate"
              ? `INTERMEDIATE: require a complete sentence of 5+ words. Shorter or fragmentary sentences score lower.`
              : `BEGINNER: accept a simple correct sentence (3+ words). Be encouraging but still require a real verb.`,
        ``,
        `Word-lists / synonyms with no verb, repeated words, or off-theme gibberish must score 0-15 on grammar and creativity.`,
        ``,
        `Grammar rubric (be strict): 90-100 flawless; 70-89 minor errors; 40-69 several mistakes; 15-39 fragment; 0-14 not a sentence.`,
        `Relevance: how many words genuinely fit the theme "${theme}".`,
        `Creativity: originality and variety. Word lists / trivial statements score 0-15.`,
        ``,
        `Each score is a whole number 0-100. Then give ONE short, specific, encouraging tip in English (max 15 words). Reply in JSON only.`,
      ].join("\n"),
      response_json_schema: {
        type: "object",
        properties: {
          grammar: { type: "number" },
          relevance: { type: "number" },
          creativity: { type: "number" },
          tip: { type: "string" }
        }
      }
    });
    const clamp = v => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    return {
      grammar: clamp(res.grammar),
      relevance: clamp(res.relevance),
      creativity: clamp(res.creativity),
      tip: res.tip || "Keep practising!"
    };
  } catch {
    return { grammar: 0, relevance: 0, creativity: 0, tipKey: "error" };
  }
}

export default function SentenceBuilderGame({ words, onBack, onNewRound, onGameComplete, trialExhausted, difficulty = "beginner" }) {
  const { t } = useAppLang();
  const cfg = DIFFICULTY[difficulty] || DIFFICULTY.beginner;
  const [groupIdx, setGroupIdx] = useState(null);
  const [sentence, setSentence] = useState("");
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [round, setRound] = useState(0);

  const getGroup = (idx) => {
    const g = WORD_GROUPS[idx % WORD_GROUPS.length];
    const extra = words.filter(w => g.some(gw => w.english.toLowerCase().includes(gw) || gw.includes(w.english.toLowerCase()))).map(w => w.english);
    return [...new Set([...g, ...extra])].slice(0, 7);
  };

  const startRound = () => {
    const idx = Math.floor(Math.random() * WORD_GROUPS.length);
    setGroupIdx(idx);
    setSentence("");
    setResult(null);
  };

  useEffect(() => { startRound(); }, []);

  const currentGroup = groupIdx !== null ? getGroup(groupIdx) : [];
  const theme = currentGroup[0] || "";

  const handleSubmit = async () => {
    if (!sentence.trim() || checking) return;
    setChecking(true);
    const res = await evaluateSentence(sentence, theme, currentGroup, difficulty);
    setResult(res);
    setChecking(false);
    const avg = Math.round((res.grammar + res.relevance + res.creativity) / 3);
    if (onGameComplete) onGameComplete({ scorePct: avg, correct: res.grammar, total: 100 });
  };

  const nextRound = () => {
    if (trialExhausted) { onBack(); return; }
    if (onNewRound) onNewRound();
    setRound(r => r + 1);
    startRound();
  };

  const avg = result ? Math.round((result.grammar + result.relevance + result.creativity) / 3) : 0;
  const wordCount = tokenise(sentence).length;
  const meetsMin = wordCount >= cfg.minWords;

  return (
    <div className="max-w-sm mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-muted-foreground text-sm hover:text-foreground select-none">← {t("gameui.back")}</button>
        <span className="text-xs bg-violet-500/10 text-violet-700 font-semibold px-2.5 py-1 rounded-full">{cfg.label}</span>
        <span className="text-xs text-muted-foreground">#{round + 1}</span>
      </div>

      {/* Word group display */}
      <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-200 dark:border-violet-800 rounded-2xl p-5 mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">{t("gameui.sentence_build_prompt")}</p>
        <div className="flex flex-wrap gap-2">
          {currentGroup.map((w, i) => (
            <motion.span
              key={w}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSentence(s => s ? s + " " + w : w)}
              className="px-3 py-1.5 bg-background border border-violet-300 dark:border-violet-700 text-foreground rounded-full text-sm font-medium cursor-pointer hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950 transition-colors select-none"
            >
              {w}
            </motion.span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">{t("gameui.sentence_tap_hint")}</p>
      </div>

      {/* Difficulty instruction */}
      <div className="bg-amber-500/10 border border-amber-300 dark:border-amber-700 rounded-xl p-3 mb-4">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">🎯 {t("gameui.sentence_task", { level: cfg.label })}</p>
        <p className="text-xs text-foreground/80">{t(`gameui.sentence_hints.${cfg.hintKey}`)}</p>
        {cfg.connectors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {cfg.connectors.map(c => (
              <button
                key={c}
                onClick={() => !result && setSentence(s => s ? s + " " + c : c)}
                className="text-[11px] px-2 py-0.5 rounded-full bg-background border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors select-none"
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-2">{t("gameui.sentence_min_words", { min: cfg.minWords, n: wordCount })} {meetsMin ? "✓" : "✗"}</p>
      </div>

      {/* Text input */}
      <textarea
        value={sentence}
        onChange={e => setSentence(e.target.value)}
        placeholder={t("gameui.sentence_placeholder")}
        className="w-full h-28 px-4 py-3 border-2 border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors resize-none mb-4"
        disabled={!!result}
      />

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-background border border-border rounded-2xl p-5 mb-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className={`w-5 h-5 ${avg >= 70 ? "text-emerald-500" : avg >= 40 ? "text-amber-500" : "text-destructive"}`} />
              <span className="font-semibold text-foreground">
                {avg >= 70 ? t("gameui.result_great") : avg >= 40 ? t("gameui.result_good") : t("gameui.result_try_again")}
              </span>
              <span className="ml-auto text-lg font-bold text-primary">{avg}%</span>
            </div>
            <div className="space-y-2 mb-4">
              {[
                { label: t("gameui.grammar"), val: result.grammar },
                { label: t("gameui.relevance"), val: result.relevance },
                { label: t("gameui.creativity"), val: result.creativity },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{label}</span><span className="font-semibold text-foreground">{val}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} className="h-full rounded-full bg-primary" />
                  </div>
                </div>
              ))}
            </div>
            {result.tip && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">💬 {result.tipKey ? t(`gameui.sentence_tips.${result.tipKey}`) : result.tip}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!result ? (
        <Button onClick={handleSubmit} disabled={!sentence.trim() || checking} className="w-full">
          {checking ? t("gameui.checking") : t("gameui.check_sentence")}
        </Button>
      ) : (
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 select-none">{t("gameui.exit")}</Button>
          <Button onClick={nextRound} className="flex-1 select-none">
            <Shuffle className="w-4 h-4 mr-1" /> {t("gameui.new_round")}
          </Button>
        </div>
      )}
    </div>
  );
}