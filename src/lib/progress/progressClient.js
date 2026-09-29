import { progressApi } from "@/lib/serverApi";

// VT-6 client side of progress. The browser NEVER computes or persists
// mastery. It submits raw round evidence and XP separately to progressApi
// and mirrors the SkillState the server returns into a per-account cache.
// The cache is only ever REPLACED by a server response, and a response
// older than the cached one is ignored, so a stale tab can't roll it back.

const CACHE_KEY = "vm_skill_state_v2";
const LEGACY_KEY = "vm_skill_stats_v1";
export const SKILLSTATE_EVENT = "virora:skillstate";

export function readSkillCache(email) {
  if (!email) return null;
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    return c && c.email === email ? c : null;
  } catch { return null; }
}

function writeSkillCache(email, data) {
  if (!email || !data?.skills) return;
  const prev = readSkillCache(email);
  if (prev?.computed_at && data.computed_at && data.computed_at < prev.computed_at) return;
  const next = { email, skills: data.skills, overall: data.overall, computed_at: data.computed_at || null, today: data.today ?? prev?.today ?? null };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(SKILLSTATE_EVENT, { detail: next }));
}

export async function fetchSkillState(email) {
  const since = new Date(); since.setHours(0, 0, 0, 0);
  const data = await progressApi("getSkillState", { since: since.toISOString() });
  writeSkillCache(email, data);
  return readSkillCache(email);
}

/** Round evidence: { game, round_id, level, items: [...] }. Fire-and-forget. */
export async function submitEvidence(email, payload) {
  if (!email) return null;
  try {
    const data = await progressApi("submitEvidence", payload);
    writeSkillCache(email, data);
    return data;
  } catch (e) {
    console.error("progressApi submitEvidence failed", e);
    return null;
  }
}

/** XP only: { game, round_id, level, items_total, items_correct, amount, ... }. */
export async function submitReward(email, payload) {
  if (!email) return null;
  try { return await progressApi("submitReward", payload); }
  catch (e) { console.error("progressApi submitReward failed", e); return null; }
}