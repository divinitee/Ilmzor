import { useCallback } from "react";
import { useAppLang } from "@/hooks/useAppLang";

// Local copy for Synonym Sprint only, following contextGuessCopy.js's
// convention (src/i18n/translations.js is not touched by game engines). The
// node used to run VocabQuizGame, whose strings were generic translation-drill
// copy — nothing here existed before.
const COPY = {
  en: {
    title: "Synonym Sprint",
    instruction: "Pick the word closest in meaning.",
    xp: "XP",
    streak: "Streak",
    attempts: "Tries left",
    item_progress: "{n}/{total} words",
    question: "Word {n} of {total}",
    correct: "Correct!",
    miss: "Not that one",
    badge_saved: "Saved by you",
    badge_wrong_before: "This one beat you last time",
    badge_wrong_after: "You beat it",
    show_translation: "Show translation",
    hide_translation: "Hide translation",
    english_bonus: "English-only bonus",
    loading: "Building your round…",
    empty: "Not enough words for this game yet.",
    result_title: "Round complete",
    result_out_of_attempts: "Out of tries",
    result_pass: "Fast and sharp!",
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
    title: "Sinonim Poygasi",
    instruction: "Ma'nosi eng yaqin so'zni tanlang.",
    xp: "XP",
    streak: "Ketma-ketlik",
    attempts: "Qolgan urinish",
    item_progress: "{n}/{total} so'z",
    question: "{total} tadan {n}-so'z",
    correct: "To'g'ri!",
    miss: "Bu emas",
    badge_saved: "Siz saqlagansiz",
    badge_wrong_before: "O'tgan safar adashtirgan so'z",
    badge_wrong_after: "Endi yengdingiz",
    show_translation: "Tarjimani ko'rsat",
    hide_translation: "Tarjimani yashir",
    english_bonus: "Inglizcha bonus",
    loading: "Tur tayyorlanmoqda…",
    empty: "Bu o'yin uchun hozircha so'zlar yetarli emas.",
    result_title: "Tur yakunlandi",
    result_out_of_attempts: "Urinishlar tugadi",
    result_pass: "Tez va aniq!",
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
    title: "Синоним-спринт",
    instruction: "Выберите слово, ближайшее по значению.",
    xp: "XP",
    streak: "Серия",
    attempts: "Попыток осталось",
    item_progress: "{n}/{total} слов",
    question: "Слово {n} из {total}",
    correct: "Верно!",
    miss: "Не то",
    badge_saved: "Вы сохранили",
    badge_wrong_before: "В прошлый раз не получилось",
    badge_wrong_after: "Вы справились",
    show_translation: "Показать перевод",
    hide_translation: "Скрыть перевод",
    english_bonus: "Бонус за английский",
    loading: "Готовим раунд…",
    empty: "Пока недостаточно слов для этой игры.",
    result_title: "Раунд завершён",
    result_out_of_attempts: "Попытки закончились",
    result_pass: "Быстро и точно!",
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

export function useSprintCopy() {
  const { lang, t } = useAppLang();
  const c = useCallback((key, vars) => {
    let s = (COPY[lang] || COPY.en)[key] ?? COPY.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    return s;
  }, [lang]);
  return { c, t, lang };
}