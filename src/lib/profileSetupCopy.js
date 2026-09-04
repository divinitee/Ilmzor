// Copy for the four things every student has to tell us about themselves:
// their name, why they're learning, their level, and their class code.
//
// Shared because it's collected in two places. Email/password signups answer
// it inside registration (src/pages/Register.jsx); Google signups never touch
// that form — they come back from the provider straight into the app — so they
// answer the same four questions in ProfileSetup during onboarding. Keeping one
// copy of the strings means the level wording can't drift between the two.
export const PROFILE_STR = {
  uz: {
    nameTitle: "Ismingiz",
    nameSub: "Ism familiyangizni kiriting",
    fullName: "Ism familiya",
    fullNamePh: "Masalan: Alibek Karimov",

    goalsTitle: "Ingliz tilini nima uchun o'rganasiz?",
    goalsSub: "Mos keladigan barchasini tanlang — so'zlarni shaxsiylashtiramiz",
    goals: { work: "Ish", ielts: "IELTS", travel: "Sayohat", university: "Universitet", movies: "Kino", daily: "Kundalik suhbat" },

    levelTitle: "Ingliz tilingiz qay darajada?",
    levelSub: "O'zingizga eng mos keladiganini tanlang — so'z va o'yinlarni shunga moslaymiz. Keyin o'zgartirsa bo'ladi.",
    levelOpts: {
      Starter: "Endi boshlayapman — bir nechta so'z bilaman",
      A1: "Oddiy so'z va kundalik iboralarni bilaman",
      A2: "Kundalik oddiy suhbatni olib bora olaman",
      B1: "Tanish mavzularda erkin gaplasha olaman",
      B2: "Fikrimni asoslay olaman, tez nutqni tushunaman",
      C1: "Erkin gapiraman — nozik jihatlar ustida ishlayapman",
    },

    codeTitle: "Sinf kodi",
    codeSub: "O'qituvchingiz bergan kodni kiriting",
    codeLabel: "Sinf kodi",
    codePh: "Masalan: ABC123",
    codeHint: "O'qituvchingiz bergan sinf kodini kiriting",
    optional: "ixtiyoriy",

    next: "Keyingisi", back: "Orqaga", finish: "Tayyor", saving: "Saqlanmoqda...",
  },
  en: {
    nameTitle: "Your name",
    nameSub: "Enter your full name",
    fullName: "Full name",
    fullNamePh: "e.g. Alibek Karimov",

    goalsTitle: "What are you learning English for?",
    goalsSub: "Select all that apply — we'll personalize your words",
    goals: { work: "Work", ielts: "IELTS", travel: "Travel", university: "University", movies: "Movies", daily: "Daily conversation" },

    levelTitle: "What's your English level?",
    levelSub: "Pick the one that sounds most like you — we'll tune the words and games to match. You can change it later.",
    levelOpts: {
      Starter: "Just starting — I know a few words",
      A1: "I know basic words and everyday phrases",
      A2: "I can handle simple, everyday conversation",
      B1: "I can discuss familiar topics comfortably",
      B2: "I can argue a point and follow fast speech",
      C1: "I'm fluent — working on nuance and precision",
    },

    codeTitle: "Class code",
    codeSub: "Enter the code from your teacher",
    codeLabel: "Class code",
    codePh: "e.g. ABC123",
    codeHint: "Enter the class code given by your teacher",
    optional: "optional",

    next: "Next", back: "Back", finish: "Done", saving: "Saving...",
  },
  ru: {
    nameTitle: "Ваше имя",
    nameSub: "Введите имя и фамилию",
    fullName: "Имя и фамилия",
    fullNamePh: "Напр. Алибек Каримов",

    goalsTitle: "Зачем вы учите английский?",
    goalsSub: "Выберите всё подходящее — мы подберём слова для вас",
    goals: { work: "Работа", ielts: "IELTS", travel: "Путешествия", university: "Университет", movies: "Кино", daily: "Повседневное общение" },

    levelTitle: "Какой у вас уровень английского?",
    levelSub: "Выберите то, что больше похоже на вас — подберём слова и игры под вас. Позже можно изменить.",
    levelOpts: {
      Starter: "Только начинаю — знаю несколько слов",
      A1: "Знаю базовые слова и повседневные фразы",
      A2: "Могу поддержать простой повседневный разговор",
      B1: "Свободно обсуждаю знакомые темы",
      B2: "Могу аргументировать и понимаю быструю речь",
      C1: "Свободно владею — работаю над нюансами",
    },

    codeTitle: "Код класса",
    codeSub: "Введите код от учителя",
    codeLabel: "Код класса",
    codePh: "Напр. ABC123",
    codeHint: "Введите код класса, выданный учителем",
    optional: "необязательно",

    next: "Далее", back: "Назад", finish: "Готово", saving: "Сохранение...",
  },
};

export const GOAL_KEYS = ["work", "ielts", "travel", "university", "movies", "daily"];
