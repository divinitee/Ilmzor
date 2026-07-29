import { base44 } from "@/api/base44Client";
import { getAiDailyLimit } from "@/lib/plans";

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

// Returns { allowed, limit, used, remaining, unlimited }
export const canUseAiToday = async (planNameOrId, userEmail, isAdmin = false) => {
  if (isAdmin) return { allowed: true, limit: Infinity, used: 0, remaining: Infinity, unlimited: true };
  const limit = getAiDailyLimit(planNameOrId);
  if (limit === Infinity) return { allowed: true, limit: Infinity, used: 0, remaining: Infinity, unlimited: true };
  const used = await fetchTodayAiUsage(userEmail);
  return { allowed: used < limit, limit, used, remaining: Math.max(0, limit - used), unlimited: false };
};