import React from "react";
import { Check } from "lucide-react";
import { PLAN_THEME, metalText } from "@/lib/planTheme";
import { pT } from "@/lib/planCopy";

// Membership card, one look per plan: free = light electric blue,
// learner = VIRORA purple, vip = black and gold. Used on the pricing page,
// the QR checkout and the "plan activated" screens.
//
// props: plan ("free"|"learner"|"vip"), name, lang, rightLabel/rightValue
// (bottom-right field), founding (paid plans only), active (check mark),
// className.
export default function MemberCard({
  plan = "free",
  name,
  lang = "uz",
  rightLabel,
  rightValue,
  founding = false,
  active = false,
  className = "",
}) {
  const th = PLAN_THEME[plan] || PLAN_THEME.free;
  const display = (name || "").trim().toUpperCase() || pT(lang, "your_name");

  return (
    <div
      className={`relative w-full max-w-[340px] overflow-hidden rounded-[20px] p-5 text-left ${className}`}
      style={{
        aspectRatio: "1.586 / 1",
        background: th.cardBg,
        border: `1px solid ${th.border}`,
        boxShadow: `0 0 50px ${th.glow}, 0 24px 60px rgba(0,0,0,0.45)`,
        color: th.text,
      }}
    >
      {/* soft light from the top-left corner */}
      <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full blur-2xl" style={{ background: th.glow }} />
      {/* passing shine */}
      <div
        className="vr-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3"
        style={{ background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.16), rgba(255,255,255,0))" }}
      />
      {/* big watermark V */}
      <img src="/virora-mark-v2.svg" alt="" aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 -right-8 h-40 w-40 opacity-[0.07]" />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/virora-mark-v2.svg" alt="" className="h-9 w-9" />
            <div className="flex flex-col leading-none">
              <span className="text-[19px] font-extrabold tracking-[0.18em]" style={metalText(th)}>{th.label}</span>
              <span className="mt-1 text-[9px] font-bold tracking-[0.28em]" style={{ color: th.sub }}>{th.tagline}</span>
            </div>
          </div>
          {active ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={th.metal}>
              <Check className="h-4 w-4" />
            </span>
          ) : founding ? (
            <span className="rounded-full px-2 py-1 text-[8.5px] font-extrabold tracking-[0.2em]" style={th.metal}>
              {pT(lang, "founding")}
            </span>
          ) : null}
        </div>

        {/* card chip */}
        <div className="h-7 w-10 rounded-md opacity-90" style={{ background: th.metal.background, boxShadow: th.metal.boxShadow }} />

        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[9px] font-semibold tracking-[0.2em]" style={{ color: th.sub }}>{pT(lang, "member")}</span>
            <span className="truncate text-[14px] font-bold tracking-[0.06em]">{display}</span>
          </div>
          {rightValue && (
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[9px] font-semibold tracking-[0.2em]" style={{ color: th.sub }}>{rightLabel}</span>
              <span className="text-[14px] font-bold">{rightValue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Coloured plan dot used in admin lists (and anywhere a plan is named).
export function PlanDot({ plan, size = 10, className = "" }) {
  const th = PLAN_THEME[plan] || PLAN_THEME.free;
  return (
    <span
      title={th.label}
      aria-label={th.label}
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size, background: th.dot, boxShadow: `0 0 0 2px ${th.glow}, 0 0 8px ${th.dot}` }}
    />
  );
}
