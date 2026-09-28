import { base44 } from "@/api/base44Client";

// All AI quota checks and spending happen server-side in the aiApi backend
// function. These helpers are thin callers; the browser never writes usage.

const toStatus = (s = {}) => ({
  allowed: !!s.allowed,
  limit: s.limit ?? Infinity,
  used: s.used || 0,
  remaining: s.remaining ?? Infinity,
  unlimited: !!s.unlimited,
});

// scope: "student" (plan from subscription) or "teacher" (approved teachers get the VIP ceiling).
export const getAiStatus = async (scope = "student") => {
  const res = await base44.functions.invoke("aiApi", { action: "status", scope });
  return toStatus(res.data?.status);
};

// Spends one AI chat turn server-side. Returns the new status; throws if over quota.
export const consumeAiChatTurn = async (scope = "student") => {
  const res = await base44.functions.invoke("aiApi", { action: "consumeChatTurn", scope });
  if (res.data?.blocked) throw new Error("ai_allowance_exhausted");
  return toStatus(res.data?.status);
};

// Runs one named AI grading task server-side (gated + counted there). Throws if over quota.
export const runAiTask = async (action, payload) => {
  const res = await base44.functions.invoke("aiApi", { action, ...payload });
  if (res.data?.blocked) throw new Error("ai_allowance_exhausted");
  return res.data?.result;
};

// Kept for existing callers: same return shape as before.
export const checkAiGate = async () => getAiStatus("student");