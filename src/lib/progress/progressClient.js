import { progressApi } from "@/lib/serverApi";

// VT-6 client side of progress. The browser NEVER computes or persists
// mastery: it submits raw round results to progressApi and mirrors the
// SkillState the server returns into a per-account localStorage cache, so
// Skill Hub chips can render instantly. The cache is always overwritten by
// the next server response and is ignored for any other account.

const CACHE_KEY = "vm_skill_state_v2";
const LEGACY_KEY = "vm_skill_stats_v1"; // old peak-score store — removed, never read
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
  const next = { email, skills: data.skills, overall: data.overall, today: data.today ?? prev?.today ?? null };
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

// Canonical round contract: { game, round_id, level, items_correct,
// items_total } or, for grammar, { items: [{item_id, correct}], grammar_topic }.
// Plus the XP breakdown the round already computed (ledgered as-is).
// Fire-and-forget for callers: a failed submit costs history, never the round.
export async function submitRound(email, payload) {
  if (!email) return null;
  try {
    const data = await progressApi("submitRound", payload);
    writeSkillCache(email, data);
    return data;
  } catch (e) {
    console.error("progressApi submitRound failed", e);
    return null;
  }
}