import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Target, Flame, Clock, TrendingUp } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { DASH_STR, DEMO, computeStats } from "@/lib/dashboardData";

const ease = [0.22, 1, 0.36, 1];

function MiniStat({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3 text-center">
      <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
      <p className="text-lg font-bold text-foreground leading-none">
        {value}
        {sub && <span className="text-xs text-muted-foreground ml-0.5">{sub}</span>}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default function TodayFocusCard({ results }) {
  const { lang } = useAppLang();
  const s = DASH_STR[lang] || DASH_STR.en;
  const { accuracy } = computeStats(results);
  const acc = results.length > 0 ? accuracy : 78;

  const tasks = [
    { label: s.taskReview, done: true },
    { label: s.taskQuiz, done: false },
    { label: s.taskPractice, done: false },
  ];
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
      className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-bold text-foreground">{s.todaysFocus}</h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium">{doneCount}/{tasks.length} {s.tasksDone}</span>
      </div>

      {/* Tasks */}
      <div className="space-y-2 mb-5">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
            {task.done
              ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              : <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
            <span className={`text-sm ${task.done ? "text-muted-foreground line-through" : "text-foreground font-medium"}`}>
              {task.label}
            </span>
          </div>
        ))}
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <MiniStat icon={TrendingUp} label={s.accuracy} value={`${acc}%`} color="text-blue-500" />
        <MiniStat icon={Flame} label={s.streak} value={`${DEMO.streak}`} sub={s.days} color="text-orange-500" />
        <MiniStat icon={Clock} label={s.studyTimeLeft} value={`${DEMO.studyTimeRemaining}`} sub={s.min} color="text-violet-500" />
      </div>

      {/* Daily goal progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground font-medium">{s.dailyGoal}</span>
          <span className="text-foreground font-semibold">{DEMO.dailyGoalProgress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${DEMO.dailyGoalProgress}%` }} transition={{ duration: 1, ease }}
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
          />
        </div>
      </div>

      {/* Path progress */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground font-medium">{s.pathProgress}</span>
          <span className="text-foreground font-semibold">{DEMO.pathProgress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${DEMO.pathProgress}%` }} transition={{ duration: 1.2, ease, delay: 0.1 }}
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}