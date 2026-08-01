import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, RefreshCw } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";

const ease = [0.22, 1, 0.36, 1];

const POOL = [
  { word: "negotiate", phonetic: "/nɪˈɡoʊʃieɪt/", def: "to discuss and reach an agreement", example: "We need to negotiate the contract before Friday.", topic: "business", level: "Intermediate" },
  { word: "deadline", phonetic: "/ˈdɛdlaɪn/", def: "the latest time to finish something", example: "The deadline for the report is tomorrow.", topic: "business", level: "Beginner" },
  { word: "software", phonetic: "/ˈsɒftweər/", def: "programs for a computer", example: "This software helps teams collaborate.", topic: "technology", level: "Beginner" },
  { word: "destination", phonetic: "/ˌdɛstɪˈneɪʃən/", def: "the place you are going to", example: "Paris is our dream destination.", topic: "travel", level: "Intermediate" },
  { word: "assess", phonetic: "/əˈsɛs/", def: "to evaluate or judge", example: "The teacher will assess your progress.", topic: "ielts", level: "Advanced" },
  { word: "assignment", phonetic: "/əˈsaɪnmənt/", def: "a task given to students", example: "I finished my math assignment.", topic: "school", level: "Beginner" },
  { word: "actually", phonetic: "/ˈæktʃuəli/", def: "in fact; really", example: "Actually, I prefer tea over coffee.", topic: "daily", level: "Beginner" },
  { word: "sequel", phonetic: "/ˈsiːkwəl/", def: "a follow-up film or story", example: "The sequel was better than the original.", topic: "movies", level: "Intermediate" },
  { word: "candidate", phonetic: "/ˈkændɪdət/", def: "a person applying for a role", example: "She is a strong candidate for the job.", topic: "interviews", level: "Intermediate" },
  { word: "symptom", phonetic: "/ˈsɪmptəm/", def: "a sign of illness", example: "A fever is a common symptom of the flu.", topic: "medicine", level: "Intermediate" },
  { word: "budget", phonetic: "/ˈbʌdʒɪt/", def: "a plan for spending money", example: "We need to stick to our budget.", topic: "finance", level: "Beginner" },
  { word: "versatile", phonetic: "/ˈvɜːrsətl̩/", def: "able to do many things", example: "She is a versatile and talented player.", topic: "daily", level: "Advanced" },
  { word: "itinerary", phonetic: "/aɪˈtɪnərɛri/", def: "a planned route or schedule", example: "Our itinerary includes three cities.", topic: "travel", level: "Advanced" },
  { word: "innovate", phonetic: "/ˈɪnəveɪt/", def: "to introduce new ideas", example: "Great companies innovate constantly.", topic: "technology", level: "Advanced" },
  { word: "emphasize", phonetic: "/ˈɛmfəsaɪz/", def: "to give special importance", example: "I want to emphasize the importance of practice.", topic: "ielts", level: "Intermediate" },
  { word: "resume", phonetic: "/ˈrɛzʊmeɪ/", def: "a summary of your work history", example: "Update your resume before applying.", topic: "interviews", level: "Intermediate" },
  { word: "prescription", phonetic: "/prɪˈskrɪpʃən/", def: "a written order for medicine", example: "The doctor gave me a prescription.", topic: "medicine", level: "Advanced" },
  { word: "invest", phonetic: "/ɪnˈvɛst/", def: "to put money into something", example: "They invest in new technology.", topic: "finance", level: "Intermediate" },
];

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const dayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
};
const dailyWord = () => POOL[dayOfYear() % POOL.length];

const loadStored = () => {
  try {
    const raw = localStorage.getItem(`wod_${todayKey()}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const store = (w) => {
  try {
    localStorage.setItem(`wod_${todayKey()}`, JSON.stringify(w));
  } catch {
    /* ignore */
  }
};

export default function WordOfTheDay() {
  const { t } = useAppLang();
  const [word, setWord] = useState(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    setWord(loadStored() || dailyWord());
  }, []);

  const speak = (text) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  };

  const refresh = () => {
    if (spinning) return;
    setSpinning(true);
    let next = word;
    let guard = 0;
    while (next === word && guard < 20) {
      next = POOL[Math.floor(Math.random() * POOL.length)];
      guard++;
    }
    setWord(next);
    store(next);
    setTimeout(() => setSpinning(false), 600);
    setTimeout(() => speak(next.word), 250);
  };

  if (!word) return null;
  const topicLabel = t(`landing.interests.topics.${word.topic}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, ease }}
      className="relative"
    >
      <div className="absolute -inset-4 bg-blue-100/70 landing-dark:bg-blue-900/40 rounded-3xl blur-2xl -z-10" />
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="premium-card premium-grain bg-white landing-dark:bg-slate-900 border border-slate-200 landing-dark:border-slate-800 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-teal-600 landing-dark:text-teal-300 bg-teal-50 landing-dark:bg-teal-950/40 px-2.5 py-1 rounded-full">{topicLabel}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 landing-dark:text-slate-500">{word.level}</span>
            <button
              onClick={refresh}
              aria-label="Refresh word"
              className="w-7 h-7 rounded-lg border border-slate-200 landing-dark:border-slate-700 text-slate-500 landing-dark:text-slate-400 flex items-center justify-center hover:text-blue-600 landing-dark:hover:text-blue-400 hover:border-blue-300 landing-dark:hover:border-blue-500 transition-colors select-none"
            >
              <motion.span
                animate={spinning ? { rotate: 360 } : { rotate: 0 }}
                transition={spinning ? { duration: 0.6, ease: "easeInOut" } : { duration: 0 }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </motion.span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={word.word}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease }}
          >
            <div className="flex items-baseline gap-3">
              <h3 className="text-2xl font-bold text-slate-900 landing-dark:text-slate-50">{word.word}</h3>
              <span className="text-sm text-slate-400 landing-dark:text-slate-500">{word.phonetic}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600 landing-dark:text-slate-300">{word.def}</p>
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 landing-dark:bg-slate-800/50 border border-slate-100 landing-dark:border-slate-800">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 landing-dark:text-slate-500 mb-1 font-semibold">{t("landing.hero.preview_example_label")}</p>
              <p className="text-sm text-slate-700 landing-dark:text-slate-300">{word.example}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => speak(word.word)} className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 landing-dark:text-blue-400 select-none">
            <Volume2 className="w-3.5 h-3.5" /> {t("landing.hero.preview_listen")}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-slate-400 landing-dark:text-slate-500">{t("landing.hero.preview_status")}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-4 -right-3 premium-card bg-white landing-dark:bg-slate-900 rounded-xl border border-slate-200 landing-dark:border-slate-800 shadow-lg px-3 py-2 flex items-center gap-2"
      >
        <span className="text-base">🎯</span>
        <span className="text-xs font-semibold text-slate-700 landing-dark:text-slate-200">{t("landing.hero.word_of_day")}</span>
      </motion.div>
    </motion.div>
  );
}