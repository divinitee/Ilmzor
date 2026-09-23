import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Check, Clock, AlertTriangle, Play, RotateCcw } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { studentApi } from "@/lib/serverApi";

// Student-side homework list (Teacher Panel phase 1, 2026-09-23).
// Everything comes from studentApi.listHomework, which works out membership
// and status server-side. Renders nothing for a student with no class, so
// self-learners never see an empty "Homework" box.

const STR = {
  en: {
    title: "Homework", from: "from", due: "Due", noDue: "No due date", overdue: "Overdue",
    done: "Done", late: "late", start: "Start", again: "Play again", best: "Best",
    empty: "No homework right now.", error: "Couldn't load homework.",
  },
  uz: {
    title: "Uyga vazifa", from: "O'qituvchi:", due: "Muddat", noDue: "Muddatsiz", overdue: "Muddati o'tgan",
    done: "Bajarildi", late: "kechikib", start: "Boshlash", again: "Qayta o'ynash", best: "Eng yaxshi",
    empty: "Hozircha uyga vazifa yo'q.", error: "Uyga vazifani yuklab bo'lmadi.",
  },
  ru: {
    title: "Домашнее задание", from: "от", due: "Срок", noDue: "Без срока", overdue: "Просрочено",
    done: "Выполнено", late: "с опозданием", start: "Начать", again: "Ещё раз", best: "Лучший",
    empty: "Сейчас домашних заданий нет.", error: "Не удалось загрузить домашние задания.",
  },
};

function formatDue(date, lang) {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const locale = lang === "ru" ? "ru-RU" : lang === "uz" ? "uz-UZ" : "en-GB";
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export default function StudentHomework({ onOpen, refreshToken = 0 }) {
  const { lang } = useAppLang();
  const s = STR[lang] || STR.en;
  const [state, setState] = useState({ loading: true, error: false, membership: null, assignments: [] });

  useEffect(() => {
    let cancelled = false;
    studentApi("listHomework")
      .then((res) => {
        if (!cancelled) setState({ loading: false, error: false, membership: res?.membership || null, assignments: res?.assignments || [] });
      })
      .catch((e) => {
        console.error("listHomework failed", e);
        if (!cancelled) setState((prev) => ({ ...prev, loading: false, error: true }));
      });
    return () => { cancelled = true; };
  }, [refreshToken]);

  if (state.loading) return null;
  if (!state.membership && !state.assignments.length) return null;

  const open = state.assignments.filter((a) => a.status !== "completed").length;
  const teacher = state.membership?.teacher_name;

  return (
    <section className="premium-card p-5 md:p-6">
      <header className="flex items-center justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" /> {s.title}
          </h3>
          {(state.membership?.group_label || teacher) && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {state.membership?.group_label}{state.membership?.group_label && teacher ? " · " : ""}{teacher ? `${s.from} ${teacher}`.trim() : ""}
            </p>
          )}
        </div>
        {state.assignments.length > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
            {state.assignments.length - open}/{state.assignments.length}
          </span>
        )}
      </header>

      {state.error && <p className="text-sm text-destructive">{s.error}</p>}
      {!state.error && state.assignments.length === 0 && (
        <p className="text-sm text-muted-foreground">{s.empty}</p>
      )}

      <div className="space-y-2.5">
        {state.assignments.map((a, i) => {
          const done = a.status === "completed";
          const overdue = a.status === "overdue";
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border p-3 ${overdue ? "border-amber-400/40 bg-amber-500/[0.06]" : done ? "border-emerald-400/30 bg-emerald-500/[0.05]" : "border-white/10 bg-white/[0.03]"}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? "bg-emerald-500/20 text-emerald-400" : overdue ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-foreground"}`}>
                  {done ? <Check className="w-4 h-4" /> : overdue ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">{a.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {a.skill_label ? `${a.skill_label} · ` : ""}
                    {done
                      ? `${s.done}${a.completed_late ? ` (${s.late})` : ""}${a.best_score_pct != null ? ` · ${s.best} ${a.best_score_pct}%` : ""}`
                      : overdue
                        ? `${s.overdue} · ${formatDue(a.due_date, lang)}`
                        : a.due_date ? `${s.due} ${formatDue(a.due_date, lang)}` : s.noDue}
                  </p>
                </div>
                <button
                  onClick={() => onOpen?.(a)}
                  className={`flex-shrink-0 h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 select-none transition-colors ${done ? "border border-white/15 text-muted-foreground hover:text-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                >
                  {done ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {done ? s.again : s.start}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
