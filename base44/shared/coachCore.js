// VIRORA Coach Engine — PURE facts layer (VT-40). Stage 1 + Stage 2 corrections, 2026-10-08.
// Spec: Claude Doc "Coach Engine v0 — Spec (Stage 0, rev 3)" + GPT Stage-1 audit;
// project docs claude/vira/VIRA-V0-SPEC.md, claude/vira/STAGE-1-HANDOFF.md.
// No SDK, no I/O, no clock reads: the same inputs always give the same outputs.
//
// Layer rules (locked):
//   * FACTS only (evidence -> learner state, FSRS memory). Never reads a policy or a
//     persona: the same evidence gives the same LearnerItem under every coach.
//   * Unresolved evidence (word:<id>:*, word:lemma:<l>:*) is EVIDENCE-ONLY: it is kept
//     in ItemEvidence but never becomes a LearnerItem, a state, or an FSRS card.
//   * FSRS answers WHEN only. Only coach-session evidence for an item the server
//     planned (context "target") moves FSRS, at most once per item per Tashkent day.
//     Normal games / grammar practice update state only.
//   * Everything on a LearnerItem is DERIVED from that item's ItemEvidence (FSRS by
//     deterministic replay), so retries, races and rebuilds converge on one answer.
//   * The FSRS library is injected (`fsrsLib`), so this file runs unchanged in Node
//     tests (npm "ts-fsrs") and in Deno functions ("npm:ts-fsrs@5.4.2").
// Numbers marked PLACEHOLDER are starting values for testing, not tuning.

import { enrichmentFor } from "./skillActivityMap.js";

export const ENGINE_VERSION = "coach-core@2";

// ---------------------------------------------------------------------------
// Days: a coach day is the calendar day in Asia/Tashkent (UTC+5, no DST).
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const dayOf = (ms) => new Date(Number(ms) + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
const msOf = (iso) => { const t = Date.parse(iso || ""); return Number.isNaN(t) ? null : t; };
const round4 = (x) => Number(Number(x).toFixed(4));

// ---------------------------------------------------------------------------
// Item keys (sense-aware).
//   word:<word_id>:<sense_index>   one meaning (resolved)
//   word:<word_id>:*               meaning unknown for a multi-sense word   (evidence-only)
//   word:lemma:<lemma>:*           no word_id resolvable                    (evidence-only)
//   grammar:<topic-slug>           grammar practice topic
//   grammar:hub.<bank>             legacy Skill Hub grammar quiz bank (never on a goal path)
//   skill:<leaf>                   reserved
export const ITEM_TYPES = ["word", "grammar", "skill"];
export const isResolved = (key) => !String(key || "").endsWith(":*");
export const normalizeLemma = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, " ");

/** Identity contract: sense_id -> word_id -> lemma. A sense is NEVER guessed. */
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
// Evidence quality. Order of application (locked):
//   1. base weight = attestation x mode x hint x context      (all multipliers)
//   2. same-day decay: the k-th round on an item that day x 0.5^(k-1)
//   3. client-attested daily cap: client contribution per item per day <= 1.0
export const EVIDENCE_WEIGHTS = {
  attestation: { server_graded: 1.0, server_ai: 1.0, client_attested: 0.6 },
  attestationDefault: 0.6,
  mode: { produce: 1.0, construct: 0.8, recognise: 0.6 },
  modeDefault: 0.6,
  hint: 0.5,
  context: { target: 1.0, incidental: 0.3 },
};
export const SAME_DAY_DECAY = 0.5;
export const CLIENT_DAILY_CAP = 1.0;

export function baseWeight({ attestation, mode, hints_used = 0, context = "target" }) {
  const W = EVIDENCE_WEIGHTS;
  const a = W.attestation[attestation] ?? W.attestationDefault;
  const md = W.mode[mode] ?? W.modeDefault;
  const h = hints_used > 0 ? W.hint : 1;
  const c = W.context[context] ?? W.context.target;
  return round4(a * md * h * c);
}

const worstAttestation = (list) => {
  const order = ["client_attested", "server_ai", "server_graded"];
  let best = 2;
  for (const v of list) { const i = order.indexOf(v); best = Math.min(best, i < 0 ? 0 : i); }
  return order[best];
};
const weakestMode = (list) => {
  const order = ["recognise", "construct", "produce"];
  let lo = 2;
  for (const v of list) { const i = order.indexOf(v); lo = Math.min(lo, i < 0 ? 0 : i); }
  return list.length ? order[lo] : "recognise";
};

/**
 * Ledger rows (WordAttempt / GrammarAttempt, tagged `ledger`) -> ItemEvidence rows,
 * ONE per item per round. `coach` (optional) = { session_key, plannedKeys: Set } —
 * built by the SERVER from its own PlanLog, never from the client: only an item the
 * server planned for that session becomes source "coach_session" / context "target".
 */
export function evidenceFromLedgers(rows, maps = {}, coach = null) {
  const groups = new Map();
  for (const r of rows || []) {
    if (r?.correct !== true && r?.correct !== false) continue;
    if (r.ledger === "WordAttempt" && String(r.word || "") === "(quiz item)") continue; // count-only quiz: no item identity
    const item = r.ledger === "GrammarAttempt" ? grammarItemFor(r) : r.ledger === "WordAttempt" ? resolveWordItem(r, maps) : null;
    if (!item) continue;
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
    // Rows written before 2026-09-30 carry no `mode`: re-derive it from the activity map.
    const mode = weakestMode(rs.map((r) => r.mode || enrichmentFor({ game: r.game, bank: r.bank, item_id: r.item_id }).mode).filter(Boolean));
    const hints_used = rs.filter((r) => r.support === "hint").length;
    const planned = !!coach && g.item.resolved && coach.plannedKeys?.has(g.item.item_key);
    const source = planned ? "coach_session" : rs[0].ledger === "GrammarAttempt" && rs[0].game === "grammar_practice" ? "grammar_practice" : "game";
    const ev = {
      item_type: g.item.item_type, item_key: g.item.item_key,
      word_id: g.item.word_id ?? undefined, sense_index: g.item.sense_index ?? undefined,
      round_id: g.round_id, session_key: planned ? coach.session_key : undefined,
      source, context: "target", mode, attestation,
      items: rs.length, correct: rs.filter((r) => r.correct === true).length, hints_used, at,
    };
    ev.weight = baseWeight(ev);
    out.push(ev);
  }
  return out.sort(byTime);
}
const byTime = (a, b) => String(a.at).localeCompare(String(b.at)) || String(a.round_id).localeCompare(String(b.round_id)) || String(a.item_key).localeCompare(String(b.item_key));

// ---------------------------------------------------------------------------
// Learner state. PLACEHOLDER thresholds. Labels (P2, locked):
export const LABELS = { unknown: "New", weak: "Needs work", learning: "Practising", solid: "Strong" };
export const STATE_RULES = {
  window: 10,          // most recent evidence rows that set weighted accuracy
  weakBelow: 0.6,
  solidFrom: 0.8,
  solidDays: 2,        // distinct days at >= solidFrom
  wrongStreakWeak: 2,  // consecutive rounds under 50%
  confidence: { medium: 1.5, high: 3.0 }, // cross-day weight thresholds
};

/** Steps 2 + 3 of evidence weighting, in time order. Input order never matters. */
export function effectiveWeights(evidence) {
  const sorted = [...(evidence || [])].sort(byTime);
  const perDay = new Map(); // day -> { rounds, client }
  return sorted.map((e) => {
    const t = msOf(e.at);
    const day = t == null ? "unknown" : dayOf(t);
    const d = perDay.get(day) || { rounds: 0, client: 0 };
    d.rounds += 1;
    let w = (Number(e.weight) || 0) * Math.pow(SAME_DAY_DECAY, d.rounds - 1);
    if (e.attestation === "client_attested") {
      w = Math.min(w, Math.max(0, CLIENT_DAILY_CAP - d.client));
      d.client += w;
    }
    perDay.set(day, d);
    return { ...e, day, w_eff: round4(w) };
  });
}

const accOf = (e) => (e.items ? e.correct / e.items : 0);

export function deriveItemState(evidence) {
  const R = STATE_RULES;
  const ev = effectiveWeights(evidence);
  const base = { learning_state: "unknown", confidence: "low", weighted_accuracy: null, evidence_weight: 0, wrong_streak: 0, solid_days: 0, rounds: ev.length, last_evidence_at: null };
  if (!ev.length) return base;
  const total = ev.reduce((s, e) => s + e.w_eff, 0);
  const win = ev.slice(-R.window);
  const wsum = win.reduce((s, e) => s + e.w_eff, 0);
  const waccRaw = wsum > 0 ? win.reduce((s, e) => s + e.w_eff * accOf(e), 0) / wsum : win.reduce((s, e) => s + accOf(e), 0) / win.length;
  let wrong_streak = 0;
  for (let i = ev.length - 1; i >= 0 && accOf(ev[i]) < 0.5; i--) wrong_streak++;
  const byDay = new Map();
  for (const e of ev) { const d = byDay.get(e.day) || { w: 0, wc: 0 }; d.w += e.w_eff; d.wc += e.w_eff * accOf(e); byDay.set(e.day, d); }
  let solid_days = 0, crossDay = 0;
  for (const d of byDay.values()) {
    if (d.w > 0 && d.wc / d.w >= R.solidFrom) solid_days++;
    crossDay += Math.min(d.w, 1);
  }
  const wacc = round4(waccRaw);
  let learning_state = "learning";
  if (wrong_streak >= R.wrongStreakWeak || wacc < R.weakBelow) learning_state = "weak";
  else if (wacc >= R.solidFrom && solid_days >= R.solidDays) learning_state = "solid";
  const confidence = crossDay >= R.confidence.high ? "high" : crossDay >= R.confidence.medium ? "medium" : "low";
  return { ...base, learning_state, confidence, weighted_accuracy: wacc, evidence_weight: round4(total), wrong_streak, solid_days, last_evidence_at: ev[ev.length - 1].at };
}

// ---------------------------------------------------------------------------
// FSRS (WHEN only). Rating from the session score (locked):
//   < 50% Again · 50-79% Hard · 80-99%, or 100% with a hint, Good · 100% no hint Easy
export function ratingFor(e) {
  const s = accOf(e);
  if (s < 0.5) return "again";
  if (s < 0.8) return "hard";
  if (s < 1 || e.hints_used > 0) return "good";
  return "easy";
}
export const isFsrsEligible = (e) => e.source === "coach_session" && e.context === "target" && isResolved(e.item_key);
const FSRS_STATE = ["new", "learning", "review", "relearning"];
const RATING_NUM = { again: 1, hard: 2, good: 3, easy: 4 };
export const FSRS_PARAMS = { enable_fuzz: false, enable_short_term: false }; // deterministic, day-level steps

/**
 * Replay one item's FSRS history from its evidence: the FIRST eligible coach-session
 * evidence of each Tashkent day is a review; any later one that day is ignored. Pure
 * and deterministic, so a retried or concurrent submission can never double-move it.
 */
export function replayFsrs(evidence, fsrsLib) {
  const reviews = [];
  const seenDays = new Set();
  for (const e of [...(evidence || [])].filter(isFsrsEligible).sort(byTime)) {
    const t = msOf(e.at);
    if (t == null) continue;
    const day = dayOf(t);
    if (seenDays.has(day)) continue;
    seenDays.add(day);
    reviews.push({ e, t, day, rating: ratingFor(e) });
  }
  if (!reviews.length || !fsrsLib) return { card: null, transitions: [] };
  const f = fsrsLib.fsrs(fsrsLib.generatorParameters(FSRS_PARAMS));
  let card = fsrsLib.createEmptyCard(new Date(reviews[0].t));
  const transitions = [];
  for (const r of reviews) {
    const before = card;
    card = f.next(card, new Date(r.t), RATING_NUM[r.rating]).card;
    transitions.push({ round_id: r.e.round_id, day: r.day, rating: r.rating, due_before: before.reps ? new Date(before.due).toISOString() : null, stability_before: round4(before.stability || 0), stability_after: round4(card.stability) });
  }
  return {
    card: {
      due: new Date(card.due).toISOString(), stability: round4(card.stability), difficulty: round4(card.difficulty),
      elapsed_days: card.elapsed_days, scheduled_days: card.scheduled_days, reps: card.reps, lapses: card.lapses,
      fsrs_state: FSRS_STATE[card.state] || "review", last_review: card.last_review ? new Date(card.last_review).toISOString() : null,
      fsrs_last_day: reviews[reviews.length - 1].day,
    },
    transitions,
  };
}

// ---------------------------------------------------------------------------
/** Derive one item's full LearnerItem facts (state + FSRS) from its evidence. */
export function deriveItem(evidence, fsrsLib) {
  const first = evidence[0];
  const { card } = replayFsrs(evidence, fsrsLib);
  return {
    item_type: first.item_type, item_key: first.item_key,
    word_id: first.word_id ?? undefined, sense_index: first.sense_index ?? undefined,
    resolved: true,
    ...deriveItemState(evidence),
    ...(card || {}),
    engine_version: ENGINE_VERSION,
  };
}

/** All RESOLVED items for one learner. Unresolved evidence stays evidence-only. */
export function deriveLearnerItems(evidence, fsrsLib = null) {
  const byKey = new Map();
  for (const e of evidence || []) {
    if (!isResolved(e.item_key)) continue;
    const list = byKey.get(e.item_key) || [];
    list.push(e);
    byKey.set(e.item_key, list);
  }
  return [...byKey.keys()].sort().map((k) => deriveItem(byKey.get(k), fsrsLib));
}

/** Stable comparison between a stored LearnerItem and a fresh derivation. */
export const LEARNER_ITEM_COMPARABLE = ["item_type", "item_key", "learning_state", "confidence", "weighted_accuracy", "evidence_weight", "wrong_streak", "solid_days", "rounds", "last_evidence_at", "due", "stability", "reps", "lapses", "fsrs_state", "fsrs_last_day", "engine_version"];
export const canonicalItem = (r) => JSON.stringify(LEARNER_ITEM_COMPARABLE.map((k) => r?.[k] ?? null));

/** FNV-1a 32-bit, hex. Plan hashes and stable per-learner orderings. */
export function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
