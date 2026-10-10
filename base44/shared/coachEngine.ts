// VIRORA Coach Engine — DB side (VT-40, Stage 1 + 2, 2026-10-08).
// All rules live in pure files: coachCore.js (facts), coachPlan.js (decisions),
// coachPolicies.js (policy / persona / entitlement), coachGraph.js (goals as data).
// This file only reads and writes:
//   reads   WordAttempt, GrammarAttempt (immutable game ledgers), WordSense, VocabularyWord, User
//   writes  ItemEvidence (append-only), LearnerItem (derived), PlanLog (snapshots), CoachProfile
// It never touches SkillState, LeafState, RoundReceipt or any game ledger.
//
// The FSRS library is INJECTED (deps.fsrsLib): Deno passes `npm:ts-fsrs@5.4.2`, Node
// tests pass the npm package. Idempotency comes from two rules:
//   * ItemEvidence is unique per (user, round_id, item_key): retries insert nothing.
//   * LearnerItem is always RE-DERIVED from all of an item's evidence (FSRS by replay),
//     so a retried or concurrent request converges on the same row.
import {
  evidenceFromLedgers, deriveLearnerItems, deriveItem, canonicalItem, normalizeLemma,
  isResolved, dayOf, fnv1a, LABELS, ENGINE_VERSION,
} from './coachCore.js';
import { planToday, PLAN_VERSION } from './coachPlan.js';
import { resolveCoach, needsHandoff, minutesFor, POLICIES } from './coachPolicies.js';
import { GOALS, DEFAULT_GOAL, goalOf, LIVE_GRAMMAR_TOPICS, onPath, GRAPH_VERSION } from './coachGraph.js';

// Authoritative build stamp for PlanLog/explain: always generated from the modules' own version constants.
export const ENGINE_STAMP = [PLAN_VERSION, ENGINE_VERSION, GRAPH_VERSION].join('+');
import { pageAll } from './progressEngine.ts';

type Deps = { fsrsLib: any };
const chunk = <T>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

const ITEM_FIELDS = ['item_type', 'item_key', 'word_id', 'sense_index', 'resolved', 'learning_state', 'confidence', 'weighted_accuracy', 'evidence_weight', 'wrong_streak', 'solid_days', 'rounds', 'last_evidence_at', 'due', 'stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'reps', 'lapses', 'fsrs_state', 'last_review', 'fsrs_last_day', 'engine_version'];
const EVIDENCE_FIELDS = ['item_type', 'item_key', 'word_id', 'sense_index', 'round_id', 'session_key', 'source', 'context', 'mode', 'attestation', 'items', 'correct', 'hints_used', 'weight', 'duration_ms', 'at'];
const pick = (o: any, keys: string[]) => Object.fromEntries(keys.filter((k) => o[k] !== undefined && o[k] !== null).map((k) => [k, o[k]]));
// A field present in the stored row but absent from a fresh derivation must be cleared.
const itemRow = (email: string, it: any) => ({ user_email: email, ...Object.fromEntries(ITEM_FIELDS.map((k) => [k, it[k] ?? null])) });

// ---------------------------------------------------------------------------
// Ledgers + identity
export async function loadLedgers(svc: any, email: string) {
  const [words, grammar] = await Promise.all([
    pageAll(svc.WordAttempt, { user_email: email }),
    pageAll(svc.GrammarAttempt, { user_email: email }),
  ]);
  return [...words.map((r: any) => ({ ...r, ledger: 'WordAttempt' })), ...grammar.map((r: any) => ({ ...r, ledger: 'GrammarAttempt' }))];
}

/** Resolver maps for the identity contract (sense_id -> word_id -> lemma). */
export async function resolverMaps(svc: any, rows: any[]) {
  const wordRows = rows.filter((r) => r.ledger === 'WordAttempt');
  const lemmaOnly = [...new Set(wordRows.filter((r) => !r.word_id && r.word && r.word !== '(quiz item)').map((r) => String(r.word)))];
  const wordIdsByLemma = new Map<string, string[]>();
  for (const part of chunk(lemmaOnly, 100)) {
    const variants = [...new Set(part.flatMap((w) => [w, w.toLowerCase(), normalizeLemma(w)]))];
    const found = (await svc.VocabularyWord.filter({ english: { $in: variants } }, 'id', 500)) || [];
    for (const v of found) {
      const k = normalizeLemma(v.english);
      wordIdsByLemma.set(k, [...new Set([...(wordIdsByLemma.get(k) || []), v.id])]);
    }
  }
  const ids = [...new Set([...wordRows.map((r) => r.word_id).filter(Boolean), ...[...wordIdsByLemma.values()].flat()])];
  const senseIndexes = new Map<string, number[]>();
  for (const part of chunk(ids, 100)) {
    const senses = (await svc.WordSense.filter({ word_id: { $in: part }, approved: true }, 'sense_index', 500)) || [];
    for (const s of senses) senseIndexes.set(s.word_id, [...new Set([...(senseIndexes.get(s.word_id) || []), Number(s.sense_index)])].sort((a, b) => a - b));
  }
  return { senseIndexes, wordIdsByLemma };
}

// ---------------------------------------------------------------------------
// LearnerItem maintenance (always re-derived from evidence).
export async function recomputeItems(svc: any, email: string, keys: string[], deps: Deps) {
  const resolved = [...new Set(keys)].filter(isResolved);
  let written = 0, merged = 0;
  for (const part of chunk(resolved, 50)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const ev = (await pageAll(svc.ItemEvidence, { user_email: email, item_key: { $in: part } })) || [];
      const byKey = new Map<string, any[]>();
      for (const e of ev) byKey.set(e.item_key, [...(byKey.get(e.item_key) || []), e]);
      const stored = (await pageAll(svc.LearnerItem, { user_email: email, item_key: { $in: part } })) || [];
      const rowsByKey = new Map<string, any[]>();
      for (const r of stored) rowsByKey.set(r.item_key, [...(rowsByKey.get(r.item_key) || []), r]);
      for (const key of part) {
        const list = byKey.get(key);
        if (!list?.length) continue;
        const row = itemRow(email, deriveItem(list, deps.fsrsLib));
        const rows = (rowsByKey.get(key) || []).sort((a: any, b: any) => String(a.created_date).localeCompare(String(b.created_date)));
        if (rows[0]) { if (canonicalItem(rows[0]) !== canonicalItem(row)) await svc.LearnerItem.update(rows[0].id, row); }
        else await svc.LearnerItem.create(row);
        for (const dup of rows.slice(1)) { await svc.LearnerItem.delete(dup.id); merged++; }
        written++;
      }
      // Race guard: if evidence arrived while we derived, derive once more.
      const again = (await pageAll(svc.ItemEvidence, { user_email: email, item_key: { $in: part } })) || [];
      if (again.length === ev.length) break;
    }
  }
  return { written, merged };
}

/** Insert evidence rows that don't exist yet (unique per round_id + item_key). */
async function appendEvidence(svc: any, email: string, evidence: any[]) {
  if (!evidence.length) return [];
  const rounds = [...new Set(evidence.map((e) => e.round_id))];
  const have = new Set<string>();
  for (const part of chunk(rounds, 100)) {
    const ex = (await pageAll(svc.ItemEvidence, { user_email: email, round_id: { $in: part } })) || [];
    ex.forEach((e: any) => have.add(`${e.round_id}|${e.item_key}`));
  }
  const fresh = evidence.filter((e) => !have.has(`${e.round_id}|${e.item_key}`)).map((e) => ({ user_email: email, ...pick(e, EVIDENCE_FIELDS) }));
  for (const part of chunk(fresh, 200)) await svc.ItemEvidence.bulkCreate(part);
  return fresh;
}

/** Server-side coach context for a submission: only items this learner's own PlanLog planned. */
async function coachContext(svc: any, email: string, sessionKey: unknown, day: string | null) {
  const key = String(sessionKey || '').slice(0, 80);
  if (!key) return null;
  // A session only grants Coach credit on its own (Tashkent) day: a stale or
  // replayed key from another day is ordinary evidence, never coach_session.
  if (!day || !key.startsWith(`${day}:`)) return null;
  const snaps = (await pageAll(svc.PlanLog, { user_email: email, session_key: key })) || [];
  if (!snaps.length) return null;
  const plannedKeys = new Set<string>();
  for (const s of snaps) for (const q of s.queue || []) if (q?.item_key) plannedKeys.add(q.item_key);
  return { session_key: key, plannedKeys };
}

/**
 * THE evidence entry point for the coach (called at the end of progressApi.submitEvidence,
 * inside try/catch). There is no second pipeline: coach sessions submit through
 * submitEvidence like every game, with body.coach = { session_key }.
 */
export async function applyRound(svc: any, email: string, { rows, coach }: { rows: any[]; coach?: any }, deps: Deps) {
  const at = rows.map((r: any) => Date.parse(r?.round_at || r?.created_date || '')).find((t: number) => !Number.isNaN(t));
  const ctx = coach ? await coachContext(svc, email, coach.session_key, at === undefined ? null : dayOf(at)) : null;
  const maps = await resolverMaps(svc, rows);
  const ev = evidenceFromLedgers(rows, maps, ctx);
  const fresh = await appendEvidence(svc, email, ev);
  const touched = [...new Set(fresh.map((e: any) => e.item_key))];
  const r = await recomputeItems(svc, email, touched, deps);
  return { evidenceAdded: fresh.length, coachItems: fresh.filter((e: any) => e.source === 'coach_session').length, ...r };
}

// ---------------------------------------------------------------------------
// Backfill / verify (admin) — Stage 1, now resolved-items-only.
export async function deriveForLearner(svc: any, email: string, deps: Deps) {
  const rows = await loadLedgers(svc, email);
  const maps = await resolverMaps(svc, rows);
  const evidence = evidenceFromLedgers(rows, maps, null);
  return { evidence, items: deriveLearnerItems(evidence, deps.fsrsLib), ledgerRows: rows.length };
}

export async function backfillLearner(svc: any, email: string, { dryRun = false } = {}, deps: Deps) {
  const { evidence, ledgerRows } = await deriveForLearner(svc, email, deps);
  if (dryRun) {
    const items = deriveLearnerItems(evidence, deps.fsrsLib);
    return { ...summarise(email, ledgerRows, evidence, items), dryRun: true };
  }
  const fresh = await appendEvidence(svc, email, evidence);
  const all = (await pageAll(svc.ItemEvidence, { user_email: email })) || [];
  const keys = [...new Set(all.map((e: any) => e.item_key))] as string[];
  const r = await recomputeItems(svc, email, keys, deps);
  const items = deriveLearnerItems(all, deps.fsrsLib);
  return { ...summarise(email, ledgerRows, all, items), dryRun: false, evidenceAdded: fresh.length, ...r };
}

function summarise(email: string, ledgerRows: number, evidence: any[], items: any[]) {
  const count = (f: (i: any) => boolean) => items.filter(f).length;
  const unresolvedEvidence = evidence.filter((e) => !isResolved(e.item_key)).length;
  return {
    email, ledgerRows, evidenceRows: evidence.length, unresolvedEvidence,
    items: items.length, words: count((i) => i.item_type === 'word'), grammar: count((i) => i.item_type === 'grammar'),
    states: { weak: count((i) => i.learning_state === 'weak'), learning: count((i) => i.learning_state === 'learning'), solid: count((i) => i.learning_state === 'solid') },
  };
}

export async function verifyLearner(svc: any, email: string, deps: Deps) {
  const ev = (await pageAll(svc.ItemEvidence, { user_email: email })) || [];
  const a = deriveLearnerItems(ev, deps.fsrsLib), b = deriveLearnerItems([...ev].reverse(), deps.fsrsLib);
  const deterministic = a.length === b.length && a.every((x, i) => canonicalItem(x) === canonicalItem(b[i]));
  const stored = (await pageAll(svc.LearnerItem, { user_email: email })) || [];
  const byKey = new Map(stored.map((r: any) => [r.item_key, r]));
  const mismatches: any[] = [];
  for (const it of a) {
    const s = byKey.get(it.item_key);
    if (!s) mismatches.push({ item_key: it.item_key, missing: true });
    else if (canonicalItem(s) !== canonicalItem(it)) mismatches.push({ item_key: it.item_key, stored: canonicalItem(s), derived: canonicalItem(it) });
    byKey.delete(it.item_key);
  }
  for (const k of byKey.keys()) mismatches.push({ item_key: k, stale: true });
  const duplicates = stored.length - new Set(stored.map((r: any) => r.item_key)).size;
  const unresolvedItems = stored.filter((r: any) => !isResolved(r.item_key)).length;
  return { email, deterministic, items: a.length, duplicates, unresolvedItems, mismatches };
}

// ---------------------------------------------------------------------------
// Planning inputs
const LEVEL_MAP: Record<string, string> = { Starter: 'A1', A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2', C1: 'C1' };

/** Unseen items with playable content: live grammar topics + corpus words at the learner's level. */
export async function newCandidatesFor(svc: any, email: string, level: string, known: Set<string>) {
  const out: any[] = LIVE_GRAMMAR_TOPICS.map((t) => ({ item_type: 'grammar', item_key: `grammar:${t}` })).filter((c) => !known.has(c.item_key));
  const cefr = LEVEL_MAP[level] || 'A2';
  const words = (await svc.VocabularyWord.filter({ cefr }, 'id', 400)) || [];
  const fresh = words
    .map((w: any) => ({ item_type: 'word', item_key: `word:${w.id}:0`, word_id: w.id, order: fnv1a(`${email}|${w.id}`) }))
    .filter((c: any) => !known.has(c.item_key) && ![...known].some((k) => k.startsWith(`word:${c.word_id}:`)))
    .sort((a: any, b: any) => a.order.localeCompare(b.order))
    .slice(0, 30)
    .map(({ order, ...c }: any) => c);
  return [...out, ...fresh];
}

const hasContentFn = (key: string) => key.startsWith('word:') ? isResolved(key) : key.startsWith('grammar:') ? LIVE_GRAMMAR_TOPICS.includes(key.slice(8)) : false;

/**
 * Content gate for planning (Stage 3 final correction, 2026-10-10): a word is
 * plannable only if its VocabularyWord row still EXISTS and has an English
 * headword and an Uzbek translation (what the session runner needs to ask a
 * question). Grammar: live topics only (all have practice banks; tested).
 * Read-only. Never marks anything learned or completed: unplayable content is
 * simply not planned, so it can't trap a learner in a session.
 */
export async function contentGate(svc: any, candidates: any[]) {
  const ids = [...new Set((candidates || [])
    .filter((c: any) => String(c?.item_key || '').startsWith('word:') && isResolved(c.item_key))
    .map((c: any) => String(c.word_id || String(c.item_key).split(':')[1] || ''))
    .filter(Boolean))];
  const playable = new Set<string>();
  for (const part of chunk(ids, 100)) {
    const rows = (await svc.VocabularyWord.filter({ id: { $in: part } }, 'id', part.length)) || [];
    for (const w of rows) if (String(w?.english || '').trim() && String(w?.uzbek || '').trim()) playable.add(String(w.id));
  }
  return (key: string) => key.startsWith('word:') ? hasContentFn(key) && playable.has(String(key).split(':')[1]) : hasContentFn(key);
}

async function doneTodayFor(svc: any, email: string, today: string) {
  const rows = (await svc.ItemEvidence.filter({ user_email: email, source: 'coach_session' }, '-at', 300)) || [];
  return new Set<string>(rows.filter((e: any) => e.at && dayOf(Date.parse(e.at)) === today).map((e: any) => e.item_key));
}

// ---------------------------------------------------------------------------
// Profile
export async function profileFor(svc: any, email: string, resolved: any) {
  const rows = (await svc.CoachProfile.filter({ user_email: email }, 'created_date', 5)) || [];
  let p = rows[0];
  for (const dup of rows.slice(1)) await svc.CoachProfile.delete(dup.id);
  if (!p) {
    p = await svc.CoachProfile.create({
      user_email: email, goal_ids: [DEFAULT_GOAL], daily_minutes: resolved.policy.limits.minutesOptions[0],
      last_entitlement: resolved.entitlement, last_coach: resolved.coach, last_policy_version: resolved.policy.version, nudge_hour: 19,
    });
  }
  return p;
}

// ---------------------------------------------------------------------------
// Plan snapshots (PlanLog). One row per CHANGE: identical plans write nothing.
async function snapshot(svc: any, email: string, s: any) {
  const prev = ((await svc.PlanLog.filter({ user_email: email, session_key: s.session_key }, '-generated_at', 1)) || [])[0];
  if (prev && prev.plan_hash === s.plan_hash) return { snapshot: prev, created: false };
  const trigger = !prev ? (s.kind === 'continuation' ? 'continuation_initial' : 'daily_initial')
    : prev.policy !== s.policy ? 'policy_changed' : prev.goal_id !== s.goal_id ? 'goal_changed' : prev.minutes !== s.minutes ? 'time_changed' : 'evidence_changed';
  const row = await svc.PlanLog.create({ user_email: email, ...s, trigger });
  // Concurrent identical requests: keep the oldest snapshot with this hash, drop the rest.
  const same = ((await svc.PlanLog.filter({ user_email: email, session_key: s.session_key, plan_hash: s.plan_hash }, 'created_date', 10)) || []);
  if (prev) { /* a change row may legitimately repeat an older hash after A->B->A */ }
  const sameAfterPrev = same.filter((r: any) => !prev || String(r.created_date) > String(prev.created_date));
  for (const dup of sameAfterPrev.slice(1)) await svc.PlanLog.delete(dup.id);
  return { snapshot: sameAfterPrev[0] || row, created: true };
}

/**
 * Today's Practice (session_no 0) or a continuation (session_no >= 1).
 * Read path: never writes learner facts except a lazy first-time backfill.
 */
export async function getToday(svc: any, me: any, sub: any, body: any, deps: Deps, now = Date.now()) {
  const resolved = resolveCoach(sub, now);
  const profile = await profileFor(svc, me.email, resolved);
  const handoff = needsHandoff(profile.last_entitlement, resolved.entitlement) ? { from: profile.last_entitlement, to: resolved.entitlement } : null;
  const goal = goalOf(profile.goal_ids?.[0]);
  const minutes = minutesFor(resolved.policy, profile.daily_minutes);
  const today = dayOf(now);

  let items = (await pageAll(svc.LearnerItem, { user_email: me.email })) || [];
  if (!items.length) {
    const any = (await svc.ItemEvidence.filter({ user_email: me.email }, 'created_date', 1)) || [];
    if (!any.length) { await backfillLearner(svc, me.email, {}, deps); items = (await pageAll(svc.LearnerItem, { user_email: me.email })) || []; }
  }
  items = items.filter((i: any) => isResolved(i.item_key));
  const known = new Set<string>(items.map((i: any) => i.item_key));
  const user = (await svc.User.filter({ email: me.email }, 'created_date', 1))?.[0] || me;
  const newCandidates = await newCandidatesFor(svc, me.email, user?.cefr_level || 'A2', known);
  const doneToday = await doneTodayFor(svc, me.email, today);

  // No session_no -> the server picks the ACTIVE session: today's latest
  // continuation if one was started, otherwise Today's Practice.
  const latestNo = await latestContinuationNo(svc, me.email, today);
  const sessionNo = body?.session_no === undefined || body?.session_no === null
    ? latestNo
    : Math.max(0, Number(body.session_no) || 0);
  const kind = sessionNo > 0 ? 'continuation' : 'today';
  const session_key = `${today}:${kind}:${sessionNo}`;
  if (kind === 'continuation') {
    const exists = ((await svc.PlanLog.filter({ user_email: me.email, session_key }, 'created_date', 1)) || []).length > 0;
    if (!exists) throw Object.assign(new Error('no_such_session'), { code: 'no_such_session', status: 404 });
  }
  // The session's budget is a prescription that gets USED UP: minutes already
  // practised in THIS session come off it (planner invariant per session), so
  // re-opening Today's Practice never mints a fresh full plan.
  const hasContent = await contentGate(svc, [...items, ...newCandidates]);
  const planCtx = { items, newCandidates, goal, policy: resolved.policy, minutes, now, doneToday, hasContent };
  const { spent, remaining, plan, complete, frozen } = await sessionState(svc, me.email, session_key, kind, planCtx);
  // "Keep going" needs the LATEST session of the day (Today's Practice, or the
  // last continuation) to be complete (Tee, 2026-10-09), plus room under the
  // policy's continuationSessionsPerDay. Evaluated here, never in the client.
  const latestComplete = sessionNo === latestNo ? complete
    : (await sessionState(svc, me.email, latestNo > 0 ? `${today}:continuation:${latestNo}` : `${today}:today:0`, latestNo > 0 ? 'continuation' : 'today', planCtx)).complete;
  const { snapshot: snap } = await snapshot(svc, me.email, {
    day: today, kind, session_no: sessionNo, session_key, goal_id: goal.id, plan_hash: plan.plan_hash,
    generated_at: new Date(now).toISOString(), entitlement: resolved.entitlement, policy: resolved.policy.version,
    engine: ENGINE_STAMP, minutes, queue: plan.explanation,
  });
  const continuationsUsed = await continuationsToday(svc, me.email, today);
  return {
    coach: { entitlement: resolved.entitlement, coach: resolved.coach, persona: resolved.persona.id, conversionPersona: resolved.conversionPersona?.id || null, policy: resolved.policy.version, capabilities: resolved.policy.capabilities },
    handoff,
    settings: { goal_id: goal.id, minutes, minutesOptions: resolved.policy.limits.minutesOptions, goalSwitching: resolved.policy.limits.goalSwitching, onboarded: !!profile.onboarded_at,
      goals: Object.values(GOALS).map((g: any) => ({ id: g.id, objective: g.objective, placeholder: !!g.placeholder })) },
    session: { session_key, kind, session_no: sessionNo, plan_id: snap?.id || null, spent_minutes: spent, remaining_minutes: remaining, complete, frozen },
    plan: { minutes, minutes_planned: plan.minutes_planned, fallback: plan.fallback, suggestion: plan.suggestion, items: plan.explanation.map(studentView) },
    done_today: doneToday.size,
    continuation: { allowed: resolved.policy.limits.continuationSessionsPerDay, used: continuationsUsed, available: latestComplete && continuationsUsed < resolved.policy.limits.continuationSessionsPerDay },
  };
}
// What the student-facing UI gets (internal features/priorities stay server-side; admin `explain` sees them).
const studentView = (e: any) => ({ item_key: e.item_key, item_type: e.item_type, word_id: e.word_id, label: e.label, short_reason: e.short_reason, depth: e.depth, questions: e.questions, est_minutes: e.est_minutes });

/**
 * A session's state from the server's own records: minutes already practised
 * in it, the remaining budget, the plan for that remainder, and whether it is
 * complete (something was practised and nothing playable is left in budget).
 */
async function sessionState(svc: any, email: string, sessionKey: string, kind: string, ctx: any) {
  const rec = await sessionRecord(svc, email, sessionKey);
  // Nothing practised in this session yet: the plan is still LIVE (a goal or
  // minutes change before starting re-plans it).
  if (!rec.done.size) {
    const plan = planToday({ ...ctx, kind });
    return { spent: 0, remaining: ctx.minutes, plan, complete: false, frozen: false };
  }
  // Practice has started: the plan is FROZEN to the snapshot the learner saw
  // when they started (Tee, 2026-10-10). Remaining = that queue minus what was
  // practised (and minus content that is no longer playable). Nothing is ever
  // appended; unused minutes stay unused. "Keep going" is the only way to a
  // fresh plan.
  const startSnap = [...rec.snaps].filter((sn: any) => String(sn.generated_at || '') <= rec.firstAt).pop() || rec.snaps[0];
  const queue = ((startSnap?.queue) || []).filter((q: any) => q?.item_key && !rec.done.has(q.item_key) && ctx.hasContent(q.item_key));
  const est = new Map<string, number>();
  for (const sn of rec.snaps) for (const q of sn.queue || []) if (q?.item_key && !est.has(q.item_key)) est.set(q.item_key, Number(q.est_minutes) || 0);
  let spent = 0;
  for (const k of rec.done) spent += est.get(k) || 0;
  const plan = {
    explanation: queue, minutes_planned: queue.reduce((a: number, q: any) => a + (Number(q.est_minutes) || 0), 0),
    fallback: null, suggestion: null,
    plan_hash: fnv1a(JSON.stringify(['frozen', sessionKey, startSnap?.plan_hash || null, queue.map((q: any) => [q.item_key, q.depth])])),
  };
  return { spent, remaining: Math.max(0, ctx.minutes - spent), plan, complete: queue.length === 0, frozen: true };
}

/** This session's coach-credited items, when practice started, and its snapshots (oldest first). */
async function sessionRecord(svc: any, email: string, sessionKey: string) {
  const ev = ((await svc.ItemEvidence.filter({ user_email: email, session_key: sessionKey }, 'created_date', 300)) || []).filter((e: any) => e.source === 'coach_session');
  const done = new Set<string>(ev.map((e: any) => e.item_key));
  const firstAt = ev.map((e: any) => String(e.at || '')).filter(Boolean).sort()[0] || '';
  const snaps = done.size ? [...((await pageAll(svc.PlanLog, { user_email: email, session_key: sessionKey })) || [])].sort((a: any, b: any) => String(a.generated_at || '').localeCompare(String(b.generated_at || ''))) : [];
  return { done, firstAt, snaps };
}

async function latestContinuationNo(svc: any, email: string, today: string) {
  const rows = (await svc.PlanLog.filter({ user_email: email, day: today, kind: 'continuation' }, 'created_date', 50)) || [];
  return rows.reduce((m: number, r: any) => Math.max(m, Number(r.session_no) || 0), 0);
}

async function continuationsToday(svc: any, email: string, today: string) {
  const rows = (await svc.PlanLog.filter({ user_email: email, day: today, kind: 'continuation' }, 'created_date', 50)) || [];
  return new Set(rows.map((r: any) => r.session_key)).size;
}

/** "Keep going": a fresh session planned from the updated learner state. */
export async function startContinuation(svc: any, me: any, sub: any, deps: Deps, now = Date.now()) {
  const resolved = resolveCoach(sub, now);
  const today = dayOf(now);
  const used = await continuationsToday(svc, me.email, today);
  // Idempotent: a continuation that was started but not practised yet is
  // RESUMED (refresh, double tap, retry), never counted again.
  if (used > 0) {
    const latest = await latestContinuationNo(svc, me.email, today);
    const key = `${today}:continuation:${latest}`;
    const practised = ((await svc.ItemEvidence.filter({ user_email: me.email, session_key: key }, 'created_date', 1)) || []).length > 0;
    if (!practised) return getToday(svc, me, sub, { session_no: latest }, deps, now);
  }
  if (used >= resolved.policy.limits.continuationSessionsPerDay) throw Object.assign(new Error('no_continuations_left'), { code: 'no_continuations_left', status: 409 });
  // The latest session of the day must be COMPLETE first (Tee, 2026-10-09).
  // getToday with no session_no evaluates exactly that session.
  const active = await getToday(svc, me, sub, {}, deps, now);
  if (!active.session.complete) throw Object.assign(new Error('finish_today_first'), { code: 'finish_today_first', status: 409 });
  const n = used + 1;
  // Create the session's first snapshot, then reuse getToday's read path for it.
  const first = await getTodayPlanOnly(svc, me, resolved, n, deps, now);
  await snapshot(svc, me.email, first);
  return getToday(svc, me, sub, { session_no: n }, deps, now);
}

async function getTodayPlanOnly(svc: any, me: any, resolved: any, sessionNo: number, deps: Deps, now: number) {
  const profile = await profileFor(svc, me.email, resolved);
  const goal = goalOf(profile.goal_ids?.[0]);
  const minutes = minutesFor(resolved.policy, profile.daily_minutes);
  const today = dayOf(now);
  const items = ((await pageAll(svc.LearnerItem, { user_email: me.email })) || []).filter((i: any) => isResolved(i.item_key));
  const user = (await svc.User.filter({ email: me.email }, 'created_date', 1))?.[0] || me;
  const newCandidates = await newCandidatesFor(svc, me.email, user?.cefr_level || 'A2', new Set(items.map((i: any) => i.item_key)));
  const doneToday = await doneTodayFor(svc, me.email, today);
  const hasContent = await contentGate(svc, [...items, ...newCandidates]);
  const plan = planToday({ items, newCandidates, goal, policy: resolved.policy, minutes, now, hasContent, doneToday, kind: 'continuation' });
  return {
    day: today, kind: 'continuation', session_no: sessionNo, session_key: `${today}:continuation:${sessionNo}`, goal_id: goal.id, plan_hash: plan.plan_hash,
    generated_at: new Date(now).toISOString(), entitlement: resolved.entitlement, policy: resolved.policy.version, engine: ENGINE_STAMP, minutes, queue: plan.explanation,
  };
}

export async function ackHandoff(svc: any, me: any, sub: any, now = Date.now()) {
  const resolved = resolveCoach(sub, now);
  const p = await profileFor(svc, me.email, resolved);
  await svc.CoachProfile.update(p.id, { last_entitlement: resolved.entitlement, last_coach: resolved.coach, last_policy_version: resolved.policy.version });
  return { entitlement: resolved.entitlement };
}

export async function saveProfile(svc: any, me: any, sub: any, body: any, now = Date.now()) {
  const resolved = resolveCoach(sub, now);
  const p = await profileFor(svc, me.email, resolved);
  const patch: any = {};
  if (body.goal_id !== undefined) {
    if (!GOALS[String(body.goal_id)]) throw Object.assign(new Error('unknown_goal'), { code: 'unknown_goal', status: 400 });
    const current = p.goal_ids?.[0];
    if (current && current !== body.goal_id && !resolved.policy.limits.goalSwitching && p.onboarded_at) throw Object.assign(new Error('goal_switching_not_included'), { code: 'goal_switching_not_included', status: 403 });
    patch.goal_ids = [String(body.goal_id)]; // v0: exactly one active goal for every coach
  }
  if (body.daily_minutes !== undefined) {
    if (!resolved.policy.limits.minutesOptions.includes(Number(body.daily_minutes))) throw Object.assign(new Error('minutes_not_offered'), { code: 'minutes_not_offered', status: 400 });
    patch.daily_minutes = Number(body.daily_minutes);
  }
  if (body.nudge_hour !== undefined) {
    const h = Number(body.nudge_hour);
    if (!(Number.isInteger(h) && h >= 0 && h <= 23)) throw Object.assign(new Error('bad_hour'), { code: 'bad_hour', status: 400 });
    patch.nudge_hour = h;
  }
  if (body.onboarded) patch.onboarded_at = p.onboarded_at || new Date(now).toISOString();
  if (Object.keys(patch).length) await svc.CoachProfile.update(p.id, patch);
  return { ok: true, ...patch };
}

/** The Learner Map: the learner's own resolved items on their goal path. Same under every coach. */
export async function getMap(svc: any, me: any, sub: any, now = Date.now()) {
  const resolved = resolveCoach(sub, now);
  const p = await profileFor(svc, me.email, resolved);
  const goal = goalOf(p.goal_ids?.[0]);
  const items = ((await pageAll(svc.LearnerItem, { user_email: me.email })) || []).filter((i: any) => isResolved(i.item_key) && onPath(goal, i.item_key));
  const view = (i: any) => ({ item_key: i.item_key, item_type: i.item_type, word_id: i.word_id, label: LABELS[i.learning_state] || LABELS.unknown, due: i.due || null });
  return {
    goal_id: goal.id,
    grammar: items.filter((i: any) => i.item_type === 'grammar').map(view),
    words: items.filter((i: any) => i.item_type === 'word').map(view),
    counts: Object.fromEntries(Object.entries(LABELS).map(([k, l]) => [l, items.filter((i: any) => i.learning_state === k).length])),
  };
}

// ---------------------------------------------------------------------------
/**
 * SHADOW MODE (admin): run the engine against real ledgers IN MEMORY for every
 * policy. Writes nothing — no ItemEvidence, LearnerItem, PlanLog or CoachProfile.
 */
export async function shadowLearner(svc: any, email: string, deps: Deps, now = Date.now()) {
  const { evidence, items, ledgerRows } = await deriveForLearner(svc, email, deps);
  const user = (await svc.User.filter({ email }, 'created_date', 1))?.[0] || {};
  const known = new Set<string>(items.map((i: any) => i.item_key));
  const newCandidates = await newCandidatesFor(svc, email, user.cefr_level || 'A2', known);
  const goal = goalOf(DEFAULT_GOAL);
  const plans: any = {};
  for (const [id, policy] of Object.entries(POLICIES) as any) {
    for (const minutes of policy.limits.minutesOptions) {
      const p = planToday({ items, newCandidates, goal, policy, minutes, now, hasContent: hasContentFn, doneToday: new Set(), kind: 'today' });
      plans[`${id}@${minutes}`] = { minutes_planned: p.minutes_planned, fallback: p.fallback, items: p.explanation.map((e: any) => `${e.bucket}:${e.depth}:${e.item_key}:${e.priority}`) };
    }
  }
  return { ...summarise(email, ledgerRows, evidence, items), level: user.cefr_level || null, plans };
}
