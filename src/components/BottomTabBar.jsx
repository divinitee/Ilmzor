import React from "react";
import { Home, Settings, Sparkles, Network } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";

export default function BottomTabBar({ activeTab, onTabChange }) {
  const { t } = useAppLang();
  const tabs = [
    { id: "home", label: t("nav.home"), icon: Home },
    { id: "skillhub", label: t("nav.skill_hub"), icon: Network },
    { id: "tutor", label: t("nav.ai_teacher"), icon: Sparkles },
    { id: "settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors select-none ${
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}