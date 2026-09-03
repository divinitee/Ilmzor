import { base44 } from "@/api/base44Client";
import { getAiDailyLimit, isAiDisplayUnlimited } from "@/lib/plans";

const todayStr = () => new Date().toISOString().slice(0, 10);

export const fetchTodayAiUsage = async (userEmail) => {
  if (!userEmail) return 0;
  try {
    const logs = await base44.entities.AiUsageLog.filter({ user_email: userEmail, date: todayStr() });
    return logs?.[0]?.count || 0;
  } catch {
    return 0;
  }
};

export const incrementAiUsage = async (userEmail, userId, userName) => {
  const date = todayStr();
  try {
    const logs = await base44.entities.AiUsageLog.filter({ user_email: userEmail, date });
    if (logs.length > 0) {
      const log = logs[0];
      return await base44.entities.AiUsageLog.update(log.id, { count: (log.count || 0) + 1 });
    }
    return await base44.entities.AiUsageLog.create({
      user_email: userEmail,
      user_id: userId || "",
      user_name: userName || "",
      date,
      count: 1,
    });
  } catch {
    return null;
  }
};

// Returns { allowed, limit, used, remaining, unlimited }.
// `unlimited` is a DISPLAY hint only (the plan is marketed as "unlimited, fair
// use") — `allowed`/`remaining` always reflect the real enforced ceiling
// underneath, even for a display-unlimited plan like VIP, so a genuine
// circuit-breaker still works against the shared Base44 credit pool.
export const canUseAiToday = async (planNameOrId, userEmail, isAdmin = false) => {
  if (isAdmin) return { allowed: true, limit: Infinity, used: 0, remaining: Infinity, unlimited: true };
  const limit = getAiDailyLimit(planNameOrId);
  const unlimited = isAiDisplayUnlimited(planNameOrId);
  if (limit === Infinity) return { allowed: true, limit: Infinity, used: 0, remaining: Infinity, unlimited: true };
  const used = await fetchTodayAiUsage(userEmail);
  return { allowed: used < limit, limit, used, remaining: Math.max(0, limit - used), unlimited };
};

// Looks up the caller's active plan name from their StudentSubscription record
// (same phone / created_by_id fallback pattern used across Home.jsx and
// VocabTutorChat.jsx), then runs the normal daily-limit check. Shared so every
// AI call site — Tutor Chat, Lesson Runner, Placement Test, the AI-graded
// games — enforces the same plan limits without re-implementing the
// subscription lookup at each one.
export const checkAiGate = async (userEmail, userId, isAdmin = false) => {
  if (isAdmin) return canUseAiToday(null, userEmail, true);
  let planName = null;
  try {
    let subs = await base44.entities.StudentSubscription.filter({ phone: userEmail });
    if (subs.length === 0 && userId) subs = await base44.entities.StudentSubscription.filter({ created_by_id: userId });
    planName = subs?.[0]?.plan || null;
  } catch {
    planName = null;
  }
  return canUseAiToday(planName, userEmail, isAdmin);
};