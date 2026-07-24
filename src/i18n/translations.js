// i18n dictionaries for VocabularyMaster
// Default language: uz (Uzbek)

export const APP_LANGS = [
  { id: "uz", label: "O'zbekcha", short: "UZ", flag: "🇺🇿" },
  { id: "en", label: "English", short: "EN", flag: "🇬🇧" },
  { id: "ru", label: "Русский", short: "RU", flag: "🇷🇺" },
];

export const DEFAULT_LANG = "uz";

export const translations = {
  uz: {
    nav: {
      home: "Bosh sahifa",
      words: "So'zlar",
      games: "O'yinlar",
      ai_teacher: "AI Ustoz",
      settings: "Sozlamalar",
    },
    settings: {
      title: "Hisob sozlamalari",
      profile: "Profil",
      notifications: "Bildirishnomalar",
      email_notifications: "Email bildirishnomalari",
      email_notifications_desc: "Obuna va yangiliklar haqida email olish",
      saved: "Saqlandi",
      language: "Til",
      language_desc: "Ilova interfeysi tilini tanlang",
    },
    common: {
      back: "Orqaga",
      save: "Saqlash",
      cancel: "Bekor qilish",
    },
  },
  en: {
    nav: {
      home: "Home",
      words: "Words",
      games: "Games",
      ai_teacher: "AI Teacher",
      settings: "Settings",
    },
    settings: {
      title: "Account settings",
      profile: "Profile",
      notifications: "Notifications",
      email_notifications: "Email notifications",
      email_notifications_desc: "Receive emails about subscription and news",
      saved: "Saved",
      language: "Language",
      language_desc: "Choose the app interface language",
    },
    common: {
      back: "Back",
      save: "Save",
      cancel: "Cancel",
    },
  },
  ru: {
    nav: {
      home: "Главная",
      words: "Слова",
      games: "Игры",
      ai_teacher: "ИИ Учитель",
      settings: "Настройки",
    },
    settings: {
      title: "Настройки аккаунта",
      profile: "Профиль",
      notifications: "Уведомления",
      email_notifications: "Email-уведомления",
      email_notifications_desc: "Получать письма о подписке и новостях",
      saved: "Сохранено",
      language: "Язык",
      language_desc: "Выберите язык интерфейса приложения",
    },
    common: {
      back: "Назад",
      save: "Сохранить",
      cancel: "Отмена",
    },
  },
};

export const VALID_LANGS = APP_LANGS.map(l => l.id);

// resolve a dotted key path from a language dictionary
export function resolveKey(dict, key) {
  const parts = key.split(".");
  let cur = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return null;
  }
  return typeof cur === "string" ? cur : null;
}