import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, MousePointer2, Sparkles } from "lucide-react";

const points = [
  { title: "Personalized", text: "Your path responds to what you actually need.", x: "18%", y: "72%" },
  { title: "Connected", text: "Grammar, vocabulary, skills and practice work together.", x: "42%", y: "58%" },
  { title: "Adaptive", text: "The system changes as your performance changes.", x: "62%", y: "39%" },
  { title: "Measurable", text: "Progress reflects learning, not just activity.", x: "78%", y: "55%" },
  { title: "Intelligent", text: "AI turns learner signals into the next useful action.", x: "88%", y: "23%" },
];

export default function RoadmapBeacon() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const begin = () => { if (step < points.length) { setStarted(true); setStep((value) => value + 1); } };
  const complete = step >= points.length;
  return (
    <div className="relative">
      <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ y: -4 }} transition={{ duration: 0.45 }} className="relative overflow-hidden rounded-[2rem] border border-violet-400/20 bg-slate-950/75 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,.32)] p-5 sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(139,92,246,.14),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(99,102,241,.09),transparent_42%)] pointer-events-none" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-violet-300 font-black"><Sparkles className="w-3 h-3" /> The VIRORA journey</div>
              <h3 className="mt-2 text-xl sm:text-2xl font-bold text-slate-50">{started ? "One system. One learning path." : "Learning is a journey."}</h3>
              <p className="mt-2 text-xs sm:text-sm leading-6 text-slate-400 max-w-sm">{started ? "Watch the road unfold — each layer changes what comes next." : "Click to see what VIRORA is being built to become."}</p>
            </div>
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">{complete ? "FULL SYSTEM" : step + " / " + points.length}</span>
          </div>
          <div className="relative mt-5 h-[255px] sm:h-[285px] overflow-hidden rounded-[1.5rem] border border-white/5 bg-[#080916]">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,.07) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            <svg viewBox="0 0 600 300" className="absolute inset-0 w-full h-full" preserveAspectRatio="none" aria-hidden="true">
              <path d="M-20 270 C95 225 115 155 205 170 C295 185 305 245 385 208 C470 168 410 92 500 82 C550 76 570 48 620 30" fill="none" stroke="rgba(71,85,105,.38)" strokeWidth="72" strokeLinecap="round" />
              <motion.path d="M-20 270 C95 225 115 155 205 170 C295 185 305 245 385 208 C470 168 410 92 500 82 C550 76 570 48 620 30" fill="none" stroke="rgba(124,58,237,.78)" strokeWidth="58" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: started ? Math.min(1, step / points.length + .08) : 0, opacity: started ? 1 : 0 }} transition={{ duration: .9, ease: [0.22,1,0.36,1] }} />
              <path d="M-20 270 C95 225 115 155 205 170 C295 185 305 245 385 208 C470 168 410 92 500 82 C550 76 570 48 620 30" fill="none" stroke="rgba(226,232,240,.55)" strokeWidth="2" strokeDasharray="9 11" strokeLinecap="round" />
            </svg>
            {points.map((point, index) => { const visible = step > index; return (
              <motion.div key={point.title} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: point.x, top: point.y }} initial={false} animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : .5 }} transition={{ duration: .35 }}>
                <div className="relative"><div className="absolute inset-[-7px] rounded-full bg-violet-400/15 blur-md" /><div className="relative w-8 h-8 rounded-full border-2 border-violet-200 bg-[#111126] shadow-[0_0_22px_rgba(139,92,246,.5)] flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full bg-violet-300" /></div>
                  <div className="absolute bottom-11 left-1/2 -translate-x-1/2 w-36 text-center"><div className="text-[10px] uppercase tracking-[0.14em] font-black text-violet-200">{point.title}</div><div className="mt-1 text-[9px] leading-4 text-slate-500">{point.text}</div></div>
                </div>
              </motion.div>
            ); })}
            {!started && <motion.div initial={{ opacity: .7 }} animate={{ opacity: [0.7, 1, .7], y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"><div className="mx-auto w-12 h-12 rounded-2xl border border-violet-300/20 bg-violet-500/10 flex items-center justify-center"><MousePointer2 className="w-6 h-6 text-violet-200" /></div><div className="mt-2 text-[10px] uppercase tracking-[0.18em] font-black text-violet-200">Click to explore</div></motion.div>}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={begin} className="inline-flex items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-500/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-violet-200 hover:bg-violet-500/15 transition-colors">
              <motion.span animate={{ scale: started && !complete ? [1, .84, 1] : [1,1] }} transition={{ duration: .55, repeat: started && !complete ? Infinity : 0, repeatDelay: .9 }} className="inline-flex"><MousePointer2 className="w-3.5 h-3.5" /></motion.span>
              {complete ? "Journey complete" : started ? "Continue" : "Click to explore"}
            </button>
            {complete ? <Link to="/roadmap" className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-300 hover:text-violet-200">Full roadmap <ArrowUpRight className="w-3.5 h-3.5" /></Link> : <span className="text-[10px] text-slate-600">VIRORA · built layer by layer</span>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}