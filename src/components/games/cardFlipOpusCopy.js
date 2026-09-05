// Strings for CardFlip Opus (the Opus entry in the Memory Flip bake-off).
//
// Kept local to this implementation on purpose: two bake-off sessions
// appending to the shared src/i18n/translations.js at the same time is the
// one way they could clobber each other. Chrome strings that already exist
// in translations.js (gameui.back / retry / exit / level_label /
// coins_added / result_*) are still read through t() — only strings this
// implementation introduces live here. If this version wins, these fold
// into translations.js during the GameShell extraction pass.
//
// Selected with `lang` from useAppLang(), same as meaningInLang.

export const CARD_FLIP_OPUS_COPY = {
  en: {
    title: "Memory Flip",
    howTo: "Flip two cards — match each word with its meaning.",
    peek: "Memorise the board!",
    streak: "Streak",
    time: "Time",
    pairs: "Pairs",
    keepGoing: "Keep going",
    badgeSaved: "Saved by you",
    badgeWrongBefore: "This one beat you last time",
    badgeBeatIt: "You beat it",
    showTranslation: "Show translation",
    englishOnly: "English-only bonus kept",
    translationUsed: "Translation used",
    timeUp: "Time's up!",
    roundDone: "Round complete!",
    matched: "Matched",
    notAPair: "Not a pair",
    pairsOf: "{n} of {total} pairs",
    bestStreak: "Best streak",
    xpEarned: "XP earned",
    notEnough: "Not enough words for this game yet.",
    dealing: "Dealing cards…",
    yourWords: "Your words this round",
  },
  uz: {
    title: "Xotira kartalari",
    howTo: "Ikkita kartani aylantiring — har bir so'zni ma'nosi bilan moslang.",
    peek: "Kartalarni yodda saqlang!",
    streak: "Ketma-ketlik",
    time: "Vaqt",
    pairs: "Juftlar",
    keepGoing: "Davom etish",
    badgeSaved: "Siz saqlagan so'z",
    badgeWrongBefore: "Bu so'z o'tgan marta sizni yenggan",
    badgeBeatIt: "Siz uni yengdingiz",
    showTranslation: "Tarjimani ko'rsatish",
    englishOnly: "Faqat ingliz tilida — bonus saqlandi",
    translationUsed: "Tarjimadan foydalanildi",
    timeUp: "Vaqt tugadi!",
    roundDone: "Bosqich tugadi!",
    matched: "Moslandi",
    notAPair: "Juft emas",
    pairsOf: "{total} juftdan {n} tasi",
    bestStreak: "Eng yaxshi ketma-ketlik",
    xpEarned: "XP olindi",
    notEnough: "Bu o'yin uchun hozircha so'zlar yetarli emas.",
    dealing: "Kartalar tarqatilmoqda…",
    yourWords: "Bu bosqichdagi so'zlaringiz",
  },
  ru: {
    title: "Карточки памяти",
    howTo: "Переверните две карточки — сопоставьте слово с его значением.",
    peek: "Запомните карточки!",
    streak: "Серия",
    time: "Время",
    pairs: "Пары",
    keepGoing: "Продолжить",
    badgeSaved: "Сохранено вами",
    badgeWrongBefore: "В прошлый раз это слово вас обыграло",
    badgeBeatIt: "Вы его обыграли",
    showTranslation: "Показать перевод",
    englishOnly: "Бонус за только английский сохранён",
    translationUsed: "Перевод использован",
    timeUp: "Время вышло!",
    roundDone: "Раунд завершён!",
    matched: "Совпало",
    notAPair: "Не пара",
    pairsOf: "{n} из {total} пар",
    bestStreak: "Лучшая серия",
    xpEarned: "XP получено",
    notEnough: "Пока недостаточно слов для этой игры.",
    dealing: "Раздаём карточки…",
    yourWords: "Ваши слова в этом раунде",
  },
};

export const fill = (template, vars = {}) =>
  Object.keys(vars).reduce((s, k) => s.replaceAll(`{${k}}`, String(vars[k])), template || "");
