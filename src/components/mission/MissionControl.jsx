import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAppLang } from "@/hooks/useAppLang";
import { DASH_STR, getLearningGoal, getGreetingKey } from "@/lib/dashboardData";
import HeroCard from "./HeroCard";
import FreeLessonCard from "./FreeLessonCard";
import MissionsCard from "./MissionsCard";
import AICoachCard from "./AICoachCard";
import ProgressSnapshot from "./ProgressSnapshot";
import RecentAchievement from "./RecentAchievement";
import LearningJourney from "./LearningJourney";
import QuickActions from "./QuickActions";
import { getRemoteSkillProgress, summarizeSkillProgress } from "@/lib/gameSkills";

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
  const { lang, t } = useAppLang();
  const s = DASH_STR[lang] || DASH_STR.en;
  const [coins, setCoins] = useState(null);
  const [skillHubRows, setSkillHubRows] = useState(null); // null = still loading

  useEffect(() => {
    if (!user) return;
    base44.entities.UserCoins
      .filter({ user_id: user.id })
      .then((r) => {
        if (r && r[0]) setCoins(r[0]);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;
    getRemoteSkillProgress(user.email).then(setSkillHubRows);
  }, [user]);

  const skillHubOverall = useMemo(
    () => (skillHubRows ? summarizeSkillProgress(skillHubRows) : null),
    [skillHubRows]
  );

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
    { id: "words", label: t("dashboard.missionWords"), icon: "BookOpen", progress: Math.min(data.wordsCorrectToday, 8), target: 8, done: data.wordsCorrectToday >= 8 },
    { id: "challenge", label: t("dashboard.missionChallenge"), icon: "Zap", progress: Math.min(data.quizzesToday, 1), target: 1, done: data.quizzesToday >= 1 },
    { id: "score", label: t("dashboard.missionScore"), icon: "Target", progress: Math.min(Math.round(data.bestAccuracyToday), 80), target: 80, done: data.bestAccuracyToday >= 80 },
    { id: "streak", label: t("dashboard.missionStreak"), icon: "Flame", progress: data.streak > 0 ? 1 : 0, target: 1, done: data.streak > 0 },
  ];

  const aiRecs = useMemo(() => {
    const r = [];
    if (data.quizzesToday === 0)
      r.push(t("dashboard.recNoStudy"));
    if (data.bestAccuracyToday >= 80)
      r.push(t("dashboard.recHighAcc"));
    else if (data.bestAccuracyToday > 0 && data.bestAccuracyToday < 70)
      r.push(t("dashboard.recLowAcc", { pct: data.bestAccuracyToday }));
    if (data.streak >= 5)
      r.push(t("dashboard.recStreak", { n: data.streak }));
    if (data.totalCorrect > 0 && data.totalCorrect < 50)
      r.push(t("dashboard.recTotal", { n: data.totalCorrect }));
    if (data.totalQuizzes === 0)
      r.push(t("dashboard.recNoQuiz"));
    if (r.length === 0) r.push(t("dashboard.recDefault"));
    return r.slice(0, 3);
  }, [data]);

  const achievement = useMemo(() => {
    if (data.streak >= 30) return { title: t("dashboard.achUnbreakable"), desc: t("dashboard.achUnbreakableDesc"), tint: "#f59e0b", icon: "Flame" };
    if (data.streak >= 7) return { title: t("dashboard.achWeek"), desc: t("dashboard.achWeekDesc"), tint: "#22c55e", icon: "Flame" };
    if (data.totalCorrect >= 100) return { title: t("dashboard.achCenturion"), desc: t("dashboard.achCenturionDesc"), tint: "#a78bfa", icon: "Trophy" };
    if (data.totalQuizzes >= 1) return { title: t("dashboard.achFirst"), desc: t("dashboard.achFirstDesc"), tint: ACCENT, icon: "BookOpen" };
    return null;
  }, [data]);

  // The hero card is Skill Hub's own mastery, not the old unit-quiz system —
  // "continue" now always means "go practice in Skill Hub". The unit-based
  // vocab quiz still exists (that was this project's original focus before
  // Skill Hub/Learning Path took over) but it's a secondary path now, owned
  // by LearningJourney's own click handler below, not the hero.
  const onContinue = () => onNavigate?.("skillhub");

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-10 space-y-5">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{greeting},</p>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{name}</h1>
      </div>

      <HeroCard accent={ACCENT} accentGlow={ACCENT_GLOW} onContinue={onContinue} skillHub={{ rows: skillHubRows, overall: skillHubOverall }} />
      <FreeLessonCard />
      <MissionsCard missions={missions} accent={ACCENT} accentGlow={ACCENT_GLOW} />
      <AICoachCard recs={aiRecs} accent={ACCENT} accentGlow={ACCENT_GLOW} />
      <ProgressSnapshot totalCorrect={data.totalCorrect} streak={data.streak} xp={data.xp} />
      <RecentAchievement achievement={achievement} />
      <LearningJourney path={goal} unit={selectedUnitName} selectedUnit={selectedUnit} moduleNum={data.moduleNum} accent={ACCENT} onOpenUnitDrawer={onOpenUnitDrawer} />
      <QuickActions onNavigate={onNavigate} onOpenUnitDrawer={onOpenUnitDrawer} accent={ACCENT} />

    </div>
  );
}