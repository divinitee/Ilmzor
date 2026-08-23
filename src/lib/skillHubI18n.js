// Skill Hub localization: maps English labels/chrome to uz/ru.
// Labels that aren't in the map fall back to the original English string.
import { useCallback } from "react";
import { useAppLang } from "@/hooks/useAppLang";

const SKILL = {
  // ---- UI chrome ----
  "ui.lab": { uz: "Ingliz tili laboratoriyangiz", ru: "Ваша лаборатория английского" },
  "ui.title": { uz: "Bugun qaysi ko'nikmani rivojlantiramiz?", ru: "Какой навык развиваем сегодня?" },
  "ui.sub": {
    uz: "Bir sohani tanlang. O'yinlar, mashqlar va tavsiyalar avtomatik moslashadi.",
    ru: "Выберите одну область. Игры, упражнения и рекомендации адаптируются автоматически.",
  },
  "ui.center": { uz: "Ingliz ko'nikmalari", ru: "Навыки английского" },
  "ui.allSkills": { uz: "Barcha ko'nikmalar", ru: "Все навыки" },
  "ui.chooseChallenge": { uz: "Mashqni tanlang", ru: "Выберите задание" },
  "ui.soon": { uz: "(tezda)", ru: "(скоро)" },
  "ui.comingSoonTitle": { uz: "Bu ko'nikma tez orada qo'shiladi — kuting!", ru: "Этот навык скоро появится — следите за новостями!" },
  "ui.gotIt": { uz: "Tushundim", ru: "Понятно" },
  "ui.notAvailable": { uz: "Hali mavjud emas", ru: "Пока недоступно" },
  "ui.comingSoonTag": { uz: "(tezda)", ru: "(скоро)" },
  "ui.tapHint": { uz: "So'zni bosing, so'ng uning ta'rifini bosing", ru: "Нажмите слово, затем его определение" },

  // ---- difficulty / time ----
  Easy: { uz: "Oson", ru: "Лёгкий" },
  Medium: { uz: "O'rta", ru: "Средний" },
  Hard: { uz: "Qiyin", ru: "Сложный" },
  "3 min": { uz: "3 daq", ru: "3 мин" },
  "5 min": { uz: "5 daq", ru: "5 мин" },
  "8 min": { uz: "8 daq", ru: "8 мин" },

  // ---- top skills ----
  Vocabulary: { uz: "Vokabular", ru: "Словарный запас" },
  Grammar: { uz: "Grammatika", ru: "Грамматика" },
  Reading: { uz: "O'qish", ru: "Чтение" },
  Listening: { uz: "Tinglash", ru: "Аудирование" },
  Writing: { uz: "Yozish", ru: "Письмо" },
  Speaking: { uz: "Gaplashish", ru: "Говорение" },

  // ---- vocabulary children ----
  Meaning: { uz: "Ma'no", ru: "Значение" },
  Pronunciation: { uz: "Talaffuz", ru: "Произношение" },
  Spelling: { uz: "Imlo", ru: "Орфография" },
  "Word Forms": { uz: "So'z shakllari", ru: "Формы слов" },
  Usage: { uz: "Qo'llanilishi", ru: "Употребление" },
  Relationships: { uz: "Aloqalar", ru: "Связи" },

  // ---- grammar children ----
  "Sentence Structure": { uz: "Gap tuzilishi", ru: "Структура предложения" },
  "Verb Tenses": { uz: "Fe'l zamonlari", ru: "Времена глагола" },
  Articles: { uz: "Artikllar", ru: "Артикли" },
  Prepositions: { uz: "Prepozitsiyalar", ru: "Предлоги" },
  Punctuation: { uz: "Tinish belgilari", ru: "Пунктуация" },
  "Question Formation": { uz: "So'roq gaplar", ru: "Образование вопросов" },
  "Active vs Passive": { uz: "Aktiv va Passive", ru: "Действительный и страдательный" },
  Conditionals: { uz: "Shart gaplar", ru: "Условные предложения" },
  "Reported Speech": { uz: "Indirekt gap", ru: "Косвенная речь" },

  // ---- speaking children ----
  Fluency: { uz: "Suzuvchanlik", ru: "Беглость" },
  Intonation: { uz: "Intonatsiya", ru: "Интонация" },
  Shadowing: { uz: "Takrorlash", ru: "Теневой повтор" },
  Conversation: { uz: "Suhbat", ru: "Разговор" },
  Roleplay: { uz: "Rol o'yini", ru: "Ролевая игра" },

  // ---- reading children ----
  Comprehension: { uz: "Tushunish", ru: "Понимание" },
  Skimming: { uz: "Tez o'qish", ru: "Просмотр" },
  Scanning: { uz: "Qidirib o'qish", ru: "Поиск" },
  Inference: { uz: "Xulosa chiqarish", ru: "Умозаключение" },
  "Vocabulary in Context": { uz: "Kontekstdagi so'zlar", ru: "Слова в контексте" },

  // ---- listening children ----
  Understanding: { uz: "Tushunish", ru: "Понимание" },
  "Key Information": { uz: "Asosiy ma'lumot", ru: "Ключевая информация" },
  "Different Accents": { uz: "Turli shevalar", ru: "Разные акценты" },
  "Speed Training": { uz: "Tezlik mashqi", ru: "Тренировка скорости" },
  "Vocabulary Recognition": { uz: "So'zlarni tanish", ru: "Распознавание слов" },

  // ---- writing children ----
  "Sentence Building": { uz: "Gap qurish", ru: "Построение предложений" },
  "Paragraph Writing": { uz: "Paragraf yozish", ru: "Написание абзаца" },
  "Essay Writing": { uz: "Insho yozish", ru: "Написание эссе" },
  "Grammar Accuracy": { uz: "Grammatik aniqlik", ru: "Грамматическая точность" },
  "Vocabulary Usage": { uz: "So'z qo'llanishi", ru: "Употребление слов" },

  // ---- vocabulary challenges ----
  "Definition Match": { uz: "Ta'rif moslash", ru: "Сопоставление определений" },
  "Picture Match": { uz: "Rasm moslash", ru: "Сопоставление картинок" },
  "Context Guess": { uz: "Kontekstdan topish", ru: "Угадывание по контексту" },
  "Memory Flip": { uz: "Xotira kartalari", ru: "Карточки памяти" },
  "Hear & Choose": { uz: "Eshit va tanla", ru: "Слушай и выбирай" },
  "Stress Battle": { uz: "Bosim jangi", ru: "Битва ударений" },
  "Minimal Pairs": { uz: "Minimal juftliklar", ru: "Минимальные пары" },
  "Shadow Me": { uz: "Meni takrorla", ru: "Повторяй за мной" },
  Typing: { uz: "Yozish", ru: "Набор" },
  "Letter Order": { uz: "Harf tartibi", ru: "Порядок букв" },
  "Missing Letters": { uz: "Yetishmayotgan harflar", ru: "Пропущенные буквы" },
  "Word Family Builder": { uz: "So'z oilasi qurish", ru: "Семья слов" },
  "Prefix Match": { uz: "Prefiks moslash", ru: "Сопоставление приставок" },
  "Suffix Builder": { uz: "Suffiks qurish", ru: "Суффиксы" },
  "Root Hunt": { uz: "Ildiz qidirish", ru: "Поиск корня" },
  "Fill the Blank": { uz: "Bo'shliqni to'ldir", ru: "Заполни пропуск" },
  "Choose the Best Word": { uz: "To'g'ri so'zni tanla", ru: "Выбери лучшее слово" },
  "Sentence Repair": { uz: "Gapni tuzatish", ru: "Почини предложение" },
  "Collocation Match": { uz: "Kollokatsiya moslash", ru: "Сочетания" },
  "Synonym Sprint": { uz: "Sinonim poygasi", ru: "Спринт синонимов" },
  "Antonym Hunt": { uz: "Antonim ov", ru: "Охота за антонимами" },
  "Related Words": { uz: "Qarindosh so'zlar", ru: "Родственные слова" },
  "Connection Challenge": { uz: "Aloqalar mashqi", ru: "Связи" },

  // ---- grammar challenges ----
  "Word Order": { uz: "So'z tartibi", ru: "Порядок слов" },
  "Build It": { uz: "Qur", ru: "Построй" },
  "Present vs Past": { uz: "Hozirgi va O'tgan", ru: "Настоящее и прошедшее" },
  "Perfect Tenses": { uz: "Perfect zamonlar", ru: "Перфектные времена" },
  "A or An": { uz: "A yoki An", ru: "A или An" },
  "The or Zero": { uz: "The yoki nol", ru: "The или ноль" },
  "Time Prepositions": { uz: "Vaqt prepozitsiyalari", ru: "Предлоги времени" },
  "Place Prepositions": { uz: "Joy prepozitsiyalari", ru: "Предлоги места" },
  "End Marks": { uz: "Oxirgi belgilar", ru: "Знаки конца" },
  "Apostrophes & Commas": { uz: "Apostrof va vergul", ru: "Апостроф и запятая" },
  "Yes/No Questions": { uz: "Ha/Yo'q savollar", ru: "Да/Нет вопросы" },
  "Wh-Questions": { uz: "Wh-savollar", ru: "Wh-вопросы" },
  "Form the Passive": { uz: "Passivni yasash", ru: "Образуй страдательный" },
  "Spot the Voice": { uz: "Vozni top", ru: "Определи залог" },
  "Zero & First": { uz: "Nol va Birinchi", ru: "Ноль и первый" },
  "Second & Third": { uz: "Ikkinchi va Uchinchi", ru: "Второй и третий" },
  Statements: { uz: "Bayonotlar", ru: "Утверждения" },
  "Questions & Commands": { uz: "Savol va buyruqlar", ru: "Вопросы и приказы" },

  // ---- speaking challenges ----
  Repeat: { uz: "Takrorla", ru: "Повтори" },
  "Speak Up": { uz: "Gapir", ru: "Говори" },
  "Quick Talk": { uz: "Tez suhbat", ru: "Быстрый разговор" },
  "Rise / Fall": { uz: "Ko'tarilish / Tushish", ru: "Повышение / понижение" },
  Intone: { uz: "Intonatsiya", ru: "Интонируй" },
  Echo: { uz: "Aks sado", ru: "Эхо" },
  Dialog: { uz: "Dialog", ru: "Диалог" },
  Scene: { uz: "Sahna", ru: "Сцена" },
  Improvise: { uz: "Improvizatsiya", ru: "Импровизация" },

  // ---- reading challenges ----
  "Read & Answer": { uz: "O'qi va javob ber", ru: "Читай и отвечай" },
  "Deep Read": { uz: "Chuqur o'qish", ru: "Глубокое чтение" },
  "Fast Scan": { uz: "Tez qidirish", ru: "Быстрый поиск" },
  Gist: { uz: "Asosiy g'oya", ru: "Суть" },
  "Find It": { uz: "Top", ru: "Найди" },
  Hunt: { uz: "Ov", ru: "Охота" },
  Guess: { uz: "Taxmin qil", ru: "Угадай" },
  "Read Between": { uz: "O'rtasini o'qi", ru: "Читай между строк" },
  "Context Words": { uz: "Kontekst so'zlari", ru: "Слова контекста" },
  Clue: { uz: "Izoh", ru: "Подсказка" },

  // ---- listening challenges ----
  "Listen In": { uz: "Tingla", ru: "Слушай" },
  Catch: { uz: "Ushla", ru: "Лови" },
  "Key Hunt": { uz: "Kalit ov", ru: "Охота за главным" },
  "Main Point": { uz: "Asosiy nuqta", ru: "Главная мысль" },
  "Accent Match": { uz: "Sheva moslash", ru: "Сопоставление акцентов" },
  Voices: { uz: "Ovozlar", ru: "Голоса" },
  "Speed Run": { uz: "Tezlik poygasi", ru: "Скоростной забег" },
  Rapid: { uz: "Tez", ru: "Быстро" },
  "Hear & Pick": { uz: "Eshit va tanla", ru: "Слушай и выбирай" },
  Spot: { uz: "Top", ru: "Заметь" },

  // ---- writing challenges ----
  Build: { uz: "Qur", ru: "Построй" },
  Arrange: { uz: "Tartibla", ru: "Расставь" },
  Paragraph: { uz: "Paragraf", ru: "Абзац" },
  Flow: { uz: "Oqim", ru: "Поток" },
  Essay: { uz: "Insho", ru: "Эссе" },
  Draft: { uz: "Qoralama", ru: "Черновик" },
  Accuracy: { uz: "Aniqlik", ru: "Точность" },
  Proofread: { uz: "Tahrir", ru: "Вычитка" },
  "Use It": { uz: "Ishlat", ru: "Примени" },
  "Choose Word": { uz: "So'z tanla", ru: "Выбери слово" },

  // ---- subs (hints) ----
  Definitions: { uz: "Ta'riflar", ru: "Определения" },
  Context: { uz: "Kontekst", ru: "Контекст" },
  "Multiple meanings": { uz: "Ko'p ma'nolar", ru: "Несколько значений" },
  "Word stress": { uz: "So'z urgusi", ru: "Ударение" },
  IPA: { uz: "IPA", ru: "МФА" },
  "Letter order": { uz: "Harf tartibi", ru: "Порядок букв" },
  Noun: { uz: "Ot", ru: "Существительное" },
  Verb: { uz: "Fe'l", ru: "Глагол" },
  Adjective: { uz: "Sifat", ru: "Прилагательное" },
  Adverb: { uz: "Ravish", ru: "Наречие" },
  Prefixes: { uz: "Prefikslar", ru: "Приставки" },
  Suffixes: { uz: "Suffikslar", ru: "Суффиксы" },
  "Root words": { uz: "Ildiz so'zlar", ru: "Корни" },
  "Example sentences": { uz: "Misol gaplar", ru: "Примеры" },
  "Fill in the blank": { uz: "Bo'shliqni to'ldirish", ru: "Заполнение пропусков" },
  Collocations: { uz: "Kollokatsiyalar", ru: "Сочетания" },
  "Common mistakes": { uz: "Umumiy xatolar", ru: "Частые ошибки" },
  Synonyms: { uz: "Sinonimlar", ru: "Синонимы" },
  Antonyms: { uz: "Antonimlar", ru: "Антонимы" },
  "Related words": { uz: "Qarindosh so'zlar", ru: "Родственные слова" },
  "Word families": { uz: "So'z oilalari", ru: "Семьи слов" },
};

export function useSkillLoc() {
  const { lang } = useAppLang();
  return useCallback(
    (label) => {
      if (!label) return label;
      const m = SKILL[label];
      if (!m) return label;
      return m[lang] || label;
    },
    [lang]
  );
}