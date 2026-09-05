import { base44 } from "@/api/base44Client";

// ---------------------------------------------------------------------------
// Layer 3.2 of claude/ilmzor-game-template.md — the single source of truth
// for round XP. "No migrated game computes XP inline" is the acceptance
// criterion this file exists to satisfy: every migrated game calls these
// functions instead of writing its own arithmetic (the 1x-vs-10x-per-correct
// gap between games documented in the template's opening table is exactly
// what ad-hoc per-game arithmetic produced).
//
// Forward-only policy (locked by Tee, 2026-09-04): existing UserCoins
// balances are never rescaled or reconstructed. This formula is the
// standard for XP awarded FROM NOW ON, starting with Memory Flip. It does
// NOT touch UserCoins itself — a migrated game still calls its existing
// onXpEarned(amount, correctCount) prop exactly as before, using the
// `amount` this file computes. This file's own responsibility is the
// arithmetic plus the RewardEvent ledger write (Layer 3.3).
// ---------------------------------------------------------------------------

export const BASE_XP_PER_CORRECT = 10;
export const STREAK_BONUS_PER_STEP = 2;
export const MAX_STREAK_BONUS = 20;

// Replaces today's mix of 60 / 70 / 40 and pool×4 / pool×2 thresholds
// scattered across engines. Applied by migrated games only.
export const PASS_THRESHOLD = 0.6;

export function computeBaseXp(itemsCorrect) {
  return Math.max(0, itemsCorrect || 0) * BASE_XP_PER_CORRECT;
}

// streakBest is the round's longest correct-in-a-row streak. The first
// correct answer of any streak doesn't bonus by itself — the bonus rewards
// chaining further, hence (streakBest - 1).
export function computeStreakBonus(streakBest) {
  return Math.min(MAX_STREAK_BONUS, Math.max(0, (streakBest || 0) - 1) * STREAK_BONUS_PER_STEP);
}

// hintMultiplier: pass hintXpMultiplier(level) from levels.js when the round
// involved revealing the uz/ru translation; pass 1 for a round with no
// reveals (full XP). Presented to students as a bonus for going
// English-only, never as a penalty — see HINT_XP_MULTIPLIER's own comment.
export function computeRoundXp({ itemsCorrect, streakBest = 0, hintMultiplier = 1 }) {
  const baseXp = computeBaseXp(itemsCorrect);
  const streakBonus = computeStreakBonus(streakBest);
  const amount = Math.round((baseXp + streakBonus) * hintMultiplier);
  return { baseXp, streakBonus, amount };
}

export function roundPassed(itemsCorrect, itemsTotal) {
  if (!itemsTotal) return false;
  return itemsCorrect / itemsTotal >= PASS_THRESHOLD;
}

export function generateRoundId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `r_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// The one write path for a round's reward. "Every award writes exactly one
// RewardEvent" (Layer 3.3's acceptance criterion) is enforced by funneling
// every migrated game through this function rather than by convention.
// Fire-and-forget internally, matching the codebase's existing
// syncGameResultToServer pattern — a failed ledger write costs history,
// never the student's XP; the caller's own onXpEarned(amount, ...) call
// still fires with the returned `amount` regardless of whether this
// succeeds.
export async function recordRoundReward({
  userEmail,
  game,
  roundId,
  itemsTotal,
  itemsCorrect,
  streakBest = 0,
  hintMultiplier = 1,
  level,
}) {
  const { baseXp, streakBonus, amount } = computeRoundXp({ itemsCorrect, streakBest, hintMultiplier });
  try {
    await base44.entities.RewardEvent.create({
      user_email: userEmail,
      game,
      amount,
      round_id: roundId,
      items_total: itemsTotal,
      items_correct: itemsCorrect,
      base_xp: baseXp,
      streak_best: streakBest,
      hint_multiplier: hintMultiplier,
      level,
    });
  } catch (e) {
    console.error("RewardEvent write failed", e);
  }
  return { baseXp, streakBonus, amount, passed: roundPassed(itemsCorrect, itemsTotal) };
}
