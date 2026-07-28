import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { getRadarData } from "@/lib/gameSkills";
import { useAppLang } from "@/hooks/useAppLang";

export default function SkillRadar() {
  const { t } = useAppLang();
  const data = getRadarData().map(d => ({
    label: t(`games.skills.${d.key}`),
    value: d.value,
    color: d.color,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data} outerRadius="72%" cx="50%" cy="50%">
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} stroke="hsl(var(--border))" />
        <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}