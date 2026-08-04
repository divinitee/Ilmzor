import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, BarChart3, BookOpen, Flame, Star, Target, Sparkles, Trophy, Brain,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import ParticleBackground from "@/components/ParticleBackground";
import { getRadarData, getOverallStats, SKILLS } from "@/lib/gameSkills";

const ACCENT = "#3b82f6";
const ttStyle = {
  background: "rgba(10,10,16,0.9)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  fontSize: 11,
  color: "#fff",
};

function computeStreak(results) {
  if (!results?.length) return 0;
  const days = new Set(results.map((r) => new Date(r.created_date).toDateString()));
  let d = new Date();
  if (!days.has(d.toDateString())) {
    d.setDate(d.getDate() - 1);
    if (!days.has(d.toDateString())) return 0;
  }
  let streak = 0;
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function StatTile({ label, value, sub, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

function Panel({ title, children, right }) {
  return (
    <section className="premium-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [coins, setCoins] = useState(null);
  const [user, setUser] = useState(null);
  const [report, setReport] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const [r, c] = await Promise.all([
          base44.entities.QuizResult.filter({ student_phone: me.email }, "-created_date", 200),
          base44.entities.UserCoins.filter({ user_id: me.id }),
        ]);
        setResults(r);
        if (c && c[0]) setCoins(c[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const totalQuizzes = results.length;
    const totalCorrect = results.reduce((a, r) => a + (r.score || 0), 0);
    const totalQuestions = results.reduce((a, r) => a + (r.total_questions || 30), 0);
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const streak = computeStreak(results);
    const xp = coins?.coins || 0;
    return { totalQuizzes, totalCorrect, accuracy, streak, xp };
  }, [results, coins]);

  const activity14 = useMemo(() => {
    const arr = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const count = results.filter((r) => new Date(r.created_date).toDateString() === key).length;
      arr.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), count, date: key });
    }
    return arr;
  }, [results]);

  const accuracyTrend = useMemo(() => {
    return [...results]
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
      .slice(-14)
      .map((r, i) => ({
        i: i + 1,
        acc: (r.total_questions || 30) > 0 ? Math.round(((r.score || 0) / (r.total_questions || 30)) * 100) : 0,
        unit: r.unit_name || "—",
      }));
  }, [results]);

  const radarData = useMemo(() => getRadarData(), []);
  const overall = useMemo(() => getOverallStats(), []);

  const heatmap = useMemo(() => {
    const cells = [];
    for (let i = 55; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const count = results.filter((r) => new Date(r.created_date).toDateString() === key).length;
      cells.push({ key, count, dow: d.getDay() });
    }
    return cells;
  }, [results]);

  const genReport = async () => {
    setGenerating(true);
    setReport("");
    try {
      const prompt = `You are an expert language-learning coach reviewing a student's progress data. Write a concise, motivating analytics report (3 short paragraphs). Use plain text, no markdown.
Data:
- Total quizzes completed: ${stats.totalQuizzes}
- Total words learned (correct answers): ${stats.totalCorrect}
- Average accuracy: ${stats.accuracy}%
- Current streak: ${stats.streak} days
- Current XP: ${stats.xp}
- Skill mastery (0-100): ${radarData.map((s) => `${s.emoji} ${s.value}`).join(", ")}

Highlight strengths, weakest skill to focus on, and 2 concrete next steps.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setReport(typeof res === "string" ? res : JSON.stringify(res));
    } catch (e) {
      setReport("Could not generate the report right now. Please try again later.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3 safe-header">
        <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-300" />
          <span className="font-bold text-foreground text-sm">Premium Analytics</span>
        </div>
      </header>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-6 space-y-5 pb-12">
        <div className="flex items-center gap-2">
          <span className="neo-pill px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-200">
            <Sparkles className="w-3 h-3" /> Advanced Insights
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <StatTile label="Quizzes" value={stats.totalQuizzes} icon={BookOpen} />
          <StatTile label="Words Learned" value={stats.totalCorrect} icon={Target} />
          <StatTile label="Avg Accuracy" value={`${stats.accuracy}%`} icon={BarChart3} />
          <StatTile label="Streak" value={stats.streak} sub="days" icon={Flame} />
          <StatTile label="Current XP" value={stats.xp} icon={Star} />
          <StatTile label="Skills Trained" value={overall.skillsTrained} sub={`/ ${SKILLS.length}`} icon={Trophy} />
        </div>

        <Panel title="Activity · Last 14 Days">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activity14} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={ttStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={ACCENT} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Accuracy Trend">
          <div className="h-48">
            {accuracyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accuracyTrend} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="i" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={ttStyle} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
                  <Line type="monotone" dataKey="acc" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3, fill: "#a78bfa" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyHint text="Complete a few quizzes to see your accuracy trend." />
            )}
          </div>
        </Panel>

        <Panel title="Skill Mastery Radar">
          <div className="h-56">
            {radarData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="emoji" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 16 }} />
                  <Radar dataKey="value" stroke={ACCENT} fill={ACCENT} fillOpacity={0.35} />
                  <Tooltip contentStyle={ttStyle} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyHint text="Play skill games to populate your mastery radar." />
            )}
          </div>
        </Panel>

        <Panel
          title="Skill Breakdown"
          right={<span className="text-[10px] text-muted-foreground">{overall.plays} plays</span>}
        >
          <div className="space-y-2.5">
            {radarData.map((s) => (
              <div key={s.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-foreground/80">{s.emoji} {s.key}</span>
                  <span className="text-muted-foreground tabular-nums">{s.value}/100</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: s.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.value}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Study Heatmap · 8 Weeks">
          <div className="grid grid-cols-8 gap-1.5">
            {heatmap.map((c) => {
              const op = c.count === 0 ? 0.06 : Math.min(0.9, 0.2 + c.count * 0.18);
              return (
                <div
                  key={c.key}
                  title={`${c.key}: ${c.count} sessions`}
                  className="aspect-square rounded-[5px]"
                  style={{ background: c.count === 0 ? "rgba(255,255,255,0.06)" : `${ACCENT}`, opacity: op }}
                />
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">Each cell = one day. Brighter = more sessions.</p>
        </Panel>

        <Panel
          title="AI-Generated Report"
          right={
            <button
              onClick={genReport}
              disabled={generating}
              className="neo-pill px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-white/10 transition-colors select-none disabled:opacity-50"
            >
              <Brain className="w-3.5 h-3.5 text-purple-300" /> {generating ? "Generating…" : "Generate"}
            </button>
          }
        >
          {report ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line"
            >
              {report}
            </motion.p>
          ) : (
            <EmptyHint text="Tap Generate for a personalized AI summary of your progress." />
          )}
        </Panel>

        <footer className="text-center text-xs text-muted-foreground pt-2">
          Created by <strong className="text-foreground">Salohiddin Nurullaev & Temur Normatov</strong>
        </footer>
      </div>
    </div>
  );
}

function EmptyHint({ text }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}