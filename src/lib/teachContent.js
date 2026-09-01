// Teach-phase beat content, one entry per Lesson id. This is the smallest
// possible authoring format that already existed inside LessonRunner.jsx —
// moved here verbatim, not redesigned, so Lesson 1's rendered experience
// is provably unchanged, not just assumed unchanged.
//
// Deliberately still a plain JS lookup, not a Base44 entity or a JSON
// file — that decision is explicitly deferred per instruction, to be made
// only after this separation is itself proven on Lesson 1. Adding a second
// lesson means adding a second key here; LessonRunner.jsx needs zero
// changes to pick it up, since its lookup (`TEACH_BEATS_BY_LESSON[lesson.id]`)
// was already a single generic line, never a per-lesson branch.
export const TEACH_BEATS_BY_LESSON = {
  "6a9562a427021c1279709e25": [
    { type: "concept", english: "Some things happen regularly.", support: { uz: "Ba'zi narsalar muntazam sodir bo'ladi.", ru: "Некоторые вещи происходят регулярно." } },
    { type: "example", english: "I wake up at 7 every day.", emphasis: "every day" },
    {
      type: "contrast",
      visual_behavior: "cycle_vs_moment",
      left: { label: "ROUTINE", english: "I wake up at 7.", support: { uz: "ODATIY", ru: "ОБЫЧНО" } },
      right: { label: "NOW", english: "I am waking up.", support: { uz: "HOZIR", ru: "СЕЙЧАС" } },
    },
    {
      type: "micro_check",
      prompt: "Which sentence describes a routine?",
      support: { uz: "Qaysi gap odatiy harakatni tasvirlaydi?", ru: "Какое предложение описывает привычное действие?" },
      options: [
        { english: "I wake up at 7.", correct: true },
        { english: "I am waking up.", correct: false },
      ],
    },
  ],
};
