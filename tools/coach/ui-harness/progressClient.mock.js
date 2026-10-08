import { progressApi } from "@/lib/serverApi";
export const SKILLSTATE_EVENT = "virora:skillstate";
export function readSkillCache() { return null; }
export async function fetchSkillState() { return null; }
export async function submitEvidence(email, payload) { if (!email) return null; try { return await progressApi("submitEvidence", payload); } catch { return null; } }
export async function submitReward() { return null; }
