// VIRORA Skill Intelligence — SHADOW leaf state, DB side. All math lives in
// leafStateCore.js. Admin-only (progressApi rebuildLeafStates / verifyLeafStates).
// Reads the immutable ledgers; writes ONLY LeafState. Never touches SkillState,
// RoundReceipt, RewardEvent or any ledger.
import { deriveLeafStates, diffLeafState, canonical } from './leafStateCore.js';
import { pageAll } from './progressEngine.ts';

/** Every ledger row for one learner, tagged with its ledger. */
export async function loadEvidence(svc: any, email: string) {
  const [words, grammar, ai, legacy] = await Promise.all([
    pageAll(svc.WordAttempt, { user_email: email }),
    pageAll(svc.GrammarAttempt, { user_email: email }),
    pageAll(svc.AiGradedItem, { user_email: email }),
    pageAll(svc.RewardEvent, { user_email: email, ledger_version: { $exists: false } }),
  ]);
  return [
    ...words.map((r: any) => ({ ...r, ledger: 'WordAttempt' })),
    ...grammar.map((r: any) => ({ ...r, ledger: 'GrammarAttempt' })),
    ...ai.map((r: any) => ({ ...r, ledger: 'AiGradedItem' })),
    ...legacy.map((r: any) => ({ ...r, ledger: 'RewardEvent' })),
  ];
}

export async function deriveLeafStatesFor(svc: any, email: string, now: number) {
  return deriveLeafStates(await loadEvidence(svc, email), now);
}

/** Rebuild one learner's LeafState rows from scratch (upsert; stale nodes removed). */
export async function rebuildLeafStates(svc: any, email: string, now = Date.now()) {
  const { states, coverage } = await deriveLeafStatesFor(svc, email, now);
  const existing = (await pageAll(svc.LeafState, { user_email: email })) || [];
  const byNode = new Map<string, any[]>();
  for (const r of existing) byNode.set(r.node_id, [...(byNode.get(r.node_id) || []), r]);
  const computed_at = new Date(now).toISOString();
  let written = 0, removed = 0;
  for (const s of states) {
    const rows = byNode.get(s.node_id) || [];
    const fields = { user_email: email, ...s, computed_at };
    if (rows[0]) await svc.LeafState.update(rows[0].id, fields); else await svc.LeafState.create(fields);
    for (const dup of rows.slice(1)) { await svc.LeafState.delete(dup.id); removed++; }
    byNode.delete(s.node_id);
    written++;
  }
  for (const rows of byNode.values()) for (const r of rows) { await svc.LeafState.delete(r.id); removed++; }
  return { email, written, removed, coverage };
}

/**
 * Verify one learner:
 *   deterministic  two independent derivations with the same `now` are identical
 *   stored         stored LeafState rows == a fresh derivation (field diff)
 */
export async function verifyLeafStates(svc: any, email: string, now = Date.now()) {
  const rows = await loadEvidence(svc, email);
  const a = deriveLeafStates(rows, now);
  const b = deriveLeafStates([...rows].reverse(), now); // input order must not matter
  const deterministic = a.states.length === b.states.length && a.states.every((s: any, i: number) => canonical(s) === canonical(b.states[i]));
  const stored = (await pageAll(svc.LeafState, { user_email: email })) || [];
  const storedBy = new Map(stored.map((r: any) => [r.node_id, r]));
  const mismatches: any[] = [];
  for (const s of a.states) {
    const st: any = storedBy.get(s.node_id);
    if (!st) { mismatches.push({ node_id: s.node_id, missing: true }); continue; }
    const diff = diffLeafState(st, s);
    if (diff.length) mismatches.push({ node_id: s.node_id, fingerprint: [st.fingerprint, s.fingerprint], diff });
    storedBy.delete(s.node_id);
  }
  for (const id of storedBy.keys()) mismatches.push({ node_id: id, stale: true });
  return { email, deterministic, nodes: a.states.length, coverage: a.coverage, mismatches };
}
