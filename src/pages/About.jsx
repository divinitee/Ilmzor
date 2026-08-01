import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowLeft } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";

const STR = {
  uz: {
    back: "Orqaga", title: "Ilova haqida",
    p1: "Vocabulary A2·B1·B2 — bu ingliz tilini o'rganayotgan o'quvchilar uchun mo'ljallangan interaktiv, o'yinlashtirilgan lug'at trenajyoridir. Ilova A2 dan B2 darajasigacha bo'lgan minglab so'zlarni unitlar bo'yicha tartiblangan holda taqdim etadi, har bir so'z uchun inglizcha, o'zbekcha va ruscha tarjimalar, shuningdek talaffuz yozuvlarini o'z ichiga oladi.",
    p2: "O'quvchilar so'z boyligini flashkartalar, viktorinalar va jumla tuzish o'yinlari orqali mustahkamlashlari mumkin. Har bir to'g'ri javob uchun tanga yutib olish, sinfdoshlar bilan reyting jadvalida raqobatlashish va sun'iy intellekt asosidagi \"AI Ustoz\" bilan suhbat orqali yangi so'zlarni chuqurroq o'zlashtirish imkoniyati mavjud.",
    p3a: "Ilova ikki turdagi foydalanuvchilar uchun yaratilgan: ", p3Student: "o'quvchilar", p3b: " — o'z bilim darajasini oshirishni istagan har qanday yoshdagi til o'rganuvchilar, va ", p3Teacher: "o'qituvchilar", p3c: " — o'z guruhlarini boshqarish, o'quvchilar natijalarini kuzatish va ular bilan bevosita muloqot qilish imkoniyatiga ega bo'lgan mutaxassislar.",
    p4a: "Ilovani ", p4b: " ishlab chiqishgan va doimiy ravishda yangi so'zlar, o'yinlar va funksiyalar bilan yangilab bormoqda.",
  },
  en: {
    back: "Back", title: "About the app",
    p1: "Vocabulary A2·B1·B2 is an interactive, gamified vocabulary trainer designed for learners studying English. The app offers thousands of words from A2 to B2 level organized into units, with English, Uzbek, and Russian translations, as well as pronunciation guides for each word.",
    p2: "Learners can reinforce their vocabulary through flashcards, quizzes, and sentence-building games. You can earn coins for every correct answer, compete with classmates on the leaderboard, and master new words more deeply by chatting with the AI-powered \"AI Tutor\".",
    p3a: "The app is built for two types of users: ", p3Student: "students", p3b: " — language learners of any age who want to improve their skills, and ", p3Teacher: "teachers", p3c: " — professionals who can manage their groups, track student results, and communicate directly with them.",
    p4a: "The app was developed by ", p4b: " and is constantly updated with new words, games, and features.",
  },
  ru: {
    back: "Назад", title: "О приложении",
    p1: "Vocabulary A2·B1·B2 — интерактивный, игровой тренажёр словаря, предназначенный для изучающих английский язык. Приложение предлагает тысячи слов от уровня A2 до B2, сгруппированных по разделам, с переводами на английский, узбекский и русский, а также транскрипцией для каждого слова.",
    p2: "Ученики могут закреплять словарный запас с помощью флеш-карт, викторин и игр по построению предложений. За каждый правильный ответ можно получать монеты, соревноваться с одноклассниками в таблице лидеров и глубже усваивать новые слова через общение с \"ИИ Учителем\".",
    p3a: "Приложение создано для двух типов пользователей: ", p3Student: "учеников", p3b: " — изучающих язык любого возраста, желающих повысить свой уровень, и ", p3Teacher: "учителей", p3c: " — специалистов, управляющих своими группами, отслеживающих результаты учеников и общающихся с ними напрямую.",
    p4a: "Приложение разработали ", p4b: ", и оно постоянно обновляется новыми словами, играми и функциями.",
  },
};

export default function About() {
  const { lang } = useAppLang();
  const s = STR[lang] || STR.uz;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-indigo-950 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> {s.back}
        </Link>

        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <BookOpen className="w-7 h-7 text-primary" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-6">{s.title}</h1>

        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground space-y-4 leading-relaxed">
          <p>{s.p1}</p>
          <p>{s.p2}</p>
          <p>
            {s.p3a}<strong>{s.p3Student}</strong>{s.p3b}<strong>{s.p3Teacher}</strong>{s.p3c}
          </p>
          <p>
            {s.p4a}<strong>Salohiddin Nurullaev & Temur Normatov</strong>{s.p4b}
          </p>
        </div>
      </div>
    </div>
  );
}