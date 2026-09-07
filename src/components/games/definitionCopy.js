import { useCallback } from "react";
import { useAppLang } from "@/hooks/useAppLang";

// Local copy for the Definition game only, following definitionMatchCopy.js.
// Existing gameui.def_* keys in src/i18n/translations.js keep serving the
// prompt card, task box and sub-score labels; this module holds only what the
// 2026-09-07 rebuild added (HUD, result screen, cleared/not-cleared, and the
// previously hardcoded AI-limit message).
const COPY = {
  en: {
    title: "Definition",
    xp: "XP",
    streak: "Streak",
    progress: "{n} / {total}",
    loading: "Building your round…",
    ai_limit: "You've reached today's AI-graded practice. It refreshes tomorrow, or upgrade your plan for more.",
    cleared: "Cleared the bar",
    not_cleared: "Below the bar",
    avg_score: "Average {n}%",
    result_title: "Round complete",
    result_pass: "Meanings in your own words!",
    result_fail: "Keep practicing",
    cleared_stat: "Cleared",
    avg_stat: "Average score",
    best_streak: "Best streak",
    streak_bonus: "Streak bonus +{n}",
    words_this_round: "Words in this round",
    play_again: "Play again",
  },
  uz: {
    title: "Ta'rif",
    xp: "XP",
    streak: "Ketma-ketlik",
    progress: "{n} / {total}",
    loading: "Tur tayyorlanmoqda…",
    ai_limit: "Bugungi AI baholanadigan mashqlar tugadi. Ertaga yangilanadi yoki ko'proq uchun tarifni yangilang.",
    cleared: "Chegaradan o'tdi",
    not_cleared: "Chegaradan past",
    avg_score: "O'rtacha {n}%",
    result_title: "Tur yakunlandi",
    result_pass: "Ma'nolarni o'z so'zlaringiz bilan aytdingiz!",
    result_fail: "Mashq qilishda davom eting",
    cleared_stat: "O'tganlar",
    avg_stat: "O'rtacha ball",
    best_streak: "Eng uzun ketma-ketlik",
    streak_bonus: "Ketma-ketlik bonusi +{n}",
    words_this_round: "Bu turdagi so'zlar",
    play_again: "Qayta o'ynash",
  },
  ru: {
    title: "Определение",
    xp: "XP",
    streak: "Серия",
    progress: "{n} / {total}",
    loading: "Готовим раунд…",
    ai_limit: "Дневной лимит практики с AI-проверкой исчерпан. Он обновится завтра, или улучшите тариф.",
    cleared: "Планка взята",
    not_cleared: "Ниже планки",
    avg_score: "В среднем {n}%",
    result_title: "Раунд завершён",
    result_pass: "Значения своими словами!",
    result_fail: "Продолжайте тренироваться",
    cleared_stat: "Взято",
    avg_stat: "Средний балл",
    best_streak: "Лучшая серия",
    streak_bonus: "Бонус за серию +{n}",
    words_this_round: "Слова этого раунда",
    play_again: "Играть снова",
  },
};

export function useDefinitionCopy() {
  const { lang, t } = useAppLang();
  const c = useCallback((key, vars) => {
    let s = (COPY[lang] || COPY.en)[key] ?? COPY.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    return s;
  }, [lang]);
  return { c, t, lang };
}