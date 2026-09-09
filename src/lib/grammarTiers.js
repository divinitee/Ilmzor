// Grammar navigation taxonomy — Tier -> Cluster -> Domain -> Branch.
//
// This is a NAVIGATION view over the locked 13-domain/branch taxonomy in
// domains.js, not a new content layer. It derives entirely from item-level
// cefrLevel data already in the dataset's public contract, and never
// redeclares domains, branches or CEFR levels of its own. If a branch is
// added or an item's level changes upstream, this recomputes automatically —
// nothing here needs to be kept in sync by hand.
//
// Two axes, combined (Tee's decision, 2026-09-09 discussion; see
// claude/virora-grammar-taxonomy.md, D5 "Navigation grouping"):
//
//   TIER — a CEFR band (Foundational A1-A2 / Functional B1 / Academic
//   B2-C1-C2), computed per ITEM, not per domain. Almost every domain has
//   content in all three tiers (Tenses alone runs A1 to C2), so a tier is
//   NOT "these domains belong to this tier" — it's "these domains have
//   content at this level," each filtered down to just that content.
//
//   CLUSTER — the 5 topic-family groups already logged in the taxonomy doc,
//   grouping whole domains by grammatical family rather than difficulty.
//   This is what actually cuts clutter within a tier: without it, every
//   tier would still list ~12-13 domains.
//
// Combining them: within one tier, a cluster only lists the domains that
// have content there; a domain only lists the branches that have content
// there. Reported Speech, for example, simply doesn't appear under
// Foundational at all — it has no A1/A2 content.
//
// NOTE: the taxonomy doc names cluster 4 "Functional" — renamed here to
// "Communicative Tools" to avoid colliding with the Functional TIER name in
// the same UI. Same 3 domains (questions-negation, modals, prep-phrasal),
// only the label changed.
//
// Scope: navigation only. No mastery-gated "Elevate" unlocking lives here —
// that's a separate, larger decision (the 2026-09-08 Elevate sketch),
// explicitly deferred when this was discussed.

import { ADAPTIVE_GRAMMAR_ITEMS, DOMAINS } from "@/lib/adaptiveGrammar";

export const TIERS = [
  { id: "foundational", name: "Foundational Grammar", levels: ["A1", "A2"] },
  { id: "functional", name: "Functional", levels: ["B1"] },
  { id: "academic", name: "Academic", levels: ["B2", "C1", "C2"] },
];

const LEVEL_TO_TIER = Object.fromEntries(TIERS.flatMap((t) => t.levels.map((l) => [l, t.id])));

export const CLUSTERS = [
  { id: "verb-core", name: "Verb Core", domains: ["tenses", "verb-patterns"] },
  { id: "noun-phrase", name: "Noun Phrase", domains: ["nouns-articles", "pronouns"] },
  { id: "modification", name: "Modification", domains: ["adj-adv", "comparison"] },
  { id: "communicative-tools", name: "Communicative Tools", domains: ["questions-negation", "modals", "prep-phrasal"] },
  { id: "complex-sentence", name: "Complex Sentence", domains: ["sentence-structure", "conditionals-wishes", "passive-causative", "reported-speech"] },
];

const DOMAIN_BY_ID = Object.fromEntries(DOMAINS.map((d) => [d.id, d]));

/** { [tierId]: { [domainId]: { total, branches: { [branchId]: count } } } } */
function buildCounts() {
  const counts = {};
  for (const tier of TIERS) counts[tier.id] = {};
  for (const it of ADAPTIVE_GRAMMAR_ITEMS) {
    const tierId = LEVEL_TO_TIER[it.cefrLevel];
    if (!tierId) continue;
    const byDomain = counts[tierId];
    byDomain[it.domain] ??= { total: 0, branches: {} };
    byDomain[it.domain].total++;
    byDomain[it.domain].branches[it.branch] = (byDomain[it.domain].branches[it.branch] || 0) + 1;
  }
  return counts;
}
const COUNTS = buildCounts();

/**
 * The full nav tree, pre-filtered to only what has content:
 * tiers -> clusters -> domains -> branches (branch ids only; item counts at
 * the domain level, where the placement result also lives).
 */
export const GRAMMAR_NAV = TIERS.map((tier) => {
  const domainCounts = COUNTS[tier.id];
  const clusters = CLUSTERS.map((cluster) => {
    const domains = cluster.domains
      .filter((id) => domainCounts[id]?.total > 0)
      .map((id) => {
        const domain = DOMAIN_BY_ID[id];
        const dc = domainCounts[id];
        const branches = domain.branches.filter((b) => dc.branches[b] > 0);
        return { id, name: domain.name, itemCount: dc.total, branches };
      });
    const itemCount = domains.reduce((sum, d) => sum + d.itemCount, 0);
    return { id: cluster.id, name: cluster.name, domains, itemCount };
  }).filter((cluster) => cluster.domains.length > 0);
  const itemCount = clusters.reduce((sum, c) => sum + c.itemCount, 0);
  return { id: tier.id, name: tier.name, levels: tier.levels, clusters, itemCount };
});

export const tierById = (id) => GRAMMAR_NAV.find((t) => t.id === id) || null;
export const clusterInTier = (tier, clusterId) => tier?.clusters.find((c) => c.id === clusterId) || null;
