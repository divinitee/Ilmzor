import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Shuffle, CheckCircle2 } from "lucide-react";

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
// Returns a hard-fail result object, or null to proceed to LLM grading.
function quickFail(sentence, theme) {
  const words = tokenise(sentence);
  if (words.length === 0) {
    return { grammar: 0, relevance: 0, creativity: 0, tip: "Iltimos, kamida bitta jumla yozing." };
  }

  const themeWords = tokenise(theme);
  const themeMatchCount = words.filter(w => themeWords.some(tw => w === tw || w.startsWith(tw) || tw.startsWith(w))).length;

  // Word salad: almost every word is the theme/its synonyms, and there's no verb-like structure.
  const hasVerbish = /\b(is|are|was|were|be|been|being|am|go|goes|went|gone|come|came|make|made|see|saw|seen|do|did|done|have|has|had|want|wanted|like|liked|travel|travels|travelled|work|works|worked|talk|talks|talked|say|said|tell|told)\b/i.test(sentence);
  if (themeMatchCount >= 3 && !hasVerbish && words.length <= 12) {
    return {
      grammar: 0,
      relevance: Math.round((themeMatchCount / Math.max(words.length, 1)) * 40),
      creativity: 0,
      tip: "So'zlarni ketma-ket yozish jumla emas. To'liq fikr bildiruvchi gap tuzing."
    };
  }

  // All duplicates / repetition of one word
  const unique = new Set(words);
  if (words.length >= 4 && unique.size <= 2) {
    return { grammar: 0, relevance: 5, creativity: 0, tip: "So'zni qaytarib yozish jumla emas. Sub'ekt + fe'l ishlatib yangi gap tuzing." };
  }

  // Way too short to be a sentence
  if (words.length < 2) {
    return { grammar: 0, relevance: 0, creativity: 0, tip: "Juda qisqa. To'liq jumla yozing (sub'ekt + fe'l)." };
  }

  return null;
}

async function evaluateSentence(sentence, theme) {
  const fail = quickFail(sentence, theme);
  if (fail) return fail;

  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: [
        `You are a strict, calibrated English-language examiner for B1 learners.`,
        `A student was asked to write ONE meaningful English sentence using words about the theme "${theme}".`,
        `The student submitted: "${sentence}".`,
        ``,
        `Grade STRICTLY. These are NOT sentences and must score very low on grammar and creativity (0-15):`,
        `- a bare list of words or synonyms with no verb or structure (e.g. "angry furious upset irritated")`,
        `- a string of words repeated back`,
        `- words unrelated to the theme`,
        `- gibberish or a single word repeated`,
        ``,
        `Grammar rubric (be strict, not generous):`,
        `- 90-100 = flawless complete sentence, correct tense, word order, agreement`,
        `- 70-89 = minor error(s) but clear and complete sentence`,
        `- 40-69 = understandable but several grammar mistakes`,
        `- 15-39 = fragment, missing key verb, or badly broken`,
        `- 0-14 = not a sentence at all`,
        ``,
        `Relevance rubric: how many words genuinely fit the theme "${theme}". Listing theme synonyms without a sentence still counts as relevant to theme.`,
        `Creativity rubric: originality and variety of the sentence. A word list or a trivial statement scores 0-15.`,
        ``,
        `Each score must be a whole number 0-100. Then give ONE short, specific, encouraging tip in English (max 15 words) on how to improve. Reply in JSON only.`,
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
    // Clamp to valid range in case the model returns odd values.
    const clamp = v => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    return {
      grammar: clamp(res.grammar),
      relevance: clamp(res.relevance),
      creativity: clamp(res.creativity),
      tip: res.tip || "Keep practising!"
    };
  } catch {
    return { grammar: 0, relevance: 0, creativity: 0, tip: "Baholashda xatolik. Iltimos, qaytadan urinib ko'ring." };
  }
}

export default function SentenceBuilderGame({ words, onBack, onNewRound, trialExhausted }) {
  const [groupIdx, setGroupIdx] = useState(null);
  const [sentence, setSentence] = useState("");
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [round, setRound] = useState(0);
  const [history, setHistory] = useState([]);

  // Find matching groups from the vocabulary
  const vocabEnglish = words.map(w => w.english.toLowerCase());

  const getGroup = (idx) => {
    const g = WORD_GROUPS[idx % WORD_GROUPS.length];
    // Supplement with vocab words that match
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
    const res = await evaluateSentence(sentence, theme);
    setResult(res);
    setHistory(h => [...h, { sentence, group: currentGroup, result: res }]);
    setChecking(false);
  };

  const nextRound = () => {
    if (trialExhausted) {
      onBack();
      return;
    }
    if (onNewRound) onNewRound();
    setRound(r => r + 1);
    startRound();
  };

  const avg = result ? Math.round((result.grammar + result.relevance + result.creativity) / 3) : 0;

  return (
    <div className="max-w-sm mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-muted-foreground text-sm hover:text-foreground">← Orqaga</button>
        <span className="text-xs bg-violet-500/10 text-violet-700 font-semibold px-2.5 py-1 rounded-full">Jumla yasash</span>
        <span className="text-xs text-muted-foreground">#{round + 1}</span>
      </div>

      {/* Word group display */}
      <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-200 dark:border-violet-800 rounded-2xl p-5 mb-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Quyidagi so'zlardan foydalanib jumla tuzing:</p>
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
        <p className="text-xs text-muted-foreground mt-3">💡 So'zni bosib jumla ichiga qo'shing yoki o'zingiz yozing</p>
      </div>

      {/* Text input */}
      <textarea
        value={sentence}
        onChange={e => setSentence(e.target.value)}
        placeholder="Shu so'zlardan foydalanib bir jumla yozing..."
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
                {avg >= 70 ? "Ajoyib!" : avg >= 40 ? "Yaxshi!" : "Yana urinib ko'ring"}
              </span>
              <span className="ml-auto text-lg font-bold text-primary">{avg}%</span>
            </div>
            <div className="space-y-2 mb-4">
              {[
                { label: "Grammatika", val: result.grammar },
                { label: "Mavzuga aloqadorlik", val: result.relevance },
                { label: "Ijodkorlik", val: result.creativity },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{label}</span><span className="font-semibold text-foreground">{val}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${val}%` }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
            {result.tip && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">💬 {result.tip}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!result ? (
        <Button onClick={handleSubmit} disabled={!sentence.trim() || checking} className="w-full">
          {checking ? "Tekshirilmoqda..." : "Jumlani tekshirish"}
        </Button>
      ) : (
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">Chiqish</Button>
          <Button onClick={nextRound} className="flex-1">
            <Shuffle className="w-4 h-4 mr-1" /> Yangi tur
          </Button>
        </div>
      )}
    </div>
  );
}