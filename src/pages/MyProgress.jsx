import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, Trophy, Target } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { useAppLang } from "@/hooks/useAppLang";

export default function MyProgress() {
  const { t } = useAppLang();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async (me) => {
      const list = await base44.entities.QuizResult.filter({ student_phone: me.email }, "-created_date", 50);
      setResults(list);
    }).finally(() => setLoading(false));
  }, []);

  const totalQuizzes = results.length;
  const percentages = results.map(r => Math.round(((r.score || 0) / (r.total_questions || 30)) * 100));
  const avgScore = totalQuizzes > 0 ? Math.round(percentages.reduce((a, b) => a + b, 0) / totalQuizzes) : 0;
  const chartData = [...results].reverse().map((r, i) => ({
    name: `#${i + 1}`,
    percent: Math.round(((r.score || 0) / (r.total_questions || 30)) * 100),
  }));

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b border-border px-4 pb-3 flex items-center gap-3 safe-header sticky top-0 z-30">
        <Link to="/" className="text-muted-foreground hover:text-foreground p-1.5 select-none">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2 select-none">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">{t("myprogress.title")}</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-background border border-border rounded-2xl p-4 text-center">
                <Target className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{totalQuizzes}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("myprogress.total_quizzes")}</p>
              </div>
              <div className="flex-1 bg-background border border-border rounded-2xl p-4 text-center">
                <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-emerald-600">{avgScore}%</p>
                <p className="text-xs text-muted-foreground mt-1">{t("myprogress.avg_score")}</p>
              </div>
            </div>

            {chartData.length > 1 && (
              <div className="bg-background border border-border rounded-2xl p-4 mb-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">{t("myprogress.dynamics")}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="currentColor" opacity={0.5} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="currentColor" opacity={0.5} />
                    <Tooltip formatter={(v) => [`${v}%`, t("myprogress.score_label")]} />
                    <Line type="monotone" dataKey="percent" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="bg-background border border-border rounded-2xl p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">{t("myprogress.recent_tests")}</p>
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t("myprogress.no_tests")}</p>
              ) : (
                <div className="space-y-3">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.unit_name}</p>
                        <p className="text-xs text-muted-foreground">{r.date}</p>
                      </div>
                      <div className="flex items-center gap-1 select-none">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span className="font-bold text-emerald-600">{r.score}</span>
                        <span className="text-muted-foreground text-sm">/ {r.total_questions || 30}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}