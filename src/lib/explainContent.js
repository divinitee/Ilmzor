// Explain/Help content, keyed by screen context. English is always shown
// first via the Explain button; `help` (uz/ru) only surfaces if the
// student deliberately asks for it via the Help tier, after the
// encouraging nudge in ExplainHelp.jsx. Reuses the same {uz, ru} shape as
// every other support-language piece in the app — no new mechanism.
//
// Scoped to the Lesson Runner only, per explicit instruction — not "on all
// pages" yet. Content is hand-authored per context, same discipline as the
// rest of this prototype: no schema change, no per-item data, just a small
// fixed lookup table.
export const EXPLAIN_CONTENT = {
  orientation: {
    explain: "This page shows what you'll learn in this lesson. Read the goals, then tap Start when you're ready.",
    help: {
      uz: "Bu sahifada ushbu darsda nimalarni o'rganishingiz ko'rsatilgan. Maqsadlarni o'qing, keyin tayyor bo'lganingizda \"Start\" tugmasini bosing.",
      ru: "На этой странице показано, чему вы научитесь в этом уроке. Прочитайте цели, затем нажмите \"Start\", когда будете готовы.",
    },
  },
  teach_concept: {
    explain: "This is a short idea to get you started. Read it, then tap Continue.",
    help: {
      uz: "Bu sizni boshlash uchun qisqacha tushuncha. O'qing, so'ngra \"Continue\" tugmasini bosing.",
      ru: "Это краткая идея для начала. Прочитайте, затем нажмите \"Continue\".",
    },
  },
  teach_example: {
    explain: "This shows the idea in a real sentence. Notice the highlighted words \u2014 they're important.",
    help: {
      uz: "Bu g'oyani haqiqiy gapda ko'rsatadi. Belgilangan so'zlarga e'tibor bering \u2014 ular muhim.",
      ru: "Здесь идея показана в реальном предложении. Обратите внимание на выделенные слова \u2014 они важны.",
    },
  },
  teach_contrast: {
    explain: "Compare the two boxes to see how the meaning changes. Then tap Continue.",
    help: {
      uz: "Ma'no qanday o'zgarishini ko'rish uchun ikkita katakchani solishtiring. Keyin \"Continue\" tugmasini bosing.",
      ru: "Сравните два блока, чтобы увидеть, как меняется значение. Затем нажмите \"Continue\".",
    },
  },
  teach_micro_check: {
    explain: "Pick the answer you think is correct. This is just a quick check \u2014 it won't be scored.",
    help: {
      uz: "To'g'ri deb o'ylagan javobni tanlang. Bu shunchaki tezkor tekshiruv \u2014 baholanmaydi.",
      ru: "Выберите ответ, который считаете правильным. Это просто быстрая проверка \u2014 она не оценивается.",
    },
  },
  practice_mcq: {
    explain: "Choose the option that correctly completes the sentence.",
    help: {
      uz: "Gapni to'g'ri to'ldiruvchi variantni tanlang.",
      ru: "Выберите вариант, который правильно дополняет предложение.",
    },
  },
  practice_open: {
    explain: "Type your answer in your own words. It's okay if it's not perfect \u2014 just try your best.",
    help: {
      uz: "Javobingizni o'z so'zlaringiz bilan yozing. Mukammal bo'lmasa ham mayli \u2014 shunchaki qo'lingizdan kelganicha harakat qiling.",
      ru: "Напишите ответ своими словами. Не страшно, если не идеально \u2014 просто постарайтесь.",
    },
  },
  check_result: {
    explain: "This shows how you did on this lesson's checks. If something needs another try, we'll show you exactly what.",
    help: {
      uz: "Bu ushbu darsning tekshiruvlarida qanday natija ko'rsatganingizni ko'rsatadi. Agar biror narsani qayta urinish kerak bo'lsa, sizga aniq nima kerakligini ko'rsatamiz.",
      ru: "Здесь показано, как вы справились с проверками этого урока. Если что-то нужно повторить, мы точно покажем, что именно.",
    },
  },
};

export const HELP_LABEL = { uz: "Yordam", ru: "Помощь" };
export const LANG_NAME = { uz: "Uzbek", ru: "Russian" };
