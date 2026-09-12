import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAppLang } from "@/hooks/useAppLang";
import { evaluateAchievements } from "@/lib/achievements";
import ParticleBackground from "@/components/ParticleBackground";
import BetaBadge from "@/components/BetaBadge";
import AchievementHero from "@/components/achievements/AchievementHero";
import AchievementCard from "@/components/achievements/AchievementCard";

export default function Achievements() {
  const { t } = useAppLang();
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      let subs = await base44.entities.StudentSubscription.filter({ phone: me.email });
      if (subs.length === 0) subs = await base44.entities.StudentSubscription.filter({ created_by_id: me.id });
      setCtx({ user: me, subscription: subs[0] || null });
    })();
  }, []);

  const list = useMemo(() => (ctx ? evaluateAchievements(ctx) : []), [ctx]);
  const featured = list.find((a) => a.unlocked) || null;
  const rest = list.filter((a) => a !== featured);
  const unlockedCount = list.filter((a) => a.unlocked).length;

  return (
    <div className="min-h-screen bg-background relative">
      <ParticleBackground />
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3 safe-header">
        <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground select-none">
          <ArrowLeft className="w-4 h-4" /> {t("common.back")}
        </Link>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-[#e6c27a]" />
          <span className="font-bold text-foreground text-sm">{t("achievements.title")}</span>
          <BetaBadge />
        </div>
      </header>

      <div className="relative z-10 max-w-xl mx-auto px-4 py-6 space-y-5 pb-14">
        {!ctx ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {featured && <AchievementHero achievement={featured} />}

            <div className="flex items-center justify-between px-1 pt-1">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t("achievements.all")}</h2>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {t("achievements.count", { n: unlockedCount, total: list.length })}
              </span>
            </div>

            <div className="space-y-3">
              {(featured ? rest : list).map((a, i) => <AchievementCard key={a.id} achievement={a} index={i} />)}
              <p className="text-center text-xs text-muted-foreground pt-3">{t("achievements.more_coming")}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}