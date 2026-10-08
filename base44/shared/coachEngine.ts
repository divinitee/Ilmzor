// VIRORA Coach Engine — DB side (VT-40, Stage 1, 2026-10-08).
// All rules live in coachCore.js (pure). This file only reads/writes:
//   reads   WordAttempt, GrammarAttempt (immutable ledgers), WordSense, VocabularyWord
//   writes  ItemEvidence (append-only coach ledger), LearnerItem (derived facts)
// Never touches SkillState, LeafState, RoundReceipt or any game ledger.
//
// Stage 1 = backfill + verify. FSRS fields stay empty here on purpose: game and
// grammar-practice evidence never moves FSRS (A5). Coach sessions (Stage 2) are
// the only writer of FSRS fields.
import { evidenceFromLedgers, deriveLearnerItems, canonicalItem, normalizeLemma } from './coachCore.js';
import { pageAll } from './progressEngine.ts';

const chunk = <T>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/** Every word/grammar ledger row for one learner, tagged with its ledger. */
export async function loadLedgers(svc: any, email: string) {
  const [words, grammar] = await Promise.all([
    pageAll(svc.WordAttempt, { user_email: email }),
    pageAll(svc.GrammarAttempt, { user_email: email }),
  ]);
  return [
    ...words.map((r: any) => ({ ...r, ledger: 'WordAttempt' })),
    ...grammar.map((r: any) => ({ ...r, ledger: 'GrammarAttempt' })),
  ];
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
    for (const s of senses) senseIndexes.set(s.word_id, [...(senseIndexes.get(s.word_id) || []), Number(s.sense_index)].sort((a, b) => a - b));
  }
  return { senseIndexes, wordIdsByLemma };
}

/** Pure-ish preview: what the coach ledger and learner items WOULD be for one learner. */
export async function deriveForLearner(svc: any, email: string) {
  const rows = await loadLedgers(svc, email);
  const maps = await resolverMaps(svc, rows);
  const evidence = evidenceFromLedgers(rows, maps);
  return { evidence, items: deriveLearnerItems(evidence), ledgerRows: rows.length };
}

/**
 * Backfill one learner. Idempotent:
 *   ItemEvidence — appended only for (round_id, item_key) pairs not yet present
 *   LearnerItem  — upsert per item_key, duplicates merged (Base44 has no unique key)
 * dryRun = compute and report, write nothing.
 */
export async function backfillLearner(svc: any, email: string, { dryRun = false } = {}) {
  const { evidence: fromLedgers, ledgerRows } = await deriveForLearner(svc, email);
  const existingEv = (await pageAll(svc.ItemEvidence, { user_email: email })) || [];
  const have = new Set(existingEv.map((e: any) => `${e.round_id}|${e.item_key}`));
  const toAdd = fromLedgers.filter((e) => !have.has(`${e.round_id}|${e.item_key}`)).map((e) => ({ ...e, user_email: email, moved_fsrs: false }));
  const allEvidence = [...existingEv, ...toAdd];
  const items = deriveLearnerItems(allEvidence);
  const summary = summarise(email, ledgerRows, allEvidence.length, toAdd.length, items);
  if (dryRun) return { ...summary, dryRun: true };

  for (const part of chunk(toAdd, 200)) await svc.ItemEvidence.bulkCreate(part);
  const stored = (await pageAll(svc.LearnerItem, { user_email: email })) || [];
  const byKey = new Map<string, any[]>();
  for (const r of stored) byKey.set(r.item_key, [...(byKey.get(r.item_key) || []), r]);
  let written = 0, merged = 0;
  for (const it of items) {
    const rows = byKey.get(it.item_key) || [];
    const fields = { user_email: email, ...it };
    if (rows[0]) await svc.LearnerItem.update(rows[0].id, fields); else await svc.LearnerItem.create(fields);
    for (const dup of rows.slice(1)) { await svc.LearnerItem.delete(dup.id); merged++; }
    written++;
  }
  return { ...summary, dryRun: false, written, merged };
}

function summarise(email: string, ledgerRows: number, evidenceRows: number, added: number, items: any[]) {
  const count = (f: (i: any) => boolean) => items.filter(f).length;
  return {
    email, ledgerRows, evidenceRows, evidenceAdded: added, items: items.length,
    words: count((i) => i.item_type === 'word'), grammar: count((i) => i.item_type === 'grammar'),
    unresolved: count((i) => !i.resolved),
    states: { unknown: count((i) => i.learning_state === 'unknown'), weak: count((i) => i.learning_state === 'weak'), learning: count((i) => i.learning_state === 'learning'), solid: count((i) => i.learning_state === 'solid') },
  };
}

/** Prove stored LearnerItems == a fresh derivation from stored ItemEvidence (and order-independent). */
export async function verifyLearner(svc: any, email: string) {
  const ev = (await pageAll(svc.ItemEvidence, { user_email: email })) || [];
  const a = deriveLearnerItems(ev), b = deriveLearnerItems([...ev].reverse());
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
  const dupes = stored.length - new Set(stored.map((r: any) => r.item_key)).size;
  return { email, deterministic, items: a.length, duplicates: dupes, mismatches };
}
