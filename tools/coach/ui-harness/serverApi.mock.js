// Fake coachApi/progressApi with the SAME response shapes as coachEngine.getToday.
// Submissions take 600 ms so a non-awaited submit would be caught by ordering.
const log = (window.__log = []);
const rec = (kind, detail) => log.push({ t: performance.now(), kind, detail });
const DELAY = 600;
const Q = new URLSearchParams(location.search);
const SCENARIO = Q.get("scenario") || "normal"; // normal | unavailable | partial
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const S = (window.__state = {
  onboarded: false, entitlement: "learner", persona: "velvet", allowed: 1, contUsed: 0, contPractised: false, active: 0,
  sessions: {
    "2026-10-08:today:0": SCENARIO === "unavailable" ? [
      { item_key: "word:v99:0", item_type: "word", word_id: "v99", label: "New", short_reason: "New", depth: "probe", questions: 5, est_minutes: 2 },
      { item_key: "grammar:tenses.past.simple", item_type: "grammar", label: "New", short_reason: "New", depth: "probe", questions: 5, est_minutes: 2 },
    ] : SCENARIO === "partial" ? [
      { item_key: "word:v1:0", item_type: "word", word_id: "v1", label: "Needs work", short_reason: "Needs work", depth: "probe", questions: 5, est_minutes: 2 },
      { item_key: "grammar:tenses.past.simple", item_type: "grammar", label: "New", short_reason: "New", depth: "probe", questions: 5, est_minutes: 2 },
    ] : [
      { item_key: "word:v1:0", item_type: "word", word_id: "v1", label: "Needs work", short_reason: "Needs work", depth: "remediation", questions: 9, est_minutes: 5 },
      { item_key: "grammar:tenses.present.simple-routine", item_type: "grammar", label: "New", short_reason: "New", depth: "probe", questions: 5, est_minutes: 2 },
      { item_key: "word:v2:0", item_type: "word", word_id: "v2", label: "Practising", short_reason: "Due", depth: "brushup", questions: 3, est_minutes: 1 },
    ],
    "2026-10-08:continuation:1": [
      { item_key: "word:v3:0", item_type: "word", word_id: "v3", label: "New", short_reason: "New", depth: "probe", questions: 5, est_minutes: 2 },
      { item_key: "grammar:tenses.present.third-person-s", item_type: "grammar", label: "New", short_reason: "New", depth: "probe", questions: 5, est_minutes: 2 },
    ],
  },
  done: {}, // session_key -> Set(item_key)
  submits: [],
});
const keyOf = (n) => (n ? `2026-10-08:continuation:${n}` : "2026-10-08:today:0");
function state(sessionNo) {
  const key = keyOf(sessionNo);
  const done = S.done[key] || new Set();
  const items = (S.sessions[key] || []).filter((i) => !done.has(i.item_key));
  return { key, done, items, complete: done.size > 0 && items.length === 0 };
}
function today(sessionNo) {
  const { key, done, items, complete } = state(sessionNo);
  const latestComplete = state(S.active).complete; // rule B: the LATEST session must be complete
  return {
    ok: true,
    coach: { entitlement: S.entitlement, coach: S.persona, persona: S.persona, conversionPersona: null, policy: "velvet@2", capabilities: {} },
    handoff: null,
    settings: { goal_id: "everyday", minutes: 10, minutesOptions: [10, 15, 20], goalSwitching: true, onboarded: S.onboarded,
      goals: [{ id: "everyday", objective: "Everyday English: words and grammar for daily life" }, { id: "vocabulary", objective: "Build my vocabulary" }] },
    session: { session_key: key, kind: sessionNo ? "continuation" : "today", session_no: sessionNo, spent_minutes: done.size, remaining_minutes: 10, complete },
    plan: { minutes: 10, minutes_planned: items.reduce((s, i) => s + i.est_minutes, 0), fallback: null, suggestion: null, items },
    done_today: Object.values(S.done).reduce((s, x) => s + x.size, 0),
    continuation: { allowed: S.allowed, used: S.contUsed, available: latestComplete && S.contUsed < S.allowed },
  };
}
export async function coachApi(action, payload = {}) {
  rec("coachApi:" + action, payload);
  await sleep(50);
  if (action === "whoami") {
    if (Q.get("whoami") === "fail") { const e = new Error("server_error"); e.code = "server_error"; throw e; }
    if (Q.get("whoami") === "slow") await sleep(1500);
    return { entitlement: S.entitlement, coach: S.persona, persona: S.persona, minutes: Number(Q.get("minutes") || 10) };
  }
  if (action === "getToday") return today(payload.session_no ?? S.active);
  if (action === "saveProfile") { if (payload.onboarded) S.onboarded = true; return { ok: true }; }
  if (action === "ackHandoff") return { ok: true };
  if (action === "startContinuation") {
    if (S.contUsed > 0 && !S.contPractised) return today(S.contUsed); // resume
    if (S.contUsed >= S.allowed) { const e = new Error("no_continuations_left"); e.code = "no_continuations_left"; throw e; }
    if (!state(S.active).complete) { const e = new Error("finish_today_first"); e.code = "finish_today_first"; throw e; }
    S.contUsed += 1; S.active = S.contUsed; S.contPractised = false;
    return today(S.active);
  }
  if (action === "getMap") return { goal_id: "everyday", grammar: [{ item_key: "grammar:tenses.present.simple-routine", item_type: "grammar", label: "Practising" }], words: [{ item_key: "word:v1:0", item_type: "word", word_id: "v1", label: "Needs work" }, { item_key: "word:v2:0", item_type: "word", word_id: "v2", label: "Strong" }], counts: { "New": 0, "Needs work": 1, "Practising": 1, "Strong": 1 } };
  throw new Error("unknown " + action);
}
export async function progressApi(action, body) {
  rec("submit:start", { game: body.game, session_key: body.coach?.session_key, n: body.items?.length });
  await sleep(DELAY);
  const key = body.coach?.session_key;
  if (key) {
    const planned = S.sessions[key] || [];
    const set = (S.done[key] ||= new Set());
    for (const it of planned) {
      if (body.game === "quiz" && it.item_type === "word" && body.items.some((x) => x.word_id === it.word_id)) set.add(it.item_key);
      if (body.game === "grammar_practice" && it.item_key === `grammar:${body.grammar_topic}`) set.add(it.item_key);
    }
    if (key.includes("continuation")) S.contPractised = true;
  }
  S.submits.push(body);
  rec("submit:end", { game: body.game, session_key: key });
  return { ok: true, verification: "server_graded" };
}
export const studentApi = async () => ({});
export const teacherApi = async () => ({});
export function joinErrorMessage() { return ""; }
