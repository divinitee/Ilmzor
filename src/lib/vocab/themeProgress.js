import { base44 } from "@/api/base44Client";
import { normalizeLemma } from "@/lib/vocab/lemma";
import { MASTERY_STATE, indexStates } from "@/lib/vocab/learnerState";
import { THEME_STATUS, ROLE, recycledLemmas } from "@/lib/vocab/curriculum";

// Theme-level progress: NOT_STARTED → IN_PROGRESS → MASTERED, per learner.
//
// A ThemeProgress row is a CACHE of the computation below, never the source of
// truth. That is what makes the mastery rule safe to change later: recompute
// re-derives every board from LearnerWordState + ThemeWord, with no migration
// and no learner losing history.
//
// Only CORE words count toward mastery. Supporting words exist so core words can
// be used naturally, and recycled words belong to an earlier theme — counting
// either would make a theme with a large supporting set effectively
// uncompletable.

export function computeThemeProgress({ theme, members, recycled = [], states, now = new Date() } = {}) {
  const core = (members?.core || []).map((m) => normalizeLemma(m.lemma));
  const all = [...core, ...(members?.supporting || []).map((m) => normalizeLemma(m.lemma)), ...recycled.map(normalizeLemma)];

  let coreMastered = 0;
  let coreInProgress = 0;
  let practiced = 0;
  let recycledMastered = 0;
  let started = null;
  let last = null;

  const touch = (state) => {
    if (!state) return;
    const seen = Date.parse(state.last_seen_at || "");
    if (Number.isNaN(seen)) return;
    if (started === null || seen < started) started = seen;
    if (last === null || seen > last) last = seen;
  };

  for (const lemma of core) {
    const state = states.get(lemma);
    if (!state) continue;
    if (state.mastery === MASTERY_STATE.MASTERED) coreMastered += 1;
    else if (state.mastery === MASTERY_STATE.IN_PROGRESS) coreInProgress += 1;
  }
  for (const lemma of new Set(all)) {
    const state = states.get(lemma);
    if (!state) continue;
    if (state.mastery !== MASTERY_STATE.NOT_STARTED) practiced += 1;
    touch(state);
  }
  for (const lemma of new Set(recycled.map(normalizeLemma))) {
    if (states.get(lemma)?.mastery === MASTERY_STATE.MASTERED) recycledMastered += 1;
  }

  const coreTotal = core.length;
  const pct = coreTotal > 0 ? Math.round((coreMastered / coreTotal) * 100) : 0;
  const needPct = theme?.mastery_core_pct ?? 0.8;
  const needMin = theme?.mastery_min_words ?? 10;
  // A theme with fewer core words than its own floor cannot be mastered yet —
  // reported honestly rather than being completable in three answers.
  const mastered = coreTotal >= needMin && coreMastered >= needMin && coreMastered / coreTotal >= needPct;

  return {
    theme_key: theme?.key,
    status: practiced === 0 ? THEME_STATUS.NOT_STARTED : mastered ? THEME_STATUS.MASTERED : THEME_STATUS.IN_PROGRESS,
    core_total: coreTotal,
    core_mastered: coreMastered,
    core_in_progress: coreInProgress,
    words_practiced: practiced,
    recycled_mastered: recycledMastered,
    mastery_pct: pct,
    started_at: started ? new Date(started).toISOString() : undefined,
    last_activity_at: last ? new Date(last).toISOString() : undefined,
    computed_at: now.toISOString(),
  };
}

// Recompute every published theme for one learner and persist the changes.
// `mastered_at` is only ever SET, never cleared: a later corpus expansion can
// push mastery_pct back below the threshold, and silently revoking an
// achievement the learner really earned would be wrong.
export async function recomputeThemeProgress({ userEmail, curriculum, states } = {}) {
  if (!userEmail || !curriculum?.themes?.length) return [];
  const stateIndex = states instanceof Map ? states : indexStates(states || []);
  const existing = await base44.entities.ThemeProgress.filter({ user_email: userEmail }).catch((e) => {
    console.error("ThemeProgress read failed", e);
    return [];
  });
  const byKey = new Map(existing.filter((r) => r?.theme_key).map((r) => [r.theme_key, r]));

  const out = [];
  for (const theme of curriculum.themes) {
    const computed = computeThemeProgress({
      theme,
      members: curriculum.members.get(theme.key),
      recycled: recycledLemmas(curriculum, theme.key),
      states: stateIndex,
    });
    const prev = byKey.get(theme.key);
    const payload = {
      user_email: userEmail,
      ...computed,
      started_at: prev?.started_at || computed.started_at,
      mastered_at:
        prev?.mastered_at || (computed.status === THEME_STATUS.MASTERED ? computed.computed_at : undefined),
    };
    // Skip the write when nothing a learner would notice has changed — at 200
    // themes this is the difference between one write and two hundred.
    const unchanged =
      prev &&
      prev.status === payload.status &&
      prev.core_mastered === payload.core_mastered &&
      prev.core_total === payload.core_total &&
      prev.words_practiced === payload.words_practiced;
    try {
      if (unchanged) out.push(prev);
      else if (prev) out.push(await base44.entities.ThemeProgress.update(prev.id, payload));
      else if (computed.status !== THEME_STATUS.NOT_STARTED) out.push(await base44.entities.ThemeProgress.create(payload));
    } catch (e) {
      console.error("ThemeProgress write failed", e);
    }
  }
  return out;
}

export async function loadThemeProgress(userEmail) {
  if (!userEmail) return [];
  return base44.entities.ThemeProgress.filter({ user_email: userEmail }).catch((e) => {
    console.error("ThemeProgress read failed", e);
    return [];
  });
}

export { ROLE };