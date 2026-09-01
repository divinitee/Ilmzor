// Support-language translations for custom grammar/vocab instructions —
// kept deliberately small and scoped, not a general system. Covers
// exactly the 5 "Present Simple vs Progressive" B1_OPEN_GRAMMAR prompts
// currently reachable through Lesson 1's check activity, since that's the
// actual bounded set a student can hit today, not the hundreds of
// instructions across every pool (that remains real, deferred work, not
// silently expanded here). Keyed by the exact English instruction string
// so OpenGateItem can look a translation up without any new data field.
export const INSTRUCTION_SUPPORT = {
  "Write two sentences about your normal routine and what you are doing differently this week. Use the present simple and present progressive.": {
    uz: "Oddiy kunlik tartibingiz va bu hafta boshqacha qilayotgan ishingiz haqida ikkita gap yozing. Present simple va present progressive'dan foydalaning.",
    ru: "Напишите два предложения о своей обычной рутине и о том, что вы делаете по-другому на этой неделе. Используйте present simple и present progressive.",
  },
  "Write two sentences: one about something you usually do every weekend, and one about something different you are doing this particular weekend.": {
    uz: "Ikkita gap yozing: biri odatda dam olish kunlarida qiladigan ishingiz haqida, ikkinchisi esa aynan shu dam olish kunlarida boshqacha qilayotgan ishingiz haqida.",
    ru: "Напишите два предложения: одно о том, что вы обычно делаете каждые выходные, и одно о том, что вы делаете по-другому именно в эти выходные.",
  },
  "This sentence has an error: 'My brother is working at a bank every day.' Correct it, and briefly explain what was wrong.": {
    uz: "Bu gapda xato bor: 'My brother is working at a bank every day.' Uni to'g'rilang va nima xato ekanligini qisqacha tushuntiring.",
    ru: "В этом предложении есть ошибка: 'My brother is working at a bank every day.' Исправьте её и кратко объясните, что было не так.",
  },
  "Look at this sentence: 'The sun rises in the east.' Explain why we use the present simple here instead of the present progressive.": {
    uz: "Bu gapga qarang: 'The sun rises in the east.' Nima uchun bu yerda present progressive emas, present simple ishlatilishini tushuntiring.",
    ru: "Посмотрите на это предложение: 'The sun rises in the east.' Объясните, почему здесь используется present simple, а не present progressive.",
  },
  "Write about what you usually eat, and what you are eating differently this week (for example, during a holiday or a diet).": {
    uz: "Odatda nima yeyishingiz va bu hafta nima uchun boshqacha ovqatlanayotganingiz haqida yozing (masalan, bayram yoki parhez tufayli).",
    ru: "Напишите о том, что вы обычно едите, и о том, что вы едите по-другому на этой неделе (например, во время праздника или диеты).",
  },
};
