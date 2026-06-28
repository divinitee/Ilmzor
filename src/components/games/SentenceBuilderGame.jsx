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

async function evaluateSentence(sentence, theme) {
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `A student wrote this English sentence using words related to the theme "${theme}": "${sentence}". Evaluate it on three criteria: 1) Grammar (0-100), 2) Relevance to theme (0-100), 3) Creativity (0-100). Also give one short encouraging tip (max 15 words). Reply in JSON only.`,
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
    return res;
  } catch {
    return { grammar: 70, relevance: 70, creativity: 70, tip: "Great effort! Keep practising." };
  }
}

export default function SentenceBuilderGame({ words, onBack }) {
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