import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowLeft } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-indigo-950 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </Link>

        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <BookOpen className="w-7 h-7 text-primary" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-6">Ilova haqida</h1>

        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground space-y-4 leading-relaxed">
          <p>
            Vocabulary A2·B1·B2 — bu ingliz tilini o'rganayotgan o'quvchilar uchun mo'ljallangan interaktiv,
            o'yinlashtirilgan lug'at trenajyoridir. Ilova A2 dan B2 darajasigacha bo'lgan minglab so'zlarni
            unitlar bo'yicha tartiblangan holda taqdim etadi, har bir so'z uchun inglizcha, o'zbekcha va
            ruscha tarjimalar, shuningdek talaffuz yozuvlarini o'z ichiga oladi.
          </p>
          <p>
            O'quvchilar so'z boyligini flashkartalar, viktorinalar va jumla tuzish o'yinlari orqali
            mustahkamlashlari mumkin. Har bir to'g'ri javob uchun tanga yutib olish, sinfdoshlar bilan
            reyting jadvalida raqobatlashish va sun'iy intellekt asosidagi "AI Ustoz" bilan suhbat orqali
            yangi so'zlarni chuqurroq o'zlashtirish imkoniyati mavjud.
          </p>
          <p>
            Ilova ikki turdagi foydalanuvchilar uchun yaratilgan: <strong>o'quvchilar</strong> — o'z bilim
            darajasini oshirishni istagan har qanday yoshdagi til o'rganuvchilar, va <strong>o'qituvchilar</strong> —
            o'z guruhlarini boshqarish, o'quvchilar natijalarini kuzatish va ular bilan bevosita muloqot
            qilish imkoniyatiga ega bo'lgan mutaxassislar.
          </p>
          <p>
            Ilovani <strong>Salohiddin Nurullaev va Temur Normatov</strong> ishlab chiqishgan va doimiy ravishda
            yangi so'zlar, o'yinlar va funksiyalar bilan yangilab bormoqda.
          </p>
        </div>
      </div>
    </div>
  );
}