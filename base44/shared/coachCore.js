// VIRORA Coach Engine — PURE core (VT-40, Stage 1, 2026-10-08).
// Spec: Claude Doc "Coach Engine v0 — Spec (Stage 0, rev 3)", project doc
// claude/vira/VIRA-V0-SPEC.md. No SDK, no I/O, no clock reads: every function
// takes `now` / data as arguments so the same inputs always give the same
// outputs (testable in node: tools/coach/core-tests.mjs).
//
// Layer rules (locked A1-A9):
//   * This file holds FACTS (evidence -> learner state). It never reads a
//     policy or a persona. The same evidence gives the same LearnerItem under
//     every coach (Vira / Velvet / VI).
//   * FSRS is NOT here: game/grammar-practice evidence never moves FSRS. Only
//     coach sessions do (Stage 2, coachEngine.ts).
//   * Ranking / session planning arrive in Stage 2 and will read a policy.
//
// All numbers marked PLACEHOLDER are starting values for testing, not tuning.

export const ENGINE_VERSION = "coach-core@1";

// ---------------------------------------------------------------------------
// Days. A coach "day" is the calendar day in Asia/Tashkent (UTC+5, no DST),
// the same convention subscriptionCore.js uses for expiry.
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
export const dayOf = (ms) => new Date(Number(ms) + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
const ms = (iso) => { const t = Date.parse(iso || ""); return Number.isNaN(t) ? null : t; };

// ---------------------------------------------------------------------------
// Item keys (A3). One LearnerItem per item, any type, namespaced.
//   word:<word_id>:<sense_index>   one meaning (resolved)
//   word:<word_id>:*               meaning unknown for a multi-sense word
//   word:lemma:<lemma>:*           no word_id could be resolved at all
//   grammar:<topic-slug>           a grammar practice topic
//   grammar:hub.<bank>             legacy Skill Hub grammar quiz bank (not on any goal path)
//   skill:<leaf>                   reserved
export const ITEM_TYPES = ["word", "grammar", "skill"];
export const isResolved = (key) => !String(key || "").endsWith(":*");

export const normalizeLemma = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, " ");

/**
 * Resolve a word evidence row to an item, following the identity contract:
 * sense_id first, then word_id, then normalized lemma. A sense is NEVER guessed
 * for a multi-sense word (Gate: "never infer a sense the caller did not specify").
 *
 *   senseIndexes: Map<word_id, number[]>   approved WordSense indexes per word
 *   wordIdsByLemma: Map<lemma, string[]>   VocabularyWord ids per lemma_key
 */
export function resolveWordItem(row, { senseIndexes = new Map(), wordIdsByLemma = new Map() } = {}) {
  const sid = String(row?.sense_id || "");
  const m = sid.match(/^([^:]+):(\d+)$/);
  if (m) return { item_type: "word", item_key: `word:${m[1]}:${Number(m[2])}`, word_id: m[1], sense_index: Number(m[2]), resolved: true };
  const lemma = normalizeLemma(row?.word);
  let wid = row?.word_id ? String(row.word_id) : null;
  if (!wid && lemma) {
    const ids = wordIdsByLemma.get(lemma) || [];
    if (ids.length === 1) wid = ids[0];
  }
  if (!wid) return lemma ? { item_type: "word", item_key: `word:lemma:${lemma}:*`, word_id: null, sense_index: null, resolved: false } : null;
  const senses = senseIndexes.get(wid) || [];
  if (senses.length <= 1) {
    const idx = senses.length === 1 ? senses[0] : 0; // no WordSense rows = the one meaning VocabularyWord defines
    return { item_type: "word", item_key: `word:${wid}:${idx}`, word_id: wid, sense_index: idx, resolved: true };
  }
  return { item_type: "word", item_key: `word:${wid}:*`, word_id: wid, sense_index: null, resolved: false };
}

export function grammarItemFor(row) {
  if (row?.game === "grammar_practice") {
    const topic = String(row.grammar_topic || "").trim();
    return topic ? { item_type: "grammar", item_key: `grammar:${topic}`, resolved: true } : null;
  }
  if (row?.game === "grammar") {
    const bank = String(row.bank || String(row.item_id || "").split(":")[0] || "").trim();
    return bank ? { item_type: "grammar", item_key: `grammar:hub.${bank}`, resolved: true } : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Evidence quality (A4). PLACEHOLDER weights, accepted by GPT + Tee (P3).
export const EVIDENCE_WEIGHTS = {
  attestation: { server_graded: 1.0, server_ai: 1.0, client_attested: 0.6 },
  attestationDefault: 0.6,
  mode: { produce: 1.0, construct: 0.8, recognise: 0.6 },
  modeDefault: 0.6,
  hint: 0.5,          // any hint used in the round
  context: { target: 1.0, incidental: 0.3 },
};
// Diminishing returns + cap (A4, GPT re-audit correction #4).
export const SAME_DAY_DECAY = 0.5;            // k-th same-day round counts x 0.5^(k-1)
export const CLIENT_DAILY_CAP = 1.0;          // client-attested weight per item per day

export function baseWeight({ attestation, mode, hints_used = 0, context = "target" }) {
  const W = EVIDENCE_WEIGHTS;
  const a = W.attestation[attestation] ?? W.attestationDefault;
  const md = W.mode[mode] ?? W.modeDefault;
  const h = hints_used > 0 ? W.hint : 1;
  const c = W.context[context] ?? W.context.target;
  return Number((a * md * h * c).toFixed(4));
}

const worstAttestation = (list) => {
  const order = ["client_attested", "server_ai", "server_graded"];
  let best = 2;
  for (const v of list) { const i = order.indexOf(v); best = Math.min(best, i < 0 ? 0 : i); }
  return order[best];
};
const modeOf = (list) => {
  // One activity has one canonical mode; if rows disagree, take the weakest claim.
  const order = ["recognise", "construct", "produce"];
  let lo = 2;
  for (const v of list) { const i = order.indexOf(v); lo = Math.min(lo, i < 0 ? 0 : i); }
  return list.length ? order[lo] : "recognise";
};

/**
 * Ledger rows (WordAttempt / GrammarAttempt, tagged with `ledger`) -> ItemEvidence
 * rows: ONE per item per round. `source` is game | grammar_practice here;
 * coach sessions are source "coach_session" and are produced by Stage 2.
 * Pure: resolver maps come in as arguments.
 */
export function evidenceFromLedgers(rows, maps = {}) {
  const groups = new Map();
  for (const r of rows || []) {
    if (r?.correct !== true && r?.correct !== false) continue;
    const item = r.ledger === "GrammarAttempt" ? grammarItemFor(r) : r.ledger === "WordAttempt" ? resolveWordItem(r, maps) : null;
    if (!item) continue;
    if (r.ledger === "WordAttempt" && String(r.word || "") === "(quiz item)") continue; // count-only quiz rows carry no item
    const round_id = String(r.round_id || r.id);
    const key = `${round_id}|${item.item_key}`;
    const g = groups.get(key) || { item, round_id, rows: [] };
    g.rows.push(r);
    groups.set(key, g);
  }
  const out = [];
  for (const g of groups.values()) {
    const rs = g.rows;
    const at = rs.map((r) => r.round_at || r.created_date).filter(Boolean).sort()[0] || null;
    const attestation = worstAttestation(rs.map((r) => r.verification || "client_attested"));
    const mode = modeOf(rs.map((r) => r.mode).filter(Boolean));
    const hints_used = rs.filter((r) => r.support === "hint").length;
    const source = rs[0].ledger === "GrammarAttempt" ? (rs[0].game === "grammar_practice" ? "grammar_practice" : "game") : "game";
    const correct = rs.filter((r) => r.correct === true).length;
    const ev = {
      item_type: g.item.item_type, item_key: g.item.item_key,
      word_id: g.item.word_id ?? undefined, sense_index: g.item.sense_index ?? undefined,
      round_id: g.round_id, source, context: "target", mode, attestation,
      items: rs.length, correct, hints_used, at,
    };
    ev.weight = baseWeight(ev);
    out.push(ev);
  }
  return out.sort((a, b) => String(a.at).localeCompare(String(b.at)) || a.item_key.localeCompare(b.item_key) || a.round_id.localeCompare(b.round_id));
}

// ---------------------------------------------------------------------------
// Learner state (facts). PLACEHOLDER thresholds (Tee P1/P2 labels locked:
// unknown -> New, weak -> Needs work, learning -> Practising, solid -> Strong).
export const STATE_RULES = {
  window: 10,          // most recent evidence rows that set weighted accuracy
  weakBelow: 0.6,
  solidFrom: 0.8,
  solidDays: 2,        // distinct days at >= solidFrom
  wrongStreakWeak: 2,  // consecutive rounds under 50%
  confidence: { medium: 1.5, high: 3.0 }, // cross-day weight thresholds
};
export const LABELS = { unknown: "New", weak: "Needs work", learning: "Practising", solid: "Strong" };

const round4 = (x) => Number(Number(x).toFixed(4));

/**
 * Apply diminishing returns + the client-attested daily cap, in time order.
 * Returns each evidence row with `w_eff` and `day`. Deterministic: input order
 * does not matter (sorted here by at, round_id).
 */
export function effectiveWeights(evidence) {
  const sorted = [...(evidence || [])].sort((a, b) => String(a.at).localeCompare(String(b.at)) || String(a.round_id).localeCompare(String(b.round_id)));
  const perDay = new Map(); // day -> { rounds, client }
  return sorted.map((e) => {
    const t = ms(e.at);
    const day = t == null ? "unknown" : dayOf(t);
    const d = perDay.get(day) || { rounds: 0, client: 0 };
    d.rounds += 1;
    let w = (Number(e.weight) || 0) * Math.pow(SAME_DAY_DECAY, d.rounds - 1);
    if (e.attestation === "client_attested") {
      const room = Math.max(0, CLIENT_DAILY_CAP - d.client);
      w = Math.min(w, room);
      d.client += w;
    }
    perDay.set(day, d);
    return { ...e, day, w_eff: round4(w) };
  });
}

/** Derive one item's learner state from its evidence (any order). */
export function deriveItemState(evidence) {
  const R = STATE_RULES;
  const ev = effectiveWeights(evidence);
  const base = { learning_state: "unknown", confidence: "low", weighted_accuracy: null, evidence_weight: 0, wrong_streak: 0, solid_days: 0, rounds: ev.length, last_evidence_at: null, engine_version: ENGINE_VERSION };
  if (!ev.length) return base;
  const acc = (e) => (e.items ? e.correct / e.items : 0);
  const total = ev.reduce((s, e) => s + e.w_eff, 0);
  const win = ev.slice(-R.window);
  const wsum = win.reduce((s, e) => s + e.w_eff, 0);
  const waccRaw = wsum > 0 ? win.reduce((s, e) => s + e.w_eff * acc(e), 0) / wsum : win.reduce((s, e) => s + acc(e), 0) / win.length;
  let wrong_streak = 0;
  for (let i = ev.length - 1; i >= 0 && acc(ev[i]) < 0.5; i--) wrong_streak++;
  const byDay = new Map();
  for (const e of ev) { const d = byDay.get(e.day) || { w: 0, wc: 0, n: 0, c: 0 }; d.w += e.w_eff; d.wc += e.w_eff * acc(e); d.n += e.items; d.c += e.correct; byDay.set(e.day, d); }
  let solid_days = 0, crossDay = 0;
  for (const d of byDay.values()) {
    const a = d.w > 0 ? d.wc / d.w : (d.n ? d.c / d.n : 0);
    if (a >= R.solidFrom && d.w > 0) solid_days++;
    crossDay += Math.min(d.w, 1);
  }
  const wacc = round4(waccRaw);
  let learning_state = "learning";
  if (wrong_streak >= R.wrongStreakWeak || wacc < R.weakBelow) learning_state = "weak";
  else if (wacc >= R.solidFrom && solid_days >= R.solidDays) learning_state = "solid";
  const confidence = crossDay >= R.confidence.high ? "high" : crossDay >= R.confidence.medium ? "medium" : "low";
  return {
    ...base, learning_state, confidence, weighted_accuracy: wacc, evidence_weight: round4(total),
    wrong_streak, solid_days, last_evidence_at: ev[ev.length - 1].at,
  };
}

/** All items for one learner: Map(item_key -> evidence[]) -> LearnerItem facts. */
export function deriveLearnerItems(evidence) {
  const byKey = new Map();
  for (const e of evidence || []) {
    const list = byKey.get(e.item_key) || [];
    list.push(e);
    byKey.set(e.item_key, list);
  }
  const out = [];
  for (const [item_key, list] of [...byKey.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const first = list[0];
    out.push({
      item_type: first.item_type, item_key,
      word_id: first.word_id ?? undefined, sense_index: first.sense_index ?? undefined,
      resolved: isResolved(item_key),
      ...deriveItemState(list),
    });
  }
  return out;
}

/** Stable string for comparing a stored LearnerItem with a fresh derivation. */
export const LEARNER_ITEM_COMPARABLE = ["item_type", "item_key", "learning_state", "confidence", "weighted_accuracy", "evidence_weight", "wrong_streak", "solid_days", "rounds", "last_evidence_at", "engine_version"];
export const canonicalItem = (r) => JSON.stringify(LEARNER_ITEM_COMPARABLE.map((k) => r?.[k] ?? null));
