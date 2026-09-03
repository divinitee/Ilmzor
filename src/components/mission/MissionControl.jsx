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
import { getRemoteSkillProgress, summarizeSkillProgress, getTodaySkillActivity } from "@/lib/gameSkills";
import { displayName } from "@/lib/profileName";

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
  const skillHubToday = useMemo(
    () => getTodaySkillActivity(skillHubRows || []),
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
  // An email-derived full_name (Base44's own default when no name was
  // collected at signup, e.g. via Google) is never shown as if it were a
  // real name — see src/lib/profileName.js.
  const realName = displayName(user?.full_name, user?.email);
  const name = realName ? realName.split(" ")[0] : t("dashboard.defaultLearnerName");

  // Today's Mission is Skill Hub-sourced for now (lessons/other systems fold
  // in later): a round played, two different skills trained, and a strong
  // score, all read off SkillHubProgress's per-skill "updated today" rows.
  // Streak still comes from QuizResult (`results`) since that's the only
  // entity with real per-round day history — Skill Hub's own "quiz" game
  // writes there too, so it still tracks real activity, just not the full
  // Skill Hub picture yet.
  const missions = [
    { id: "play", label: t("dashboard.missionPlay"), icon: "Zap", progress: skillHubToday.playedToday ? 1 : 0, target: 1, done: skillHubToday.playedToday },
    { id: "variety", label: t("dashboard.missionVariety"), icon: "BookOpen", progress: Math.min(skillHubToday.skillsToday, 2), target: 2, done: skillHubToday.skillsToday >= 2 },
    { id: "score", label: t("dashboard.missionScore"), icon: "Target", progress: Math.min(Math.round(skillHubToday.bestToday), 80), target: 80, done: skillHubToday.bestToday >= 80 },
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
        {!realName && (
          <button
            onClick={() => onNavigate?.("settings")}
            className="mt-1 text-xs font-medium text-primary/80 hover:text-primary underline underline-offset-2 select-none"
          >
            {t("dashboard.setYourName")}
          </button>
        )}
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