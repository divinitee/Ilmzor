import React from "react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { useAppLang } from "@/hooks/useAppLang";
import { DASH_STR, DEMO } from "@/lib/dashboardData";

const ease = [0.22, 1, 0.36, 1];

export default function ActivityChart() {
  const { lang } = useAppLang();
  const s = DASH_STR[lang] || DASH_STR.en;
  const data = DEMO.weekActivity;
  const max = Math.max(...data.map((d) => d.value));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.1 }}
      className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 shadow-sm"
    >
      <h3 className="font-bold text-foreground mb-1">{s.last7Days}</h3>
      <p className="text-xs text-muted-foreground mb-4">{s.activity}</p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="dashBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(59,130,246,0.08)" }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
                color: "hsl(var(--foreground))",
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={28}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.value === max ? "#6366f1" : "url(#dashBarGrad)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}