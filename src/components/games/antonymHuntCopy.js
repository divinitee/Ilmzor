import { useCallback } from "react";
import { useAppLang } from "@/hooks/useAppLang";

// Local copy for Antonym Hunt, following synonymSprintCopy.js's convention
// (src/i18n/translations.js is not touched by game engines). The old
// OddOneOutGame had zero translation coverage — every string was a hardcoded
// English literal.
const COPY = {
  en: {
    title: "Antonym Hunt",
    instruction: "Four of these mean the same. Tap the one that means the opposite.",
    xp: "XP",
    streak: "Streak",
    attempts: "Tries left",
    item_progress: "{n}/{total} words",
    question: "Word {n} of {total}",
    correct: "Correct!",
    miss: "Not that one",
    loading: "Building your round…",
    empty: "Not enough words for this game yet.",
    result_title: "Round complete",
    result_out_of_attempts: "Out of tries",
    result_pass: "Sharp eye!",
    result_fail: "Keep practicing",
    first_try: "First-try correct",
    tries_used: "Tries used",
    accuracy: "Accuracy",
    best_streak: "Best streak",
    streak_bonus: "Streak bonus +{n}",
    words_this_round: "Words in this round",
    keep_going: "Keep going",
    play_again: "Play again",
  },
  uz: {
    title: "Antonim Ovi",
    instruction: "To'rttasi bir xil ma'noni bildiradi. Qarama-qarshi ma'nolisini bosing.",
    xp: "XP",
    streak: "Ketma-ketlik",
    attempts: "Qolgan urinish",
    item_progress: "{n}/{total} so'z",
    question: "{total} tadan {n}-so'z",
    correct: "To'g'ri!",
    miss: "Bu emas",
    loading: "Tur tayyorlanmoqda…",
    empty: "Bu o'yin uchun hozircha so'zlar yetarli emas.",
    result_title: "Tur yakunlandi",
    result_out_of_attempts: "Urinishlar tugadi",
    result_pass: "Ko'zingiz o'tkir!",
    result_fail: "Mashq qilishda davom eting",
    first_try: "Birinchi urinishda to'g'ri",
    tries_used: "Ishlatilgan urinish",
    accuracy: "Aniqlik",
    best_streak: "Eng uzun ketma-ketlik",
    streak_bonus: "Ketma-ketlik bonusi +{n}",
    words_this_round: "Bu turdagi so'zlar",
    keep_going: "Davom etish",
    play_again: "Qayta o'ynash",
  },
  ru: {
    title: "Антоним-охота",
    instruction: "Четыре из этих слов — синонимы. Нажмите то, которое означает противоположное.",
    xp: "XP",
    streak: "Серия",
    attempts: "Попыток осталось",
    item_progress: "{n}/{total} слов",
    question: "Слово {n} из {total}",
    correct: "Верно!",
    miss: "Не то",
    loading: "Готовим раунд…",
    empty: "Пока недостаточно слов для этой игры.",
    result_title: "Раунд завершён",
    result_out_of_attempts: "Попытки закончились",
    result_pass: "Зоркий глаз!",
    result_fail: "Продолжайте тренироваться",
    first_try: "Верно с первой попытки",
    tries_used: "Использовано попыток",
    accuracy: "Точность",
    best_streak: "Лучшая серия",
    streak_bonus: "Бонус за серию +{n}",
    words_this_round: "Слова этого раунда",
    keep_going: "Продолжить",
    play_again: "Играть снова",
  },
};

export function useHuntCopy() {
  const { lang, t } = useAppLang();
  const c = useCallback((key, vars) => {
    let s = (COPY[lang] || COPY.en)[key] ?? COPY.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    return s;
  }, [lang]);
  return { c, t, lang };
}