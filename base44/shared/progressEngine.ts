// VT-6 progress engine — DB side. All mastery math lives in progressCore.js.
// Two ways to compute SkillState, which must agree:
//   recomputeSkill  normal path: newest N RoundReceipt summaries + newest N legacy RewardEvents + counts.
//   rebuildSkill    from scratch: every item-ledger row grouped into rounds + every legacy RewardEvent.
import {
  SKILL_KEYS, EVIDENCE_WINDOW_N, gamesForSkill, ledgerForSkill, groupRounds,
  stateFrom, replayPeak, zeroState, presentState, summarize,
} from './progressCore.js';

export * from './progressCore.js';

const PAGE = 500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function pageAll(ent: any, q: any, sort = 'created_date') {
  const out: any[] = [];
  let skip = 0;
  while (true) {
    const page = (await ent.filter(q, sort, PAGE, skip)) || [];
    out.push(...page);
    if (page.length < PAGE) break;
    skip += PAGE;
  }
  return out;
}

const legacyQuery = (email: string, skill: string) => ({
  user_email: email, game: { $in: gamesForSkill(skill) }, items_total: { $gt: 0 }, ledger_version: { $exists: false },
});
const legacyRound = (e: any) => ({ round_id: e.round_id || e.id, at: e.created_date, total: Number(e.items_total) || 0, credit: Math.min(Number(e.items_correct) || 0, Number(e.items_total) || 0), verified: false });
const receiptQuery = (email: string, skill: string) => ({ user_email: email, kind: 'evidence', status: 'done', skill });
const receiptRound = (r: any) => ({ round_id: r.round_id, at: r.round_at, total: Number(r.items_total) || 0, credit: Number(r.items_credit) || 0, verified: true });

function ledgerQuery(email: string, skill: string) {
  if (skill === 'creativity') return { user_email: email, task: 'sentence', counted: true };
  return { user_email: email, game: { $in: gamesForSkill(skill) }, verification: { $exists: true } };
}
const creditOf = (skill: string) => (row: any) =>
  skill === 'creativity' ? Math.max(0, Math.min(100, Number(row.score) || 0)) / 100 : row.correct === true ? 1 : 0;

async function upsertState(svc: any, email: string, skill: string, fields: any) {
  const existing = await svc.SkillState.filter({ user_email: email, skill }, '-updated_date', 1);
  if (existing?.[0]) return await svc.SkillState.update(existing[0].id, fields);
  return await svc.SkillState.create({ user_email: email, skill, ...fields });
}

/**
 * Exactly-once claim for (learner, round_id, kind). No unique index exists and
 * upsert is not atomic under concurrency (8 parallel upserts made 4 rows), so
 * this is an election: each request writes its own claim, waits a settle
 * window, re-reads, and only the EARLIEST row (created_date, then id) proceeds.
 * Returns the winning receipt, or null for a duplicate.
 */
export async function claimRound(svc: any, email: string, roundId: string, kind: string) {
  const receipt_key = `${email}|${roundId}|${kind}`;
  const prior = await svc.RoundReceipt.filter({ receipt_key }, 'created_date', 1);
  if (prior?.length) return null;
  const mine = await svc.RoundReceipt.create({
    receipt_key, claim_id: crypto.randomUUID(), user_email: email, round_id: roundId, kind,
    status: 'claimed', round_at: new Date().toISOString(),
  });
  await sleep(450);
  const rows = (await svc.RoundReceipt.filter({ receipt_key }, 'created_date', 50)) || [];
  rows.sort((a: any, b: any) => (a.created_date < b.created_date ? -1 : a.created_date > b.created_date ? 1 : a.id < b.id ? -1 : 1));
  if (rows[0]?.id !== mine.id) {
    await svc.RoundReceipt.delete(mine.id).catch(() => {});
    return null;
  }
  return mine;
}

export async function recomputeSkill(svc: any, email: string, skill: string, now = Date.now()) {
  const existing = (await svc.SkillState.filter({ user_email: email, skill }, '-updated_date', 1))?.[0];
  if (!existing || existing.verified_rounds == null) return await rebuildSkill(svc, email, skill, now);
  const [receipts, verifiedCount, legacy, legacyCount] = await Promise.all([
    svc.RoundReceipt.filter(receiptQuery(email, skill), '-round_at', EVIDENCE_WINDOW_N),
    svc.RoundReceipt.count(receiptQuery(email, skill)),
    svc.RewardEvent.filter(legacyQuery(email, skill), '-created_date', EVIDENCE_WINDOW_N),
    svc.RewardEvent.count(legacyQuery(email, skill)),
  ]);
  const s = stateFrom({ verified: (receipts || []).map(receiptRound), legacy: (legacy || []).map(legacyRound), verifiedCount, legacyCount }, now);
  return await upsertState(svc, email, skill, {
    ...s,
    historical_peak: Math.max(Number(existing.historical_peak) || 0, s.current_mastery),
    computed_at: new Date(now).toISOString(),
  });
}

export async function deriveSkill(svc: any, email: string, skill: string, now = Date.now()) {
  const [rows, legacyRows] = await Promise.all([
    pageAll(svc[ledgerForSkill(skill)], ledgerQuery(email, skill)),
    pageAll(svc.RewardEvent, legacyQuery(email, skill)),
  ]);
  const verified = groupRounds(rows, creditOf(skill));
  const legacy = legacyRows.map(legacyRound);
  const s = stateFrom({ verified, legacy, verifiedCount: verified.length, legacyCount: legacy.length }, now);
  return { ...s, historical_peak: replayPeak(verified, legacy) };
}

export async function rebuildSkill(svc: any, email: string, skill: string, now = Date.now()) {
  const d = await deriveSkill(svc, email, skill, now);
  const existing = (await svc.SkillState.filter({ user_email: email, skill }, '-updated_date', 1))?.[0];
  // legacy_best: display-only copy of the frozen SkillHubProgress.best. Never feeds mastery or peak.
  let legacy_best = existing?.legacy_best;
  if (legacy_best == null) {
    const old = await svc.SkillHubProgress.filter({ user_email: email, skill }, '-updated_date', 1);
    legacy_best = Number(old?.[0]?.best) || 0;
  }
  return await upsertState(svc, email, skill, { ...d, legacy_best, computed_at: new Date(now).toISOString() });
}

export async function readSkillStates(svc: any, email: string, now = Date.now()) {
  const rows = (await svc.SkillState.filter({ user_email: email }, '-updated_date', 20)) || [];
  const bySkill: Record<string, any> = {};
  for (const r of rows) if (!bySkill[r.skill]) bySkill[r.skill] = r;
  const skills = SKILL_KEYS.map((k) => presentState(bySkill[k] || zeroState(email, k), now));
  const computed_at = skills.map((s) => s.computed_at).filter(Boolean).sort().pop() || null;
  return { skills, overall: summarize(skills), computed_at };
}