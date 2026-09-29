import { useCallback } from "react";
import { useAppLang } from "@/hooks/useAppLang";

const COPY = {
  en: {
    title: "Your English", core_unmapped: "Waiting to be mapped", core_developing: "Profile developing", core_mapped: "Profile mapped",
    mapped: "{n} of {total} skills mapped", rounds: "{n} rounds of evidence", empty: "Play a round in Skill Hub to start mapping your English.",
    unmapped: "Unmapped", discover: "Discover this skill", noEvidence: "Not enough evidence yet — VIRORA hasn't seen this skill in action.",
    strong: "Strong", developing: "Developing", emerging: "Emerging", developed: "{n}% Correctness", progress: "Progress", journey: "Journey underway · {n} rounds", masteryNote: "Mastery is earned slowly through sustained evidence — one strong round doesn't award it.",
    conf_low: "Early signal", conf_medium: "Medium confidence", conf_high: "High confidence",
    fresh: "Verified recently", stale: "Needs a fresh check", cold: "May be rusty",
    atPeak: "At your best so far", peak: "Personal best {n}%",
    evidence: "Evidence", confidence: "Confidence", freshness: "Recency", trajectory: "Trajectory",
    roundsShort: "{n} rounds", areas: "Where this skill grows", back: "Back to profile", error: "Couldn't load your skill profile right now. It will refresh later.",
  },
  uz: {
    title: "Ingliz tilingiz", core_unmapped: "Hali xaritada emas", core_developing: "Profil shakllanmoqda", core_mapped: "Profil to'liq",
    mapped: "{total} tadan {n} ko'nikma xaritada", rounds: "{n} raund dalil", empty: "Ingliz tilingizni xaritalash uchun Skill Hub'da raund o'ynang.",
    unmapped: "Xaritada emas", discover: "Bu ko'nikmani kashf eting", noEvidence: "Hali dalil yetarli emas — VIRORA bu ko'nikmani amalda ko'rmagan.",
    strong: "Kuchli", developing: "Rivojlanmoqda", emerging: "Boshlanmoqda", developed: "{n}% to'g'rilik", progress: "Rivojlanish", journey: "Yo'l davom etmoqda · {n} raund", masteryNote: "Ustalik uzoq muddatli dalillar orqali asta-sekin qo'lga kiritiladi — bitta kuchli raund uni bermaydi.",
    conf_low: "Dastlabki signal", conf_medium: "O'rtacha ishonch", conf_high: "Yuqori ishonch",
    fresh: "Yaqinda tasdiqlangan", stale: "Qayta tekshirish kerak", cold: "Unutilgan bo'lishi mumkin",
    atPeak: "Eng yaxshi natijangiz", peak: "Eng yaxshi {n}%",
    evidence: "Dalil", confidence: "Ishonch", freshness: "Yangilik", trajectory: "Yo'nalish",
    roundsShort: "{n} raund", areas: "Bu ko'nikma qayerda o'sadi", back: "Profilga qaytish", error: "Ko'nikma profilingizni hozir yuklab bo'lmadi. Keyinroq yangilanadi.",
  },
  ru: {
    title: "Ваш английский", core_unmapped: "Ждёт картирования", core_developing: "Профиль формируется", core_mapped: "Профиль составлен",
    mapped: "{n} из {total} навыков на карте", rounds: "{n} раундов данных", empty: "Сыграйте раунд в Skill Hub, чтобы начать карту вашего английского.",
    unmapped: "Не на карте", discover: "Откройте этот навык", noEvidence: "Пока мало данных — VIRORA ещё не видела этот навык в деле.",
    strong: "Сильный", developing: "Развивается", emerging: "Начальный", developed: "{n}% правильность", progress: "Прогресс", journey: "Путь продолжается · {n} раундов", masteryNote: "Мастерство зарабатывается постепенно, через устойчивые результаты — один сильный раунд его не даёт.",
    conf_low: "Первый сигнал", conf_medium: "Средняя уверенность", conf_high: "Высокая уверенность",
    fresh: "Проверено недавно", stale: "Нужна проверка", cold: "Возможно, забыто",
    atPeak: "Ваш лучший результат", peak: "Лучший {n}%",
    evidence: "Данные", confidence: "Уверенность", freshness: "Свежесть", trajectory: "Динамика",
    roundsShort: "{n} раундов", areas: "Где растёт этот навык", back: "К профилю", error: "Не удалось загрузить профиль навыков. Он обновится позже.",
  },
};

export function useProfileCopy() {
  const { lang, t } = useAppLang();
  const c = useCallback((key, vars = {}) => {
    const str = (COPY[lang] || COPY.en)[key] ?? COPY.en[key] ?? key;
    return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), str);
  }, [lang]);
  const skillName = useCallback((key) => {
    const k = `dashboard.skill${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    const v = t(k);
    return v === k ? key.charAt(0).toUpperCase() + key.slice(1) : v;
  }, [t]);
  return { c, skillName };
}