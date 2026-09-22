import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, MousePointer2, Sparkles } from "lucide-react";

const chapters = [
  { title: "Foundation", kicker: "SHIPPED", text: "The core learning system is in place.", x: "17%", y: "72%" },
  { title: "Personalization", kicker: "BUILDING NOW", text: "VIRORA begins adapting the path to the learner.", x: "43%", y: "58%" },
  { title: "Intelligence", kicker: "NEXT CHAPTER", text: "AI and learner signals make the system increasingly responsive.", x: "69%", y: "40%" },
  { title: "The VIRORA System", kicker: "DESTINATION", text: "Every part works together as one connected learning system.", x: "89%", y: "21%" },
];

const roadPath = "M-30 270 C75 230 115 150 205 168 C295 188 300 240 380 207 C465 172 420 100 500 82 C550 74 575 48 630 28";

export default function RoadmapBeacon() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const complete = step >= chapters.length;
  const advance = () => setStep((value) => Math.min(value + 1, chapters.length));

  return (
    <div className="relative">
      <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ y: -4 }} transition={{ duration: .5 }}
        className="relative overflow-hidden rounded-[2rem] border border-violet-400/20 bg-slate-950/80 backdrop-blur-xl shadow-[0_28px_90px_rgba(0,0,0,.38)] p-5 sm:p-7">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_15%,rgba(139,92,246,.16),transparent_42%),radial-gradient(circle_at_90%_80%,rgba(99,102,241,.10),transparent_45%)]" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-violet-300 font-black"><Sparkles className="w-3 h-3" /> The VIRORA journey</div>
              <h3 className="mt-2 text-xl sm:text-2xl font-bold text-slate-50">{step === 0 ? "Learning is a journey." : complete ? "The destination is a system." : chapters[step - 1].title + "."}</h3>
              <p className="mt-2 text-xs sm:text-sm leading-6 text-slate-400 max-w-sm">{step === 0 ? "Click to travel through the four chapters of VIRORA." : complete ? "Vocabulary, grammar, practice, progress and AI working as one." : chapters[step - 1].text}</p>
            </div>
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">{complete ? "COMPLETE" : step + " / " + chapters.length}</span>
          </div>

          <div className="relative mt-5 h-[255px] sm:h-[285px] overflow-hidden rounded-[1.5rem] border border-white/5 bg-[#070812]">
            <div className="absolute inset-0 opacity-35" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,.065) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,.065) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,.08),transparent_55%)]" />

            <svg viewBox="0 0 600 300" className="absolute inset-0 w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="roadGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="11" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                <filter id="roadSoftGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
                <linearGradient id="roadActive" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6d28d9"/><stop offset="48%" stopColor="#8b5cf6"/><stop offset="78%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#c4b5fd"/></linearGradient>
                <linearGradient id="roadEnergy" x1="0" x2="1"><stop offset="0%" stopColor="#ffffff" stopOpacity="0"/><stop offset="45%" stopColor="#ddd6fe" stopOpacity=".9"/><stop offset="55%" stopColor="#ffffff" stopOpacity="1"/><stop offset="100%" stopColor="#c4b5fd" stopOpacity="0"/></linearGradient>
              </defs>
              <path d={roadPath} fill="none" stroke="rgba(30,41,59,.95)" strokeWidth="72" strokeLinecap="round" />
              <path d={roadPath} fill="none" stroke="rgba(71,85,105,.58)" strokeWidth="61" strokeLinecap="round" />
              <motion.path d={roadPath} fill="none" stroke="rgba(139,92,246,.34)" strokeWidth="88" strokeLinecap="round" filter="url(#roadSoftGlow)" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: step / chapters.length, opacity: step ? [0.34,0.62,0.34] : 0 }} transition={{ pathLength: { duration: .9, ease: [0.22,1,0.36,1] }, opacity: { duration: 3.6, repeat: step ? Infinity : 0, ease: "easeInOut" } }} />
              <motion.path d={roadPath} fill="none" stroke="url(#roadActive)" strokeWidth="57" strokeLinecap="round" filter="url(#roadGlow)" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: step / chapters.length, opacity: step ? [0.82,1,0.82] : 0 }} transition={{ pathLength: { duration: .9, ease: [0.22,1,0.36,1] }, opacity: { duration: 3.2, repeat: step ? Infinity : 0, ease: "easeInOut" } }} />
              <motion.path d={roadPath} fill="none" stroke="url(#roadEnergy)" strokeWidth="4" strokeLinecap="round" pathLength="1" initial={{ strokeDasharray: "0 1", strokeDashoffset: 0, opacity: 0 }} animate={{ strokeDasharray: Math.max(0.018, (step / chapters.length) * 0.11) + " " + Math.max(0.001, 1 - Math.max(0.018, (step / chapters.length) * 0.11)), strokeDashoffset: step ? [0, -Math.max(0, (step / chapters.length) - 0.11)] : 0, opacity: step ? [0,.95,0] : 0 }} transition={{ strokeDashoffset: { duration: 2.4, repeat: step ? Infinity : 0, ease: "linear" }, opacity: { duration: 2.4, repeat: step ? Infinity : 0, ease: "easeInOut" } }} />
              <path d={roadPath} fill="none" stroke="rgba(226,232,240,.62)" strokeWidth="2" strokeDasharray="9 11" strokeLinecap="round" />
              {step > 0 && <motion.circle r="7" fill="#ddd6fe" stroke="#8b5cf6" strokeWidth="4" filter="url(#roadGlow)" initial={{ offsetDistance: "0%" }} animate={{ offsetDistance: (Math.min(step, chapters.length) / chapters.length) * 100 + "%" }} transition={{ duration: .95, ease: [0.22,1,0.36,1] }} style={{ offsetPath: "path('" + roadPath + "')" }} />}
            </svg>

            {chapters.map((chapter, index) => {
              const visible = step > index;
              const current = step === index + 1;
              return <motion.div key={chapter.title} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: chapter.x, top: chapter.y }} initial={false} animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : .65 }} transition={{ duration: .45 }}>
                <div className="relative">
                  {visible && <motion.div className="absolute inset-[-16px] rounded-full bg-violet-400/25 blur-xl" animate={reduced ? {} : { scale: current ? [1,1.5,1] : [1,1.12,1], opacity: current ? [.8,.18,.8] : [.32,.5,.32] }} transition={{ duration: current ? 2.2 : 4.5, repeat: reduced ? 0 : Infinity, ease: "easeInOut" }} />}
                  <div className={"relative w-8 h-8 rounded-full border-2 bg-[#101026] flex items-center justify-center " + (current ? "border-violet-100 shadow-[0_0_28px_rgba(167,139,250,.95),0_0_60px_rgba(139,92,246,.45)]" : "border-violet-300/80 shadow-[0_0_18px_rgba(139,92,246,.45)]")}><span className={"w-2.5 h-2.5 rounded-full " + (current ? "bg-white shadow-[0_0_12px_rgba(255,255,255,.95)]" : "bg-violet-300")} /></div>
                  <div className={"absolute bottom-11 left-1/2 -translate-x-1/2 w-36 text-center " + (current ? "opacity-100" : "opacity-70")}><div className="text-[9px] uppercase tracking-[0.15em] font-black text-violet-200">{chapter.kicker}</div><div className="mt-1 text-[10px] font-bold text-slate-200">{chapter.title}</div></div>
                </div>
              </motion.div>;
            })}

            {step > 0 && <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_72%,rgba(139,92,246,.11),transparent_22%),radial-gradient(circle_at_68%_42%,rgba(139,92,246,.08),transparent_28%)]" />}
            {step === 0 && <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none" animate={reduced ? {} : { y: [0,-4,0], opacity: [.72,1,.72] }} transition={{ duration: 2, repeat: Infinity }}><div className="mx-auto w-12 h-12 rounded-2xl border border-violet-300/25 bg-violet-500/10 flex items-center justify-center shadow-[0_0_32px_rgba(139,92,246,.22)]"><MousePointer2 className="w-6 h-6 text-violet-200" /></div><div className="mt-2 text-[10px] uppercase tracking-[0.18em] font-black text-violet-200">Click to begin</div></motion.div>}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={advance} className="relative inline-flex items-center gap-2 rounded-xl border border-violet-200/25 bg-violet-500/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-violet-100 hover:bg-violet-500/20 transition-colors shadow-[0_0_24px_rgba(139,92,246,.08)]">
              <motion.span animate={reduced ? {} : { scale: [1,.82,1] }} transition={{ duration: .7, repeat: complete ? 0 : Infinity, repeatDelay: 1.4 }} className="inline-flex"><MousePointer2 className="w-3.5 h-3.5" /></motion.span>
              {complete ? "Journey complete" : step === 0 ? "Click to explore" : "Continue journey"}
            </button>
            {complete ? <Link to="/roadmap" className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-300 hover:text-violet-200">Full roadmap <ArrowUpRight className="w-3.5 h-3.5" /></Link> : <span className="text-[10px] text-slate-600">VIRORA · built layer by layer</span>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}