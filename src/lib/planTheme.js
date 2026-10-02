// One colour identity per plan, used everywhere a plan is shown: pricing
// cards, membership cards, the QR checkout and the admin lists.
//   free    → light electric blue
//   learner → VIRORA purple
//   vip     → black and gold
// (Tee, 2026-10-03: "users should clearly be able to distinguish free,
// learner and VIP".)

export const PLAN_THEME = {
  free: {
    key: "free",
    label: "FREE",
    tagline: "STARTER",
    dot: "#5CC8FF",
    accent: "#8FDBFF",
    accentStrong: "#3AA8F0",
    text: "#EAF7FF",
    sub: "#9CC3DD",
    border: "rgba(127,212,255,0.55)",
    glow: "rgba(92,200,255,0.28)",
    surface: "linear-gradient(180deg, rgba(92,200,255,0.10) 0%, rgba(10,23,38,0.55) 100%)",
    cardBg: "linear-gradient(135deg, #12304E 0%, #0A1828 55%, #143A60 100%)",
    goldText: "linear-gradient(180deg, #E9F8FF 0%, #9EDCFF 45%, #4FAEE8 55%, #B5E6FF 100%)",
    metal: {
      background: "linear-gradient(180deg, #C8EEFF 0%, #74C9F5 46%, #4AA3DB 54%, #86D3F8 100%)",
      color: "#04192A",
      border: "1px solid rgba(220,245,255,0.6)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 6px rgba(0,0,0,0.20)",
    },
  },
  learner: {
    key: "learner",
    label: "LEARNER",
    tagline: "MEMBER",
    dot: "#8C66D4",
    accent: "#C9B8F0",
    accentStrong: "#8C66D4",
    text: "#F4EEFF",
    sub: "#B3A6CF",
    border: "rgba(196,181,253,0.55)",
    glow: "rgba(140,102,212,0.32)",
    surface: "linear-gradient(180deg, rgba(139,92,246,0.10) 0%, rgba(18,11,34,0.55) 100%)",
    cardBg: "linear-gradient(135deg, #2A1846 0%, #140C26 55%, #2F1B52 100%)",
    goldText: "linear-gradient(180deg, #F3ECFF 0%, #C9B8F0 45%, #8C66D4 55%, #DCCFF7 100%)",
    metal: {
      background: "linear-gradient(180deg, #8C66D4 0%, #6A40B6 46%, #53309A 54%, #6B44B6 100%)",
      color: "#F7F2FF",
      border: "1px solid rgba(205,185,255,0.35)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.32), inset 0 -2px 6px rgba(0,0,0,0.28)",
    },
  },
  vip: {
    key: "vip",
    label: "VIP",
    tagline: "MEMBERSHIP",
    dot: "#D9B572",
    accent: "#E9D29A",
    accentStrong: "#B08D57",
    text: "#F4EEDF",
    sub: "#BDB3A0",
    border: "rgba(233,210,154,0.65)",
    glow: "rgba(217,181,114,0.30)",
    surface: "radial-gradient(90% 55% at 50% 0%, rgba(58,42,14,0.85) 0%, rgba(10,8,6,0.95) 70%)",
    cardBg: "linear-gradient(135deg, #2A2112 0%, #110D07 55%, #2E2310 100%)",
    goldText: "linear-gradient(180deg, #F6E7BE 0%, #D9B572 45%, #9C7536 55%, #E3C68A 100%)",
    metal: {
      background: "linear-gradient(180deg, #EBD6A2 0%, #C9A45E 46%, #A6803D 54%, #CDAE70 100%)",
      color: "#1F1606",
      border: "1px solid rgba(255,236,190,0.55)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 6px rgba(0,0,0,0.22)",
    },
  },
};

// Map whatever a record calls the plan ("VIP Plan", "learner", a trial) to
// a theme key. Anything unknown, free or a trial reads as free.
export function planKey(plan, { isTrial = false } = {}) {
  const p = String(plan || "").toLowerCase();
  if (p.includes("vip")) return "vip";
  if (p.includes("learner") && !isTrial) return "learner";
  return "free";
}

export const themeFor = (plan, opts) => PLAN_THEME[planKey(plan, opts)];

// Gradient-filled text (the metallic plan wordmarks).
export const metalText = (theme) => ({
  backgroundImage: theme.goldText,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
});
