import { base44 } from "@/api/base44Client";
import { shuffle } from "@/lib/vocabGameUtils";
import * as PC from "@/lib/placementContent";

const MASTERY_THRESHOLD = PC.OPEN_PASS_AVG; // 3.5 — same constant, not a new one, per locked Step 3 rules

// Cap on how many items a single activity shows per attempt when its
// matched pool is larger than this. Reuses the same per-type sample size
// already established in placementTest.js's pickGateSet, not a new number.
const SAMPLE_CAP = 5;

// Maps Activity.content_source (a string naming an export in placementContent.js)
// to the actual pool array. Every lesson activity's content is sampled from
// existing, already-validated content — no per-lesson authoring of vocab/grammar.
const POOLS = {
  A1_MCQ: PC.A1_MCQ, A2_MCQ: PC.A2_MCQ, B1_MCQ: PC.B1_MCQ, B2_MCQ: PC.B2_MCQ, C1_MCQ: PC.C1_MCQ,
  B1_OPEN_VOCAB: PC.B1_OPEN_VOCAB, B1_OPEN_GRAMMAR: PC.B1_OPEN_GRAMMAR,
  B2_OPEN_VOCAB: PC.B2_OPEN_VOCAB, B2_OPEN_GRAMMAR: PC.B2_OPEN_GRAMMAR,
  C1_OPEN_VOCAB: PC.C1_OPEN_VOCAB, C1_OPEN_GRAMMAR: PC.C1_OPEN_GRAMMAR,
};

// Resolves one Activity's content_source + content_filter (structured JSON,
// e.g. {concept: "X"} / {words: [...]} / {topic: "X"}) into a list of
// concrete items the runner can render. An activity with a `words` filter
// yields one item per word; concept/topic filters yield every pool item
// matching that value (deliberately not deduped to exactly one, so an
// activity can legitimately contain more than one prompt).
//
// content_source "INLINE" is a second, non-pool-backed path for a single
// authored item stored directly on the Activity record (content_filter IS
// the item, not a filter query against it) — used for one-off conceptual
// checks that don't belong in a shared, reusable content pool.
export function resolveActivityItems(activity) {
  if (activity.content_source === "INLINE") {
    const payload = activity.content_filter || {};
    return [{ ...payload, type: "vocab", format: "open" }];
  }

  const pool = POOLS[activity.content_source];
  if (!pool) return [];
  const filter = activity.content_filter || {};
  const isMcq = activity.activity_type === "mcq_quiz";

  let matched;
  if (filter.words) {
    matched = pool.filter((item) => filter.words.includes(item.english));
  } else if (filter.topic) {
    matched = pool.filter((item) => item.topic === filter.topic);
  } else if (filter.concept) {
    matched = pool.filter((item) => item.concept === filter.concept);
  } else {
    matched = pool;
  }

  return matched.map((item) => ({
    ...item,
    type: isMcq ? item.type : (item.english ? "vocab" : "grammar"),
    format: isMcq ? "mcq" : "open",
  }));
}

// The randomized, per-attempt version actually shown to the student:
// shuffles resolveActivityItems' full matched set and caps it at SAMPLE_CAP
// when the pool supplies more than that. Small matched sets (e.g. the fixed
// 2-3 word lists in this lesson) still get shuffled for order variety even
// though the exact items don't change — the pool genuinely doesn't have
// more to offer there. Pools are never modified; only which items get
// sampled from them, and in what order, varies per call.
export function getRandomizedItems(activity) {
  const items = resolveActivityItems(activity);
  const shuffled = shuffle(items);
  return shuffled.slice(0, Math.min(shuffled.length, SAMPLE_CAP));
}

// Fetches every check-role Activity's items and their latest graded attempt
// (grouped by item_label within that activity_id, per the locked "latest
// attempt per item" rule), returning which check activities still need
// attempting/retrying and which have already passed. Computed live from
// AssessmentResult on every entry — nothing about retry state is stored.
//
// Takes {activity, items}[] rather than re-resolving items itself: since
// items are now randomized per attempt (getRandomizedItems), status must be
// checked against the exact set actually shown this session, not a freshly
// re-sampled one — otherwise a passed check could re-sample different
// items on the next check and never resolve. The mastery math itself
// (average of latest per-item scores, 3.5 threshold) is unchanged.
export async function computeCheckStatus(userEmail, checkActivitiesWithItems) {
  const results = await Promise.all(checkActivitiesWithItems.map(async ({ activity, items }) => {
    const rows = await base44.entities.AssessmentResult.filter(
      { user_email: userEmail, activity_id: activity.id }, "-created_date"
    );
    const latestByItem = {};
    for (const row of rows) {
      const label = row.item_label;
      if (!(label in latestByItem)) latestByItem[label] = row.score;
    }
    const scores = items.map((item) => {
      const label = item.type === "vocab" ? item.english : (item.topic || item.question);
      return latestByItem[label];
    });
    const attempted = scores.every((s) => s !== undefined);
    const avg = attempted ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { activity, items, attempted, avg, passed: attempted && avg >= MASTERY_THRESHOLD };
  }));

  const pending = results.filter((r) => !r.passed);
  const allPassed = pending.length === 0;
  const mastery = allPassed ? results.reduce((s, r) => s + r.avg, 0) / results.length : null;
  return { results, pending, allPassed, mastery };
}

// Advances StudentProgress to the next lesson if one exists in this unit,
// otherwise leaves current_lesson_id as-is (no lesson 2 exists yet in this
// thin slice — advancing to a non-existent lesson would silently break the
// "Continue" button, so we deliberately don't).
export async function advanceProgress({ userEmail, learningPathId, moduleId, unitId, lessonId }) {
  const existing = await base44.entities.StudentProgress.filter({ user_email: userEmail, learning_path_id: learningPathId });
  const nextLessons = await base44.entities.Lesson.filter({ unit_id: unitId });
  const current = nextLessons.find((l) => l.id === lessonId);
  const next = nextLessons
    .filter((l) => l.order_index > (current?.order_index ?? 0))
    .sort((a, b) => a.order_index - b.order_index)[0];

  const payload = {
    user_email: userEmail,
    learning_path_id: learningPathId,
    current_module_id: moduleId,
    current_unit_id: unitId,
    current_lesson_id: next ? next.id : lessonId,
    last_activity_at: new Date().toISOString(),
  };

  if (existing.length > 0) {
    const prev = existing[0];
    await base44.entities.StudentProgress.update(prev.id, {
      ...payload,
      lessons_completed_count: (prev.lessons_completed_count || 0) + 1,
    });
  } else {
    await base44.entities.StudentProgress.create({
      ...payload,
      enrolled_at: new Date().toISOString(),
      lessons_completed_count: 1,
    });
  }
  return { hasNext: !!next };
}
