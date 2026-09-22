import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, Check, CircleDot, Compass, Clock3, LockKeyhole, Sparkles, Zap } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { CURRENT_STAGE_INDEX, getRoadmapRoster, getRoadmapStages, getRoadmapUI } from "@/content/roadmapJourney";

const legacyRoster = {
  exploring: [["Core learner journey","Refine the path from onboarding and placement to vocabulary, practice and measurable progress.","personalization"],["Deeper learner signals","Identify the signals that should influence what a learner sees and practices next.","personalization"]],
  planned: [["Controlled public release","Define the first public audience, boundaries and launch experience.","foundation"],["Grammar learning system","Stabilize the reusable grammar lesson structure and initial learning subset.","personalization"],["Meaningful progress model","Define mastery before expanding the progress experience.","personalization"]],
  building: [["Meaningful progress tracking","Move beyond game correctness and measure actual learner development.","personalization"],["Grammar progression","Turn the grammar architecture into a usable learn → practice progression.","personalization"],["Landing + pricing promise audit","Make sure what VIRORA promises matches what the product actually delivers.","foundation"]],
  shipped: [["Vocabulary learning engine","The vocabulary corpus, senses and review loop now support a real learning cycle.","foundation"],["Skill Hub experience","The learner can navigate the skill system and enter learning activity.","foundation"],["Founding Learner pricing","Founder-stage pricing, price locking and progression are connected to the product.","foundation"],["Learn / Practice architecture","A shared learning-mode structure is established for the skill experience.","foundation"]]
};
const meta = {
  exploring:{label:"EXPLORING",icon:Compass,color:"text-slate-300",dot:"bg-slate-400",border:"border-slate-700"},
  planned:{label:"COMING NEXT",icon:Clock3,color:"text-blue-300",dot:"bg-blue-400",border:"border-blue-400/20"},
  building:{label:"BUILDING NOW",icon:Zap,color:"text-violet-300",dot:"bg-violet-400",border:"border-violet-400/30"},
  shipped:{label:"SHIPPED",icon:Check,color:"text-emerald-300",dot:"bg-emerald-400",border:"border-emerald-400/20"}
};

function Column({ type, onPick }) {
  const m = meta[type], Icon = m.icon;
  return <div className={`rounded-2xl border ${m.border} bg-white/[0.025] overflow-hidden`}>
    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between"><div className={`flex items-center gap-2 text-[10px] font-black tracking-[0.16em] ${m.color}`}><Icon className="w-3.5 h-3.5"/>{m.label}</div><span className="text-[10px] text-slate-600">{roster[type].length}</span></div>
    <div className="p-3 space-y-2.5">{roster[type].map(([title,desc,stage]) => <motion.button key={title} type="button" onClick={() => onPick({title,desc,stage,type})} whileHover={{x:3}} className="w-full text-left rounded-xl border border-white/5 bg-slate-950/45 hover:bg-white/[0.045] hover:border-white/10 p-3.5 transition-colors"><div className="flex items-start gap-2"><span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${m.dot}`}/><div><div className="text-sm font-semibold text-slate-100">{title}</div><div className="mt-1 text-[11px] leading-5 text-slate-500">{desc}</div><div className="mt-2 text-[9px] uppercase tracking-[0.12em] text-slate-600">{stage}</div></div></div></motion.button>)}</div>
  </div>;
}

export default function Roadmap() {
  const reduced = useReducedMotion();
  const { lang } = useAppLang();
  const stages = getRoadmapStages(lang);
  const ui = getRoadmapUI(lang);
  const roster = getRoadmapRoster(lang);
  const [active, setActive] = useState(CURRENT_STAGE_INDEX);
  const [picked, setPicked] = useState(null);
  const currentStage = stages[CURRENT_STAGE_INDEX];
  const selectedStage = stages[active];
  const currentProgress = 8 + (CURRENT_STAGE_INDEX / (stages.length - 1)) * 84;

  return <div className="landing-dark min-h-screen bg-[#050612] text-slate-50 overflow-x-hidden">
    <div className="fixed inset-0 pointer-events-none"><div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-violet-600/[0.10] blur-[140px]"/><div className="absolute top-[50%] -left-40 w-[500px] h-[500px] rounded-full bg-indigo-600/[0.07] blur-[130px]"/></div>
    <header className="relative z-10 max-w-6xl mx-auto px-5 py-5 flex items-center justify-between"><Link to="/landing" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-violet-300"><ArrowLeft className="w-4 h-4"/>{ui.back}</Link><div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center"><BookOpen className="w-4 h-4 text-violet-300"/></div><span className="font-bold tracking-[0.18em] text-sm">VIRORA</span></div></header>
    <main className="relative z-10 max-w-6xl mx-auto px-5 pb-28">
      <section className="pt-14 sm:pt-20 text-center max-w-4xl mx-auto"><motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{duration:.7}}><div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/[0.07] px-3.5 py-1.5 text-[10px] font-black tracking-[0.18em] text-violet-300"><Sparkles className="w-3.5 h-3.5"/>{ui.journey}</div><h1 className="mt-7 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.035em]">You're here before the<br className="hidden sm:block"/> full system exists.</h1><p className="mt-6 text-base sm:text-lg leading-7 text-slate-400 max-w-2xl mx-auto">VIRORA is being built one layer at a time. Explore what already exists, what we're building now, and where the system is going.</p></motion.div></section>

      <section className="relative mt-20 sm:mt-28">
        <div className="absolute left-[8%] right-[8%] top-[70px] h-px bg-slate-800 hidden md:block"/>
        <motion.div className="absolute left-[8%] top-[70px] h-px bg-gradient-to-r from-violet-500 via-violet-400 to-transparent hidden md:block origin-left" initial={{scaleX:0}} animate={{scaleX:currentProgress/100}} transition={{duration:.9,ease:[0.22,1,0.36,1]}} style={{width:"84%"}}/>
        <div className="grid md:grid-cols-4 gap-8 md:gap-5 relative">
          {stages.map((stage,index) => {
            const current = index === CURRENT_STAGE_INDEX;
            const selected = index === active;
            const done = index < CURRENT_STAGE_INDEX;
            return <button key={stage.id} type="button" onClick={() => setActive(index)} aria-label={`Chapter ${index+1} of ${stages.length} — ${stage.kicker}. ${stage.name}`} className="group text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60 rounded-2xl">
              <div className="relative h-[82px] flex items-center justify-center">
                {!reduced && current && <motion.div className="absolute w-24 h-24 rounded-full border border-violet-400/20" animate={{scale:[.82,1.18,.82],opacity:[.35,0,.35]}} transition={{duration:6.5,repeat:Infinity}}/>}
                {selected && !current && <div className="absolute w-20 h-20 rounded-full border border-white/15" />}
                <div className={`relative z-10 w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${current?"bg-violet-400 border-violet-200 text-slate-950 shadow-[0_0_38px_rgba(139,92,246,.55)]":done?"bg-violet-500/80 border-violet-300 text-white":"bg-[#080917] border-slate-700 text-slate-600 group-hover:border-violet-400/50"}`}>
                  {done ? <Check className="w-5 h-5"/> : <span className="font-bold">{index+1}</span>}
                </div>
              </div>
              <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${current?"text-violet-300":selected?"text-slate-300":"text-slate-600"}`}>{stage.kicker}</div>
              <div className={`mt-1 text-sm font-semibold ${selected?"text-slate-100":"text-slate-400"}`}>{stage.name}</div>
            </button>;
          })}
        </div>

        <motion.div layout className="mt-10 rounded-[2rem] border border-violet-400/15 bg-violet-500/[0.045] shadow-[0_20px_80px_rgba(0,0,0,.24)] overflow-hidden">
          <div className="grid lg:grid-cols-[1.15fr_.85fr]">
            <div className="p-7 sm:p-10">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-violet-300"><CircleDot className="w-3.5 h-3.5"/>{selectedStage.kicker}</div>
              <motion.h2 key={selectedStage.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:.25}} aria-live="polite" className="mt-3 text-2xl sm:text-3xl font-bold">{selectedStage.title}</motion.h2>
              <motion.p key={selectedStage.desc} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.25}} className="mt-4 max-w-xl text-sm sm:text-base leading-7 text-slate-400">{selectedStage.desc}</motion.p>
              <div className="mt-6 flex flex-wrap gap-2">{selectedStage.items.map(item=><span key={item} className="rounded-full border border-violet-300/10 bg-violet-300/[0.045] px-3 py-1.5 text-[11px] text-violet-200">{item}</span>)}</div>
              {selectedStage.id === "system" && <Link to="/landing" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-violet-300 hover:text-violet-200">Back to the journey <ArrowRight className="w-3.5 h-3.5"/></Link>}
            </div>
            <div className="border-t lg:border-t-0 lg:border-l border-violet-400/10 p-7 sm:p-10 bg-black/10">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">{ui.position}</div>
              <div className="mt-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center"><LockKeyhole className="w-4 h-4 text-violet-300"/></div><div><div className="text-sm font-semibold">{ui.founder}</div><div className="text-[11px] text-slate-500">{ui.founderDesc}</div></div></div>
              <Link to="/pricing" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-violet-300 hover:text-violet-200">{ui.pricing}<ArrowRight className="w-3.5 h-3.5"/></Link>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mt-28"><div className="max-w-2xl"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">{ui.roster}</div><h2 className="mt-3 text-3xl sm:text-4xl font-bold">{ui.rosterTitle}</h2><p className="mt-4 text-sm sm:text-base leading-7 text-slate-400">{ui.rosterDesc}</p></div><div className="mt-10 grid lg:grid-cols-4 gap-4">{Object.keys(meta).map(type=><Column key={type} type={type} onPick={setPicked}/>)}</div></section>

      <section className="mt-28 relative overflow-hidden rounded-[2rem] border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.09] via-indigo-500/[0.04] to-transparent p-8 sm:p-12"><div className="relative max-w-3xl"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">{ui.destination}</div><h2 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight">{ui.destinationTitle}</h2><p className="mt-5 text-sm sm:text-base leading-7 text-slate-400">{ui.destinationDesc}</p><div className="mt-7 flex flex-wrap gap-2">{["Skills","Curriculum","Practice","Vocabulary","Grammar","Progress","AI"].map(x=><span key={x} className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-slate-300">{x}</span>)}</div></div></section>
    </main>

    {picked && <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setPicked(null)}><motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#101125] shadow-2xl p-6" onClick={event => event.stopPropagation()}><div className={`text-[10px] font-black uppercase tracking-[0.18em] ${meta[picked.type].color}`}>{meta[picked.type].label}</div><h3 className="mt-4 text-2xl font-bold">{picked.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{picked.desc}</p><div className="mt-5 rounded-xl border border-white/5 bg-white/[0.025] p-3 text-xs text-slate-500">{ui.roadmapChapter}: <span className="text-slate-300">{picked.stage}</span></div><button onClick={() => setPicked(null)} className="mt-5 text-xs font-bold text-violet-300">{ui.close}</button></motion.div></div>}
  </div>;
}
