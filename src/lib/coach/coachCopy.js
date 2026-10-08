// VIRORA Coach UI copy (VT-40 Stage 3, 2026-10-08). DRAFT for P5 (coach voices):
// en is the source; uz/ru are first drafts and NEED a native check before launch.
// Shared lines first, then per-persona overrides (vira friendly, velvet personal,
// vi strategic). Persona never changes WHAT the plan is, only how it is said.
// Students never see "round": UI says "Today's Practice" and "Keep going".

const SHARED = {
  en: {
    today_title: "Today's Practice",
    today_sub: "{n} min · picked for you",
    start: "Start",
    resume: "Continue",
    keep_going: "Keep going",
    keep_going_sub: "A fresh plan from what you just did",
    done_title: "Today's Practice is done",
    done_sub: "Everything else in VIRORA is still yours. Come back tomorrow for a new plan.",
    no_more_today: "That's all the guided practice for today.",
    back_home: "Back to home",
    map_title: "Your map",
    map_empty: "Your map fills in as you practise.",
    label_new: "New", label_weak: "Needs work", label_learning: "Practising", label_solid: "Strong",
    reason_review: "Review", reason_weak: "Needs work", reason_new: "New", reason_practice: "Practise", reason_prereq: "Comes first",
    word_check: "Word check", grammar_check: "Grammar",
    pick_meaning: "What does it mean?", pick_word: "Which English word?",
    next: "Next", skip: "Skip",
    item_of: "{i} of {n}",
    onboarding_title: "Meet your coach",
    onboarding_goal: "What do you want from English right now?",
    onboarding_minutes: "How long each day?",
    onboarding_go: "Make my plan",
    min: "{n} min",
    nothing_title: "Nothing urgent today",
    nothing_sub: "You're on top of your goal. Free practice is open.",
    free_practice: "Free practice",
    handoff_up: "{to} is your coach now",
    handoff_down: "{to} is your coach now. Everything you learned stays.",
    handoff_ok: "Let's go",
    see_plans: "See plans",
    loading: "Planning your practice…",
    error: "Couldn't load your plan. Try again.",
    retry: "Try again",
    how_planned: "Why these?",
    review_due: "Due for review",
    goal_switch_locked: "Switching goals comes with Learner",
  },
  uz: {
    today_title: "Bugungi mashg'ulot",
    today_sub: "{n} daqiqa · siz uchun tanlandi",
    start: "Boshlash", resume: "Davom etish",
    keep_going: "Yana davom etamiz", keep_going_sub: "Hozir qilganingiz asosida yangi reja",
    done_title: "Bugungi mashg'ulot tugadi",
    done_sub: "VIRORA'dagi boshqa hamma narsa ochiq. Ertaga yangi reja bo'ladi.",
    no_more_today: "Bugungi yo'naltirilgan mashg'ulot shu.",
    back_home: "Bosh sahifaga",
    map_title: "Sizning xaritangiz", map_empty: "Mashq qilganingiz sari xarita to'ladi.",
    label_new: "Yangi", label_weak: "Ishlash kerak", label_learning: "Mashq qilinmoqda", label_solid: "Mustahkam",
    reason_review: "Takrorlash", reason_weak: "Ishlash kerak", reason_new: "Yangi", reason_practice: "Mashq", reason_prereq: "Avval shu",
    word_check: "So'z tekshiruvi", grammar_check: "Grammatika",
    pick_meaning: "Ma'nosi nima?", pick_word: "Qaysi inglizcha so'z?",
    next: "Keyingisi", skip: "O'tkazib yuborish", item_of: "{i} / {n}",
    onboarding_title: "Murabbiyingiz bilan tanishing",
    onboarding_goal: "Hozir ingliz tilidan nima istaysiz?",
    onboarding_minutes: "Har kuni qancha vaqt?",
    onboarding_go: "Rejamni tuz", min: "{n} daq",
    nothing_title: "Bugun shoshilinch narsa yo'q", nothing_sub: "Maqsadingiz nazorat ostida. Erkin mashq ochiq.",
    free_practice: "Erkin mashq",
    handoff_up: "Endi murabbiyingiz — {to}", handoff_down: "Endi murabbiyingiz — {to}. O'rganganlaringiz saqlanadi.",
    handoff_ok: "Boshladik", see_plans: "Tariflar",
    loading: "Mashg'ulot rejalashtirilmoqda…", error: "Rejani yuklab bo'lmadi.", retry: "Qayta urinish",
    how_planned: "Nega aynan shular?", review_due: "Takrorlash vaqti",
    goal_switch_locked: "Maqsadni almashtirish Learner tarifida",
  },
  ru: {
    today_title: "Практика на сегодня",
    today_sub: "{n} мин · подобрано для вас",
    start: "Начать", resume: "Продолжить",
    keep_going: "Продолжаем", keep_going_sub: "Новый план по тому, что вы только что сделали",
    done_title: "Практика на сегодня готова",
    done_sub: "Всё остальное в VIRORA по-прежнему ваше. Завтра будет новый план.",
    no_more_today: "На сегодня это вся практика с коучем.",
    back_home: "На главную",
    map_title: "Ваша карта", map_empty: "Карта заполняется по мере практики.",
    label_new: "Новое", label_weak: "Нужно подтянуть", label_learning: "В практике", label_solid: "Уверенно",
    reason_review: "Повтор", reason_weak: "Нужно подтянуть", reason_new: "Новое", reason_practice: "Практика", reason_prereq: "Сначала это",
    word_check: "Проверка слова", grammar_check: "Грамматика",
    pick_meaning: "Что это значит?", pick_word: "Какое это английское слово?",
    next: "Дальше", skip: "Пропустить", item_of: "{i} из {n}",
    onboarding_title: "Знакомьтесь с вашим коучем",
    onboarding_goal: "Чего вы хотите от английского сейчас?",
    onboarding_minutes: "Сколько времени в день?",
    onboarding_go: "Составить план", min: "{n} мин",
    nothing_title: "Сегодня ничего срочного", nothing_sub: "Вы держите цель под контролем. Свободная практика открыта.",
    free_practice: "Свободная практика",
    handoff_up: "Теперь ваш коуч — {to}", handoff_down: "Теперь ваш коуч — {to}. Всё изученное сохранено.",
    handoff_ok: "Поехали", see_plans: "Тарифы",
    loading: "Составляем практику…", error: "Не удалось загрузить план.", retry: "Ещё раз",
    how_planned: "Почему именно это?", review_due: "Пора повторить",
    goal_switch_locked: "Смена цели — в тарифе Learner",
  },
};

// Persona lines (voice only). Missing keys fall back to SHARED.
const PERSONA = {
  vira: {
    en: { hello: "Hi, I'm Vira. Give me {n} minutes and I'll show you the best things to work on today.", done_title: "Nice work today!", upsell: "Want to keep going? Velvet gives you a second session every day." },
    uz: { hello: "Salom, men Vira. Menga {n} daqiqa bering — bugun nima ustida ishlashni ko'rsataman.", done_title: "Bugun zo'r ishladingiz!", upsell: "Davom etmoqchimisiz? Velvet har kuni ikkinchi mashg'ulot beradi." },
    ru: { hello: "Привет, я Вира. Дайте мне {n} минут, и я покажу, над чем лучше всего поработать сегодня.", done_title: "Отличная работа сегодня!", upsell: "Хотите продолжить? С Velvet — вторая сессия каждый день." },
  },
  velvet: {
    en: { hello: "I'm Velvet. I've looked at where you are. Here's your plan for today.", done_title: "That's today done. I'll have something new for you tomorrow." },
    uz: { hello: "Men Velvet. Qayerda ekaningizni ko'rib chiqdim. Mana bugungi rejangiz.", done_title: "Bugungisi tayyor. Ertaga yangi narsa tayyorlab qo'yaman." },
    ru: { hello: "Я Velvet. Я посмотрела, где вы сейчас. Вот ваш план на сегодня.", done_title: "На сегодня всё. Завтра подготовлю новое." },
  },
  vi: {
    en: { hello: "VI here. Highest-value work first: weak spots, then reviews, then new ground.", done_title: "Session complete. Your map is updated." },
    uz: { hello: "VI. Avval eng muhimi: zaif joylar, keyin takrorlash, keyin yangi mavzular.", done_title: "Mashg'ulot yakunlandi. Xaritangiz yangilandi." },
    ru: { hello: "Это VI. Сначала самое ценное: слабые места, затем повтор, затем новое.", done_title: "Сессия завершена. Карта обновлена." },
  },
};

export const COACH_NAMES = { vira: "Vira", velvet: "Velvet", vi: "VI" };
export const COACH_COLORS = { vira: "#B79CF2", velvet: "#8E3B7A", vi: "#D4AF37" };

const fill = (s, vars = {}) => String(s ?? "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));

/** coachT(lang, persona)(key, vars): persona line -> shared line -> English. */
export function coachT(lang = "en", persona = "vira") {
  const L = ["en", "uz", "ru"].includes(lang) ? lang : "en";
  return (key, vars) => {
    const p = PERSONA[persona]?.[L]?.[key] ?? PERSONA[persona]?.en?.[key];
    const s = p ?? SHARED[L][key] ?? SHARED.en[key] ?? key;
    return fill(s, vars);
  };
}

/** Server label ("New" | "Needs work" | "Practising" | "Strong") -> localized. */
export function labelKey(label) {
  return { "New": "label_new", "Needs work": "label_weak", "Practising": "label_learning", "Strong": "label_solid" }[label] || "label_new";
}

/** Server short_reason -> localized key. */
export function reasonKey(r) {
  const s = String(r || "").toLowerCase();
  if (s.includes("review")) return "reason_review";
  if (s.includes("need") || s.includes("weak")) return "reason_weak";
  if (s.includes("first") || s.includes("comes")) return "reason_prereq";
  if (s.includes("new")) return "reason_new";
  return "reason_practice";
}
