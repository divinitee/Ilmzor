import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lightbulb, Repeat, Layers, BookOpenCheck, MessageSquareText, Clock } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";

const tipIcons = [Repeat, Layers, MessageSquareText, BookOpenCheck, Clock];

export default function StudyTips() {
  const { t, lang, translations } = useAppLang();
  const tips = translations[lang]?.studytips?.tips || translations.uz.studytips.tips;

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b border-border px-4 pb-3 flex items-center gap-3 safe-header sticky top-0 z-30">
        <Link to="/" className="text-muted-foreground hover:text-foreground p-1.5 select-none">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2 select-none">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-foreground">{t("studytips.title")}</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground mb-6">
          {t("studytips.intro")}
        </p>

        <div className="space-y-4">
          {tips.map((tip, i) => {
            const Icon = tipIcons[i] || Lightbulb;
            return (
              <div key={i} className="bg-background border border-border rounded-2xl p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{tip.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}