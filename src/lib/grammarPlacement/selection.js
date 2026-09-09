// Grammar Placement Engine — adaptive item selection. PURE.
//
// No fixed sequence. Every choice is derived from what the evidence still
// needs, and every choice is reproducible: given the same ledger, the same
// dataset index and the same seed, this module returns the same item. That is
// what makes a placement auditable rather than merely plausible.
//
// Three phases, each with its own selector:
//   calibration -> bracket the learner's rough band cheaply (no AI)
//   screening   -> one probe per domain at the anchor, to sort domains
//   resolution  -> spend the remaining budget where uncertainty actually is
//
// Requirement 4 is enforced structurally: candidates are always drawn from
// index.remainingItems(), which excludes every id already served. An item
// cannot repeat.

import { PLACEMENT_LEVELS, levelIndex } from "@/lib/grammarPlacement/levels";
import { cellKey } from "@/lib/grammarPlacement/evidence";

// Small deterministic PRNG. Used only to break ties between candidates the
// rules rate as genuinely equivalent, so retakes vary without the engine
// becoming unreproducible — the seed is stored on the run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const nextInLadder = (ladder, level) => {
  const i = ladder.indexOf(level);
  return i >= 0 && i + 1 < ladder.length ? ladder[i + 1] : null;
};
const prevInLadder = (ladder, level) => {
  const i = ladder.indexOf(level);
  return i > 0 ? ladder[i - 1] : null;
};

/**
 * Read a domain's current shape off the derived cells.
 * Pure summary — computes nothing about levels nobody answered.
 */
export function analyzeDomain(domain, cells, index) {
  const ladder = index.levelsForDomain(domain);
  const at = (l) => cells.get(cellKey(domain, l));
  const cleared = ladder.filter((l) => at(l)?.outcome === "cleared");
  const failed = ladder.filter((l) => at(l)?.outcome === "failed");
  const highestCleared = cleared.length ? cleared[cleared.length - 1] : null;
  const lowestFailed = failed.length ? failed[0] : null;
  const contradiction = Boolean(
    highestCleared && lowestFailed && levelIndex(lowestFailed) < levelIndex(highestCleared)
  );
  const observed = ladder.filter((l) => (at(l)?.observed ?? 0) > 0);
  return {
    domain, ladder, cleared, failed, highestCleared, lowestFailed, contradiction,
    observedLevels: observed,
    hasAnyEvidence: observed.length > 0,
    floor: ladder[0] ?? null,
    ceiling: ladder[ladder.length - 1] ?? null,
  };
}

/**
 * A domain is RESOLVED when more questions in it could not change its
 * placement. This is what makes genuine early stopping possible: without it
 * the selector always finds some next rung worth a token amount of value and
 * every run runs to the cap.
 *
 * Note what this does NOT require: it never asks for rungs below the cleared
 * one to be tested. A bracketed boundary is a complete answer, and probing
 * downward from it would buy nothing (requirement 2 — skipping the probe is an
 * efficiency decision, and the untested rungs stay untested in the record).
 */
export function domainResolved(an, cells) {
  if (an.contradiction) return false;
  const at = (l) => cells.get(cellKey(an.domain, l));

  if (an.highestCleared) {
    const above = nextInLadder(an.ladder, an.highestCleared);
    if (!above) return true;                       // at this domain's ceiling
    const c = at(above);
    if (c?.outcome === "failed") return true;      // boundary bracketed
    if (c?.atMax || c?.remainingSupply <= 0) return true; // nothing more to ask up there
    return false;
  }

  if (an.lowestFailed) {
    const below = prevInLadder(an.ladder, an.lowestFailed);
    if (!below) return true;                       // failed the floor: below floor
    const c = at(below);
    if (c?.atMax || c?.remainingSupply <= 0) return true;
    return false;
  }

  return false;
}

/**
 * How much this cell sits on the domain's decision frontier — the place where
 * more evidence could actually move the answer. Cells far from the frontier
 * decay geometrically, which is what stops the engine re-confirming A1 for a
 * learner who has already cleared B2.
 */
function frontierWeight(level, an, index, anchorLevel, config) {
  const decay = config.selection.offFrontierDecay;

  // A contradiction outranks everything else in that domain: both the failed
  // lower rung and the cleared higher rung need another look.
  if (an.contradiction) {
    if (level === an.lowestFailed || level === an.highestCleared) return 1.0;
    return decay * decay;
  }

  // Boundary already bracketed — only an unresolved gap between them matters.
  if (an.highestCleared && an.lowestFailed) {
    const inGap =
      levelIndex(level) > levelIndex(an.highestCleared) &&
      levelIndex(level) < levelIndex(an.lowestFailed);
    return inGap ? 1.0 : decay * decay;
  }

  let target;
  if (an.highestCleared) target = nextInLadder(an.ladder, an.highestCleared);
  else if (an.lowestFailed) target = prevInLadder(an.ladder, an.lowestFailed);
  else target = index.nearestLevel(an.domain, anchorLevel);

  // Cleared the top of what this domain can assess: nothing above to probe.
  if (!target) return an.highestCleared ? 0 : decay;

  const d = Math.abs(levelIndex(level) - levelIndex(target));
  return Math.pow(decay, d);
}

/** True when C2 may be probed for this domain at all. */
function c2Allowed(an, cells, config) {
  if (!config.c2.enabled) return false;
  if (!config.c2.requiresClearedBelow) return true;
  const c1 = cells.get(cellKey(an.domain, "C1"));
  return c1?.outcome === "cleared";
}

/**
 * Value of gathering one more observation in this cell.
 * Zero means "do not ask" — the cell is finished, empty, or off-limits.
 */
export function cellValue(domain, level, cells, index, an, config, ctx) {
  const cell = cells.get(cellKey(domain, level));
  if (!cell) return 0;
  if (cell.remainingSupply <= 0) return 0;   // nothing left to ask (no repeats)
  if (cell.atMax) return 0;                  // spent enough here
  if (domainResolved(an, cells)) return 0;   // more questions cannot change the answer
  if (level === "C2" && !c2Allowed(an, cells, config)) return 0;

  // A contradiction is the one case where a cell the state machine considers
  // settled still needs another look. Both contradicted rungs read as `strong`
  // on their own terms (one strongly failed, one strongly cleared), which
  // scores need 0 — so without this override the engine would detect the
  // contradiction, refuse to call the domain resolved, and then never actually
  // probe either side of it.
  const contradictedRung =
    an.contradiction && (level === an.lowestFailed || level === an.highestCleared);

  const need = contradictedRung
    ? config.contradiction.reprobeNeedWeight
    : (config.selection.needWeight[cell.state] ?? 0);
  if (need <= 0) return 0;

  const frontier = frontierWeight(level, an, index, ctx.anchorLevel, config);
  if (frontier <= 0) return 0;

  const core = config.coreDomains.enabled && config.coreDomains.ids.includes(domain)
    ? config.coreDomains.selectionWeight
    : 1;

  // A cell that has only ever seen one evidence class gains a little from
  // seeing another — diversity raises confidence without ever gating a level.
  const diversity = cell.classesSeen.length <= 1 ? 1 + config.evidenceClassDiversityBonus : 1;

  // Contradiction budget guard: once contradictions have eaten their share of
  // the run, they stop outranking everything else.
  const contradictionOverBudget =
    an.contradiction && ctx.contradictionItems >= ctx.contradictionBudget;
  const urgency = an.contradiction && !contradictionOverBudget ? 1.6 : 1;

  return need * frontier * core * diversity * urgency;
}

/**
 * Pick the best item inside a chosen cell.
 *
 * Preference order, all deterministic:
 *  1. exclude AI items when the AI budget is spent or unavailable
 *  2. when re-probing a contradiction, prefer an evidence class this cell has
 *     not already used (a format artefact is a common cause of one)
 *  3. prefer an unseen evidence class generally
 *  4. difficulty: 2 to establish, 3 to confirm an upper bound, 1 when the
 *     learner is struggling at this rung
 *  5. seeded tie-break
 */
export function chooseItemInCell(domain, level, cells, index, ledger, config, ctx, opts = {}) {
  const cell = cells.get(cellKey(domain, level));
  let pool = index.remainingItems(domain, level, ledger);
  if (!pool.length) return null;

  if (!ctx.allowAi) pool = pool.filter((it) => it.evidenceClass !== "free_production");
  if (opts.evidenceClasses?.length) {
    const filtered = pool.filter((it) => opts.evidenceClasses.includes(it.evidenceClass));
    if (filtered.length) pool = filtered;
  }
  if (!pool.length) return null;

  const seen = new Set(cell?.classesSeen ?? []);
  const ratio = cell?.observed ? cell.ratio : null;
  const { difficultyPreference } = config.selection;
  let wantedDifficulty = difficultyPreference.establish;
  if (ratio != null) {
    if (ratio >= config.evidence.ratios.confirm) wantedDifficulty = difficultyPreference.confirmUpper;
    else if (ratio <= config.evidence.ratios.negative) wantedDifficulty = difficultyPreference.struggling;
  }

  const wantNewClass = opts.preferNewClass ?? (seen.size > 0);

  const scored = pool.map((it) => {
    let s = 0;
    if (wantNewClass && !seen.has(it.evidenceClass)) s += 2;
    s += 1 - Math.min(2, Math.abs(it.difficulty - wantedDifficulty)) / 2;
    // Mild preference for deterministic items: they cost nothing and never
    // fail for infrastructure reasons.
    if (it.evidenceClass !== "free_production") s += 0.25;
    return { it, s };
  });

  const best = Math.max(...scored.map((x) => x.s));
  const top = scored.filter((x) => x.s >= best - 1e-9).map((x) => x.it);
  if (top.length === 1) return top[0];
  return top[Math.floor(ctx.rng() * top.length) % top.length];
}

// ---------------------------------------------------------------------------
// Phase 1 — calibration
// ---------------------------------------------------------------------------

/**
 * Binary search on the ladder using bellwether domains and cheap deterministic
 * items. Returns {item, probeLevel, domain} or null when calibration is done.
 *
 * `cal` is the mutable-by-copy calibration state carried on the engine state:
 *   { lo, hi, probeLevel, servedAtProbe, domainCursor, done }
 */
export function selectCalibrationItem(state, index, config, ctx) {
  const cal = state.calibration;
  if (cal.done) return null;
  if (state.itemsServed >= config.calibration.maxItems) return null;

  const domains = config.calibration.domains.filter((d) => index.domainIds.includes(d));
  if (!domains.length) return null;

  // Rotate through bellwether domains so one domain's quirk cannot define the
  // anchor on its own.
  for (let i = 0; i < domains.length; i += 1) {
    const domain = domains[(cal.domainCursor + i) % domains.length];
    const level = index.nearestLevel(domain, cal.probeLevel);
    if (!level) continue;
    const cells = ctx.cells;
    const item = chooseItemInCell(domain, level, cells, index, state.ledger, config, ctx, {
      evidenceClasses: config.calibration.evidenceClasses,
      preferNewClass: false,
    });
    if (item) return { item, probeLevel: cal.probeLevel, domain, cursorUsed: (cal.domainCursor + i) % domains.length };
  }
  return null;
}

/**
 * Advance the calibration bracket after `itemsPerProbe` items at one level.
 * Returns the next calibration state.
 */
export function advanceCalibration(state, config, probeRatio) {
  const cal = { ...state.calibration };
  const idx = levelIndex(cal.probeLevel);

  // Simple majority, not the placement thresholds. Calibration only decides
  // where to START looking; the evidence model still has to do the real work,
  // and it re-examines calibration's own observations when it does.
  if (probeRatio >= config.calibration.passRatio) cal.lo = idx + 1;
  else cal.hi = idx - 1;

  // `hi` is always the highest rung not yet ruled out from above, which is the
  // best current estimate. Refreshing it on every step means a run that hits
  // the calibration item budget mid-search still anchors on what it learned,
  // instead of falling back to the configured start level.
  cal.anchorIndex = Math.max(0, Math.min(cal.hi, PLACEMENT_LEVELS.length - 1));

  if (cal.lo > cal.hi) {
    cal.done = true;
    return cal;
  }
  cal.probeLevel = PLACEMENT_LEVELS[Math.floor((cal.lo + cal.hi) / 2)];
  cal.servedAtProbe = 0;
  return cal;
}

// ---------------------------------------------------------------------------
// Phase 2 — screening
// ---------------------------------------------------------------------------

/**
 * Bring every domain up to `screening.itemsPerDomain` observations at the
 * anchor. Evidence a bellwether domain already gathered during calibration
 * counts toward that quota rather than being collected twice.
 */
export function selectScreeningItem(state, index, config, ctx) {
  const counts = {};
  for (const o of state.ledger.observations) {
    counts[o.domain] = (counts[o.domain] ?? 0) + 1;
  }
  for (const domain of index.domainIds) {
    if ((counts[domain] ?? 0) >= config.screening.itemsPerDomain) continue;
    const an = analyzeDomain(domain, ctx.cells, index);
    if (domainResolved(an, ctx.cells)) continue;
    const level = index.nearestLevel(domain, ctx.anchorLevel);
    if (!level) continue;
    const item = chooseItemInCell(domain, level, ctx.cells, index, state.ledger, config, ctx, {
      evidenceClasses: config.screening.evidenceClasses,
      preferNewClass: false,
    });
    if (item) return { item, domain, level };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Phase 3 — resolution
// ---------------------------------------------------------------------------

/**
 * Highest-value cell anywhere, then the best item inside it.
 * Returns {item, domain, level, value} or null when nothing is worth asking.
 */
export function selectResolutionItem(state, index, config, ctx) {
  let best = null;
  for (const domain of index.domainIds) {
    const an = analyzeDomain(domain, ctx.cells, index);
    for (const level of an.ladder) {
      const v = cellValue(domain, level, ctx.cells, index, an, config, ctx);
      if (v <= config.selection.minValue) continue;
      if (!best || v > best.value + 1e-9) best = { domain, level, value: v, an };
      else if (Math.abs(v - best.value) <= 1e-9) {
        // Deterministic tie-break: canonical domain order, then ladder order.
        const bi = index.domainIds.indexOf(best.domain);
        const ci = index.domainIds.indexOf(domain);
        if (ci < bi || (ci === bi && levelIndex(level) < levelIndex(best.level))) {
          best = { domain, level, value: v, an };
        }
      }
    }
  }
  if (!best) return null;

  const item = chooseItemInCell(best.domain, best.level, ctx.cells, index, state.ledger, config, ctx, {
    preferNewClass: best.an.contradiction ? config.contradiction.preferDifferentEvidenceClass : undefined,
  });
  if (!item) return null;
  return { item, domain: best.domain, level: best.level, value: best.value, contradiction: best.an.contradiction };
}

export const _internal = { frontierWeight, nextInLadder, prevInLadder, c2Allowed, domainResolved };
