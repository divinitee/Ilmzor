// Dashboard data helpers: learning goal, greeting, derived stats, demo data, and trilingual strings.

export const GOAL_LABELS = {
  work: { en: "Business English", uz: "Biznes ingliz tili", ru: "Деловой английский" },
  ielts: { en: "IELTS Band 8 Vocabulary", uz: "IELTS Band 8 lug'ati", ru: "Словарь IELTS Band 8" },
  travel: { en: "Travel English", uz: "Sayohat ingliz tili", ru: "Английский для путешествий" },
  university: { en: "Academic English", uz: "Akademik ingliz tili", ru: "Академический английский" },
  movies: { en: "Media & Film English", uz: "Media va kino ingliz tili", ru: "Английский для кино и медиа" },
  daily: { en: "Daily Conversation", uz: "Kundalik suhbat", ru: "Повседневное общение" },
};

export function getLearningGoal(lang) {
  try {
    const goals = JSON.parse(localStorage.getItem("user_goals") || "[]");
    if (Array.isArray(goals) && goals.length > 0 && GOAL_LABELS[goals[0]]) {
      return GOAL_LABELS[goals[0]][lang] || GOAL_LABELS[goals[0]].en;
    }
  } catch { /* ignore */ }
  return lang === "uz" ? "Umumiy ingliz tili" : lang === "ru" ? "Общий английский" : "General English";
}

export function getGreetingKey() {
  const h = new Date().getHours();
  if (h < 12) return "greetingMorning";
  if (h < 18) return "greetingAfternoon";
  return "greetingEvening";
}

export function computeStats(results) {
  const totalQuizzes = results.length;
  const totalCorrect = results.reduce((s, r) => s + (r.score || 0), 0);
  const totalQuestions = results.reduce((s, r) => s + (r.total_questions || 30), 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  return { totalQuizzes, totalCorrect, totalQuestions, accuracy };
}

// Demo data used where backend values are unavailable.
export const DEMO = {
  wordsToday: 12,
  wordsWeek: 68,
  wordsMonth: 240,
  wordsYear: 1840,
  wordsLifetime: 3120,
  streak: 7,
  dailyGoalProgress: 60,
  studyTimeRemaining: 18,
  pathProgress: 35,
  reviewRetention: 82,
  strongest: "Travel",
  weakest: "Business",
  vocabLevel: "B1 Intermediate",
  weekActivity: [
    { day: "Mon", value: 4 },
    { day: "Tue", value: 7 },
    { day: "Wed", value: 3 },
    { day: "Thu", value: 9 },
    { day: "Fri", value: 6 },
    { day: "Sat", value: 8 },
    { day: "Sun", value: 5 },
  ],
};

export const DASH_STR = {
  en: {
    greetingMorning: "Good morning", greetingAfternoon: "Good afternoon", greetingEvening: "Good evening",
    continueLearning: "Continue Learning", resume: "Resume",
    changeUnit: "Change unit",
    todaysFocus: "Today's Focus", tasksDone: "tasks done",
    dailyGoal: "Daily goal", accuracy: "Accuracy", streak: "Streak", days: "days",
    studyTimeLeft: "Time left", min: "min", pathProgress: "Path progress",
    taskReview: "Review 15 new words", taskQuiz: "Complete today's quiz", taskPractice: "Practice 10 min speaking",
    recentActivity: "Recent Activity", completedQuiz: "Completed quiz", achievement: "Achievement unlocked",
    noActivity: "No recent activity yet — start your first quiz!",
    vocabStats: "Vocabulary Statistics", today: "Today", thisWeek: "This week", thisMonth: "This month",
    thisYear: "This year", lifetime: "Lifetime", wordsMastered: "words mastered",
    last7Days: "Last 7 Days", activity: "Learning activity",
    performance: "Performance", avgAccuracy: "Average accuracy", reviewRetention: "Review retention",
    strongestCategory: "Strongest category", weakestCategory: "Weakest category", vocabLevel: "Vocabulary level",
  },
  uz: {
    greetingMorning: "Xayrli tong", greetingAfternoon: "Xayrli kun", greetingEvening: "Xayrli kech",
    continueLearning: "Davom etish", resume: "Davom etish",
    changeUnit: "Unitni o'zgartirish",
    todaysFocus: "Bugungi reja", tasksDone: "vazifa bajarildi",
    dailyGoal: "Kunlik maqsad", accuracy: "Aniqlik", streak: "Ketma-ketlik", days: "kun",
    studyTimeLeft: "Qolgan vaqt", min: "daq", pathProgress: "Yo'nalish progressi",
    taskReview: "15 ta yangi so'zni takrorlash", taskQuiz: "Bugungi testni topshirish", taskPractice: "10 daqiqa gaplashish mashqi",
    recentActivity: "So'nggi faollik", completedQuiz: "Test topshirildi", achievement: "Yutuq ochildi",
    noActivity: "Hozircha faollik yo'q — birinchi testingizni boshlang!",
    vocabStats: "So'zlar statistikasi", today: "Bugun", thisWeek: "Bu hafta", thisMonth: "Bu oy",
    thisYear: "Bu yil", lifetime: "Jami", wordsMastered: "so'z o'zlashtirildi",
    last7Days: "So'nggi 7 kun", activity: "O'qish faolligi",
    performance: "Natija", avgAccuracy: "O'rtacha aniqlik", reviewRetention: "Takrorlash darajasi",
    strongestCategory: "Kuchli yo'nalish", weakestCategory: "Zaif yo'nalish", vocabLevel: "So'z darajasi",
  },
  ru: {
    greetingMorning: "Доброе утро", greetingAfternoon: "Добрый день", greetingEvening: "Добрый вечер",
    continueLearning: "Продолжить", resume: "Продолжить",
    changeUnit: "Сменить раздел",
    todaysFocus: "План на сегодня", tasksDone: "задач выполнено",
    dailyGoal: "Дневная цель", accuracy: "Точность", streak: "Серия", days: "дн.",
    studyTimeLeft: "Осталось", min: "мин", pathProgress: "Прогресс курса",
    taskReview: "Повторить 15 новых слов", taskQuiz: "Пройти сегодняшний тест", taskPractice: "10 мин разговорной практики",
    recentActivity: "Недавняя активность", completedQuiz: "Тест пройден", achievement: "Достижение разблокировано",
    noActivity: "Активности пока нет — пройдите первый тест!",
    vocabStats: "Статистика слов", today: "Сегодня", thisWeek: "За неделю", thisMonth: "За месяц",
    thisYear: "За год", lifetime: "Всего", wordsMastered: "слов освоено",
    last7Days: "Последние 7 дней", activity: "Активность обучения",
    performance: "Результаты", avgAccuracy: "Средняя точность", reviewRetention: "Удержание",
    strongestCategory: "Сильная категория", weakestCategory: "Слабая категория", vocabLevel: "Уровень словаря",
  },
};