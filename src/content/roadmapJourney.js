export const ROAD_PATH = "M 8 260 C 90 222 118 158 202 168 C 284 178 306 236 378 205 C 452 174 426 108 500 84 C 548 68 576 50 610 30";

export const STAGES = [
  {
    id: "foundation", pathFraction: 0.18,
    copy: {
      en: { name:"Foundation", kicker:"SHIPPED", short:"The core learning system is in place.", title:"The learning system takes shape.", desc:"The infrastructure that makes VIRORA a real learning product is here.", items:["Skill Hub","CEFR progression","Vocabulary engine","Grammar architecture","Practice & assessment"] },
      uz: { name:"Foundation", kicker:"TAYYOR", short:"Asosiy o‘rganish tizimi ishga tushgan.", title:"O‘rganish tizimi shakllandi.", desc:"VIRORA'ni haqiqiy o‘rganish mahsulotiga aylantiradigan asosiy infratuzilma mavjud.", items:["Skill Hub","CEFR progression","Vocabulary engine","Grammar architecture","Practice & assessment"] },
      ru: { name:"Foundation", kicker:"ГОТОВО", short:"Основная система обучения уже работает.", title:"Система обучения формируется.", desc:"Базовая инфраструктура, превращающая VIRORA в полноценный продукт обучения, уже создана.", items:["Skill Hub","CEFR progression","Vocabulary engine","Grammar architecture","Practice & assessment"] }
    }
  },
  {
    id:"personalization", pathFraction:0.405,
    copy: {
      en:{ name:"Personalization", kicker:"BUILDING NOW", short:"VIRORA begins adapting the path to the learner.", title:"The system starts learning about the learner.", desc:"VIRORA moves beyond activity tracking and begins adapting progression, practice and mastery around the individual.", items:["Meaningful mastery","Adaptive learning paths","Grammar progression","Vocabulary intelligence","Learner weakness signals"] },
      uz:{ name:"Personalization", kicker:"HOZIR QURILMOQDA", short:"VIRORA yo‘lni o‘quvchiga moslashtira boshlaydi.", title:"Tizim o‘quvchini o‘rganishni boshlaydi.", desc:"VIRORA oddiy faollikni kuzatishdan o‘tib, rivojlanish, mashq va mastery'ni shaxsga moslashtira boshlaydi.", items:["Meaningful mastery","Adaptive learning paths","Grammar progression","Vocabulary intelligence","Learner weakness signals"] },
      ru:{ name:"Personalization", kicker:"СЕЙЧАС В РАБОТЕ", short:"VIRORA начинает адаптировать путь под ученика.", title:"Система начинает узнавать ученика.", desc:"VIRORA выходит за рамки отслеживания активности и начинает адаптировать прогресс, практику и освоение под человека.", items:["Meaningful mastery","Adaptive learning paths","Grammar progression","Vocabulary intelligence","Learner weakness signals"] }
    }
  },
  {
    id:"intelligence", pathFraction:0.715,
    copy: {
      en:{ name:"Intelligence", kicker:"NEXT CHAPTER", short:"AI and learner signals make the system increasingly responsive.", title:"The learning system becomes increasingly intelligent.", desc:"AI and learner data connect to make practice, feedback and recommendations more responsive.", items:["AI Tutor","AI feedback","Smart practice","Personalized recommendations"] },
      uz:{ name:"Intelligence", kicker:"KEYINGI BOSQICH", short:"AI va o‘quvchi signallari tizimni yanada moslashuvchan qiladi.", title:"O‘rganish tizimi yanada aqlli bo‘ladi.", desc:"AI va o‘quvchi ma’lumotlari mashq, feedback va tavsiyalarni yanada moslashuvchan qiladi.", items:["AI Tutor","AI feedback","Smart practice","Personalized recommendations"] },
      ru:{ name:"Intelligence", kicker:"СЛЕДУЮЩАЯ ГЛАВА", short:"AI и сигналы ученика делают систему всё более адаптивной.", title:"Система обучения становится интеллектуальнее.", desc:"AI и данные ученика объединяются, чтобы сделать практику, обратную связь и рекомендации более точными.", items:["AI Tutor","AI feedback","Smart practice","Personalized recommendations"] }
    }
  },
  {
    id:"system", pathFraction:0.90,
    copy: {
      en:{ name:"The VIRORA System", kicker:"DESTINATION", short:"Every part works together as one connected learning system.", title:"Everything works as one system.", desc:"Skills, curriculum, practice, vocabulary, grammar, progress and AI continuously inform one another.", items:["Connected skills","Continuous personalization","Unified learner model","One learning system"] },
      uz:{ name:"VIRORA tizimi", kicker:"MANZIL", short:"Barcha qismlar yagona o‘rganish tizimi sifatida ishlaydi.", title:"Hammasi yagona tizimga aylanadi.", desc:"Ko‘nikmalar, curriculum, mashqlar, vocabulary, grammatika, progress va AI bir-birini doimiy ravishda boyitadi.", items:["Connected skills","Continuous personalization","Unified learner model","One learning system"] },
      ru:{ name:"Система VIRORA", kicker:"ЦЕЛЬ", short:"Все части работают как единая система обучения.", title:"Всё работает как одна система.", desc:"Навыки, программа, практика, словарь, грамматика, прогресс и AI постоянно дополняют друг друга.", items:["Connected skills","Continuous personalization","Unified learner model","One learning system"] }
    }
  }
];

export const CURRENT_STAGE_ID = "personalization";
export const CURRENT_STAGE_INDEX = STAGES.findIndex(stage => stage.id === CURRENT_STAGE_ID);

export const ROADMAP_UI = {
  en:{ journey:"The VIRORA journey", chapter:"Chapter", explore:"Explore the journey", continue:"Continue journey", full:"See the full roadmap", roadmap:"Full roadmap", built:"BUILDING NOW · chapter 2 of 4", back:"Back to VIRORA", position:"Your position", founder:"Founding Learner", founderDesc:"Enter during this chapter and lock the current price.", pricing:"See founding pricing", roster:"Live development roster", rosterTitle:"See what is actually moving.", rosterDesc:"A public-facing view of VIRORA's work: ideas become planned work, planned work becomes active work, and shipped work becomes part of the system.", destination:"The destination", destinationTitle:"From separate learning tools to one connected system.", destinationDesc:"Vocabulary, grammar, practice, assessment, progress and AI should continuously inform one another.", close:"Close", roadmapChapter:"Roadmap chapter", systemBack:"Back to the journey", ariaExplore:"Explore the next chapter."},
  uz:{ journey:"VIRORA sayohati", chapter:"Bosqich", explore:"Sayohatni ko‘rish", continue:"Davom etish", full:"To‘liq roadmap", roadmap:"To‘liq roadmap", built:"HOZIR QURILMOQDA · 2 / 4-bosqich", back:"VIRORA'ga qaytish", position:"Sizning o‘rningiz", founder:"Founding Learner", founderDesc:"Shu bosqichda qo‘shiling va joriy narxni qulflang.", pricing:"Asoschi narxini ko‘rish", roster:"Jonli rivojlanish", rosterTitle:"Haqiqatan nima harakatlanayotganini ko‘ring.", rosterDesc:"VIRORA ishlarining ochiq ko‘rinishi: g‘oyalar rejalarga, rejalar faol ishlarga, bajarilgan ishlar esa tizimga aylanadi.", destination:"Manzil", destinationTitle:"Alohida o‘rganish vositalaridan yagona tizimga.", destinationDesc:"Vocabulary, grammatika, mashq, baholash, progress va AI bir-birini doimiy ravishda boyitadi.", close:"Yopish", roadmapChapter:"Roadmap bosqichi", systemBack:"Sayohatga qaytish", ariaExplore:"Keyingi bosqichni ko‘rish."},
  ru:{ journey:"Путь VIRORA", chapter:"Глава", explore:"Исследовать путь", continue:"Продолжить", full:"Открыть полный roadmap", roadmap:"Полный roadmap", built:"СЕЙЧАС В РАБОТЕ · глава 2 из 4", back:"Назад в VIRORA", position:"Ваша позиция", founder:"Founding Learner", founderDesc:"Присоединитесь на этом этапе и зафиксируйте текущую цену.", pricing:"Смотреть цену основателя", roster:"Разработка в реальном времени", rosterTitle:"Посмотрите, что действительно движется.", rosterDesc:"Открытый взгляд на работу VIRORA: идеи становятся планами, планы — активной разработкой, а готовые части — частью системы.", destination:"Цель", destinationTitle:"От отдельных инструментов обучения к единой системе.", destinationDesc:"Словарь, грамматика, практика, оценивание, прогресс и AI постоянно дополняют друг друга.", close:"Закрыть", roadmapChapter:"Глава roadmap", systemBack:"Вернуться к пути", ariaExplore:"Открыть следующую главу."}
};

export function getRoadmapStages(lang="en") {
  const language = ["en","uz","ru"].includes(lang) ? lang : "en";
  return STAGES.map(stage => ({ ...stage, ...stage.copy[language] }));
}
export function getRoadmapUI(lang="en") {
  return ROADMAP_UI[["en","uz","ru"].includes(lang) ? lang : "en"];
}
