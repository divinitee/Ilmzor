// Explain/Help content, keyed by screen context. English is always shown
// first via the Explain button; `help` (uz/ru) only surfaces if the
// student deliberately asks for it via the Help tier, after the
// encouraging nudge in ExplainHelp.jsx. Reuses the same {uz, ru} shape as
// every other support-language piece in the app — no new mechanism.
//
// Help is deliberately more thorough than the passive SupportSubtitle
// elsewhere in the app: it translates the actual substance on screen (the
// real objectives, the real example sentences, the real answer options),
// not just "how to use this button." That's an intentional difference —
// SupportSubtitle is an ambient aid sitting next to practice content, so it
// stays restrained (English must still be practiced); Help is a
// deliberately-gated, one-tap-away last resort a student has to actively
// choose to reach, so it's allowed to give real, complete support once
// they're there. Same underlying principle ("confidence/support when
// appropriate"), applied at the intensity each tier actually calls for.
//
// Scoped to the Lesson Runner only, per explicit instruction — not "on all
// pages" yet. Content is hand-authored per context, same discipline as the
// rest of this prototype: no schema change, no per-item data, just a small
// fixed lookup table.
export const EXPLAIN_CONTENT = {
  orientation: {
    explain: "This page shows what you'll learn in this lesson. Read the goals, then tap Start when you're ready.",
    help: {
      uz: "Bu darsda siz: (1) 5 ta kundalik so'zni tanib-tushunishni, (2) odatiy harakatlar uchun Present Simple'ni to'g'ri qo'llashni, va (3) Present Simple bilan Present Progressive orasidagi farqni bilib olasiz. Tayyor bo'lganingizda \"Start\" tugmasini bosing.",
      ru: "В этом уроке вы: (1) научитесь узнавать и понимать 5 слов о повседневных делах, (2) правильно использовать Present Simple для привычных действий, и (3) отличать Present Simple от Present Progressive. Когда будете готовы, нажмите \"Start\".",
    },
  },
  teach_concept: {
    explain: "This is a short idea to get you started. Read it, then tap Continue.",
    help: {
      uz: "G'oya: \"Ba'zi narsalar muntazam sodir bo'ladi\" \u2014 bu odatlar yoki takrorlanadigan harakatlar haqida. O'qib bo'lgach, \"Continue\" tugmasini bosing.",
      ru: "Идея: \"Некоторые вещи происходят регулярно\" \u2014 это про привычки или повторяющиеся действия. Прочитав, нажмите \"Continue\".",
    },
  },
  teach_example: {
    explain: "This shows the idea in a real sentence. Notice the highlighted words \u2014 they're important.",
    help: {
      uz: "Bu gap \u2014 \"I wake up at 7 every day\" (Men har kuni soat 7da uyg'onaman) \u2014 odatiy harakatga misol. Belgilangan \"every day\" (har kuni) so'ziga e'tibor bering.",
      ru: "Это предложение \u2014 \"I wake up at 7 every day\" (Я просыпаюсь в 7 каждый день) \u2014 пример привычного действия. Обратите внимание на выделенное \"every day\" (каждый день).",
    },
  },
  teach_contrast: {
    explain: "Compare the two boxes to see how the meaning changes. Then tap Continue.",
    help: {
      uz: "Chap tomon (ODATIY): \"I wake up at 7\" (Men soat 7da uyg'onaman) \u2014 bu doimiy odat. O'ng tomon (HOZIR): \"I am waking up\" (Men hozir uyg'onyapman) \u2014 bu hozir sodir bo'layotgan harakat. Tayyor bo'lganingizda \"Continue\"ni bosing.",
      ru: "Слева (ОБЫЧНО): \"I wake up at 7\" (Я просыпаюсь в 7) \u2014 это постоянная привычка. Справа (СЕЙЧАС): \"I am waking up\" (Я сейчас просыпаюсь) \u2014 это происходит прямо сейчас. Когда будете готовы, нажмите \"Continue\".",
    },
  },
  teach_micro_check: {
    explain: "Pick the answer you think is correct. This is just a quick check \u2014 it won't be scored.",
    help: {
      uz: "Savol: \"Qaysi gap odatiy harakatni tasvirlaydi?\" Javob variantlari: \"I wake up at 7\" (odatiy) va \"I am waking up\" (hozir). To'g'ri deb o'ylagan javobni tanlang \u2014 bu baholanmaydi.",
      ru: "Вопрос: \"Какое предложение описывает привычное действие?\" Варианты: \"I wake up at 7\" (обычно) и \"I am waking up\" (сейчас). Выберите ответ, который считаете правильным \u2014 это не оценивается.",
    },
  },
  practice_mcq: {
    explain: "Choose the option that correctly completes the sentence.",
    help: {
      uz: "Gapdagi bo'sh joyni to'ldiradigan to'g'ri so'zni tanlang. Bu mashq \u2014 xato qilsangiz ham xavotir olmang.",
      ru: "Выберите правильное слово, которое дополняет предложение. Это упражнение \u2014 не переживайте, если ошибётесь.",
    },
  },
  practice_open: {
    explain: "Type your answer in your own words. It's okay if it's not perfect \u2014 just try your best.",
    help: {
      uz: "Javobingizni ingliz tilida, o'z so'zlaringiz bilan yozing. Mukammal bo'lishi shart emas \u2014 shunchaki tushunganingizni ko'rsating.",
      ru: "Напишите ответ на английском, своими словами. Не обязательно идеально \u2014 просто покажите, что понимаете.",
    },
  },
  check_result: {
    explain: "This shows how you did on this lesson's checks. If something needs another try, we'll show you exactly what.",
    help: {
      uz: "Bu yerda ushbu darsdagi tekshiruvlar natijalari ko'rsatiladi. Agar biror qism past baho olsa, sizga aynan nimani qayta ko'rib chiqish kerakligini ko'rsatamiz.",
      ru: "Здесь показаны результаты проверок этого урока. Если что-то получит низкую оценку, мы точно покажем, что нужно повторить.",
    },
  },
};

export const HELP_LABEL = { uz: "Yordam", ru: "Помощь" };
export const LANG_NAME = { uz: "Uzbek", ru: "Russian" };
