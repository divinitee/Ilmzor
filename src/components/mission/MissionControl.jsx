import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useAppLang } from "@/hooks/useAppLang";
import { DASH_STR, getLearningGoal, getGreetingKey } from "@/lib/dashboardData";
import HeroCard from "./HeroCard";
import MissionsCard from "./MissionsCard";
import AICoachCard from "./AICoachCard";
import ProgressSnapshot from "./ProgressSnapshot";
import RecentAchievement from "./RecentAchievement";
import LearningJourney from "./LearningJourney";
import QuickActions from "./QuickActions";

export const ACCENT = "#3b82f6";
export const ACCENT_GLOW = "rgba(59,130,246,0.5)";

const todayKey = () => new Date().toDateString();

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

export default function MissionControl({
  user,
  results,
  units,
  selectedUnit,
  selectedUnitName,
  onOpenUnitDrawer,
  onNavigate,
}) {
  const { lang } = useAppLang();
  const s = DASH_STR[lang] || DASH_STR.en;
  const navigate = useNavigate();
  const [coins, setCoins] = useState(null);

  useEffect(() => {
    if (!user) return;
    base44.entities.UserCoins
      .filter({ user_id: user.id })
      .then((r) => {
        if (r && r[0]) setCoins(r[0]);
      })
      .catch(() => {});
  }, [user]);

  const data = useMemo(() => {
    const tk = todayKey();
    const today = (results || []).filter(
      (r) => new Date(r.created_date).toDateString() === tk
    );
    const wordsCorrectToday = today.reduce((a, r) => a + (r.score || 0), 0);
    const quizzesToday = today.length;
    const bestAccuracyToday = today.reduce((m, r) => {
      const tot = r.total_questions || 30;
      const acc = tot > 0 ? Math.round(((r.score || 0) / tot) * 100) : 0;
      return Math.max(m, acc);
    }, 0);
    const totalCorrect = (results || []).reduce((a, r) => a + (r.score || 0), 0);
    const totalQuizzes = (results || []).length;
    const streak = computeStreak(results);
    const xp = coins?.coins || 0;
    const unitObj = (units || []).find((u) => u.key === selectedUnit);
    const unitNum = unitObj?.num || 1;
    const moduleNum = Math.max(1, Math.ceil(unitNum / 4));
    return {
      wordsCorrectToday,
      quizzesToday,
      bestAccuracyToday,
      totalCorrect,
      totalQuizzes,
      streak,
      xp,
      unitNum,
      moduleNum,
    };
  }, [results, units, selectedUnit, coins]);

  const greeting = s[getGreetingKey()];
  const name =
    (user?.full_name || user?.email || "").split(" ")[0] || "Learner";
  const goal = getLearningGoal(lang);

  const missions = [
    { id: "words", label: "Learn 8 new words", icon: "BookOpen", progress: Math.min(data.wordsCorrectToday, 8), target: 8, done: data.wordsCorrectToday >= 8 },
    { id: "challenge", label: "Complete one challenge", icon: "Zap", progress: Math.min(data.quizzesToday, 1), target: 1, done: data.quizzesToday >= 1 },
    { id: "score", label: "Score 80%+ on a quiz", icon: "Target", progress: Math.min(Math.round(data.bestAccuracyToday), 80), target: 80, done: data.bestAccuracyToday >= 80 },
    { id: "streak", label: "Keep your streak alive", icon: "Flame", progress: data.streak > 0 ? 1 : 0, target: 1, done: data.streak > 0 },
  ];

  const aiRecs = useMemo(() => {
    const r = [];
    if (data.quizzesToday === 0)
      r.push("You haven't studied yet today. A 5-minute round keeps your momentum going.");
    if (data.bestAccuracyToday >= 80)
      r.push("Great accuracy today — you're ready for a harder challenge in Deep Mode.");
    else if (data.bestAccuracyToday > 0 && data.bestAccuracyToday < 70)
      r.push(`Today's accuracy is ${data.bestAccuracyToday}%. Review the words you missed before advancing.`);
    if (data.streak >= 5)
      r.push(`You're on a ${data.streak}-day streak. One challenge today keeps it alive.`);
    if (data.totalCorrect > 0 && data.totalCorrect < 50)
      r.push(`You've learned ${data.totalCorrect} words. Push past 50 to unlock the Centurion badge.`);
    if (data.totalQuizzes === 0)
      r.push("Start your first session to begin your streak and unlock achievements.");
    if (r.length === 0) r.push("Stay consistent — short daily sessions beat long cramming.");
    return r.slice(0, 3);
  }, [data]);

  const achievement = useMemo(() => {
    if (data.streak >= 30) return { title: "Unbreakable", desc: "30-day streak", tint: "#f59e0b", icon: "Flame" };
    if (data.streak >= 7) return { title: "Week Warrior", desc: "7-day streak", tint: "#22c55e", icon: "Flame" };
    if (data.totalCorrect >= 100) return { title: "Centurion", desc: "100 words learned", tint: "#a78bfa", icon: "Trophy" };
    if (data.totalQuizzes >= 1) return { title: "First Steps", desc: "First quiz completed", tint: ACCENT, icon: "BookOpen" };
    return null;
  }, [data]);

  const onContinue = () => {
    if (selectedUnit) navigate(`/quiz/${selectedUnit}`);
    else onNavigate?.("skillhub");
  };

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-10 space-y-5">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{greeting},</p>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{name}</h1>
      </div>

      <HeroCard path={goal} unit={selectedUnitName} accent={ACCENT} accentGlow={ACCENT_GLOW} onContinue={onContinue} />
      <MissionsCard missions={missions} accent={ACCENT} accentGlow={ACCENT_GLOW} />
      <AICoachCard recs={aiRecs} accent={ACCENT} accentGlow={ACCENT_GLOW} />
      <ProgressSnapshot totalCorrect={data.totalCorrect} streak={data.streak} xp={data.xp} />
      <RecentAchievement achievement={achievement} />
      <LearningJourney path={goal} unit={selectedUnitName} moduleNum={data.moduleNum} accent={ACCENT} />
      <QuickActions onNavigate={onNavigate} onOpenUnitDrawer={onOpenUnitDrawer} accent={ACCENT} />

      <footer className="text-center text-xs text-muted-foreground pt-4">
        Created by <strong className="text-foreground">Salohiddin Nurullaev & Temur Normatov</strong>
      </footer>
    </div>
  );
}