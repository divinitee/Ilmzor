import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lightbulb, Repeat, Layers, BookOpenCheck, MessageSquareText, Clock } from "lucide-react";

const tips = [
  {
    icon: Repeat,
    title: "Spaced repetition",
    desc: "So'zlarni bir marta emas, balki bir necha kun oralig'ida qayta-qayta takrorlang. Bu miyangizga so'zni uzoq muddatli xotiraga o'tkazishga yordam beradi.",
  },
  {
    icon: Layers,
    title: "Flashcard'lardan foydalaning",
    desc: "Har kuni 10-15 daqiqa flashcard rejimida mashq qiling — vizual takrorlash so'zlarni yodda saqlashni osonlashtiradi.",
  },
  {
    icon: MessageSquareText,
    title: "Jumla ichida ishlating",
    desc: "Yangi so'zni faqat yodlab qo'ymang — o'zingiz jumla tuzing. Bu so'zning ma'nosini kontekstda tushunishga yordam beradi.",
  },
  {
    icon: BookOpenCheck,
    title: "Muntazam test topshiring",
    desc: "Har bir unitni o'rgangandan so'ng testdan o'ting. Test natijalari qaysi so'zlarni ko'proq takrorlash kerakligini ko'rsatadi.",
  },
  {
    icon: Clock,
    title: "Kichik, lekin muntazam mashqlar",
    desc: "Bir kunda 100 ta so'zni yodlashga urinishdan ko'ra, har kuni 10-15 ta so'zni chuqur o'rganish samaraliroq.",
  },
];

export default function StudyTips() {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b border-border px-4 pb-3 flex items-center gap-3 safe-header sticky top-0 z-30">
        <Link to="/" className="text-muted-foreground hover:text-foreground p-1.5 select-none">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2 select-none">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-foreground">O'rganish maslahatlari</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground mb-6">
          So'z boyligingizni samaraliroq oshirish uchun ushbu isbotlangan usullardan foydalaning:
        </p>

        <div className="space-y-4">
          {tips.map((tip, i) => {
            const Icon = tip.icon;
            return (
              <div key={i} className="bg-background border border-border rounded-2xl p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{tip.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{tip.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}