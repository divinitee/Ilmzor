import React from "react";
import TeachExperience from "@/components/lesson/TeachExperience";

// STRESS-TEST HARNESS, NOT REAL CONTENT — throwaway route to answer one
// question: does the existing renderer (unchanged) handle a structurally
// different concept using only the existing 4 beat types? Deliberately a
// vocabulary collocation pair (make vs do), not another grammar-tense
// contrast, since that's the version that actually strains the
// abstraction rather than confirming what already worked.
//
// Predicted finding, to be confirmed visually: the Contrast beat's motion
// (pulsing = repeats, settling = fires once) is hardcoded into the
// renderer, not parameterized by beat data — it was authored for Lesson
// 1's cyclical-vs-momentary distinction. make/do has no such quality, so
// the same motion will still play here, but as decoration, not meaning.
// That's the real signal this test exists to surface.
const STRESS_TEST_BEATS = [
  {
    type: "concept",
    english: "Some verbs go together with certain words, but not others.",
    support: {
      uz: "Ba'zi fe'llar ma'lum so'zlar bilan birga keladi, boshqalari bilan emas.",
      ru: "Некоторые глаголы сочетаются с определёнными словами, а с другими — нет.",
    },
  },
  {
    type: "example",
    english: "She made a mistake at the meeting.",
    emphasis: "made a mistake",
  },
  {
    type: "contrast",
    // Deliberately no `support` on these labels — MAKE/DO are the actual
    // target vocabulary here, not category labels like ROUTINE/NOW were.
    // Translating them would undercut the point of the lesson.
    left: { label: "MAKE", english: "make a mistake, make a decision, make a plan" },
    right: { label: "DO", english: "do homework, do the dishes, do a favor" },
  },
  {
    type: "micro_check",
    prompt: "Which verb goes with \"a mistake\"?",
    support: {
      uz: "\"a mistake\" so'zi bilan qaysi fe'l ishlatiladi?",
      ru: "Какой глагол сочетается с \"a mistake\"?",
    },
    options: [
      { english: "make", correct: true },
      { english: "do", correct: false },
    ],
  },
];

export default function TeachStressTest() {
  return <TeachExperience beats={STRESS_TEST_BEATS} onComplete={() => alert("Stress test complete — this would normally start Practice.")} />;
}
