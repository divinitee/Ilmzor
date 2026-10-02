import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AREA_COLOR, useSkillMapCopy } from "@/lib/profile/skillMapCopy";

// Web / constellation layout for the Skill Map (same look as the original
// SkillConstellation: centre core, spokes, radially placed glowing orbs).
//
// Taxonomy rules this file must keep (locked 2026-09-30):
//  - The only percentage is Correctness (verified evidence, leaf level only).
//  - No Mastery %, no area totals/rings/averages, no activity fills.
//  - Orb brightness shows EVIDENCE STATUS only (checked / practised / none),
//    never an amount. Progress cells (○◐●◆) are not rendered until their
//    criteria exist — add them in LeafWebNode when the backend sends them.

const EASE = [0.16, 1, 0.3, 1];
const DAY = 86400000;

export const leafStatus = (leaf) => {
  if (leaf.state === "COMING_SOON") return "soon";
  const ev = leaf.evidence;
  if (ev && ev.correctness != null) return "verified";
  if (ev && (ev.attested_rounds || 0) > 0) return "activity";
  return "untouched";
};

export const areaStatus = (area) => {
  if (area.state === "COMING_SOON") return "soon";
  const st = area.leaves.map(leafStatus);
  if (st.includes("verified")) return "verified";
  const earlier = (area.evidence?.legacy_rounds || 0) + (area.evidence?.unattributed_rounds || 0);
  if (st.includes("activity") || earlier > 0) return "activity";
  return "untouched";
};

export const daysSince = (iso) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY)) : null);

// Status-only orb: no ring fraction, no size-by-score.
export function WebOrb({ color, status, size = 44, id }) {
  const soon = status === "soon";
  const fill = { verified: 0.8, activity: 0.32, untouched: 0.08, soon: 0 }[status];
  const stroke = { verified: 1, activity: 0.55, untouched: 0.35, soon: 0 }[status];
  const glow = { verified: 0.6, activity: 0.2, untouched: 0, soon: 0 }[status];
  return (
    <span className="relative block rounded-full" style={{ width: size, height: size }}>
      {glow > 0 && (
        <span className="absolute inset-[-40%] rounded-full blur-xl pointer-events-none"
          style={{ background: `radial-gradient(closest-side, ${color}, transparent)`, opacity: glow }} />
      )}
      <svg viewBox="0 0 56 56" className="absolute inset-0 w-full h-full">
        <defs>
          <radialGradient id={`web-${id}`} cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor={color} stopOpacity={fill} />
            <stop offset="100%" stopColor="#08060C" stopOpacity="0.9" />
          </radialGradient>
        </defs>
        <circle cx="28" cy="28" r="23" fill={soon ? "transparent" : `url(#web-${id})`}
          stroke={soon ? "rgba(239,230,213,0.3)" : color} strokeOpacity={soon ? 1 : stroke}
          strokeWidth={status === "verified" ? 2 : 1.3} strokeDasharray={soon ? "2.5 3.5" : undefined} />
      </svg>
      {soon && <span className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-foreground/30" />}
    </span>
  );
}

// ── geometry ────────────────────────────────────────────────────────────────
const polar = (deg, r) => ({ x: 50 + r * Math.cos((deg * Math.PI) / 180), y: 50 + r * Math.sin((deg * Math.PI) / 180) });

// Level 1: Language systems across the upper arc, Language use at the bottom.
function areaPoints(groups) {
  const out = [];
  groups.forEach((g, gi) => {
    const n = g.areas.length;
    const [from, to] = gi === 0 ? [-170, -10] : [125, 55];
    g.areas.forEach((a, i) => out.push({ area: a, group: g.id, ...polar(n === 1 ? (from + to) / 2 : from + ((to - from) * i) / (n - 1), 38) }));
  });
  return out;
}

// Level 2: one ring up to 7 leaves, two staggered rings beyond (Grammar = 13).
function leafPoints(leaves) {
  const n = leaves.length;
  if (n <= 7) return leaves.map((l, i) => ({ leaf: l, ...polar(-90 + (360 * i) / n, 35) }));
  const inner = Math.floor(n / 2), outer = n - inner;
  return leaves.map((l, i) => i < inner
    ? { leaf: l, ...polar(-90 + (360 * i) / inner, 25) }
    : { leaf: l, ...polar(-90 + 180 / outer + (360 * (i - inner)) / outer, 43) });
}

// Spokes start at the core's edge and stop short of each node, so lines never
// run through the labels (labels sit under the orb, so nodes above the centre
// need a longer gap than nodes beside or below it).
function trim(p, coreR, labelGap, orbGap) {
  const dx = p.x - 50, dy = p.y - 50, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const gap = p.y < 46 ? labelGap : orbGap;
  const end = Math.max(coreR + 2, len - gap);
  return { x1: 50 + ux * coreR, y1: 50 + uy * coreR, x2: 50 + ux * end, y2: 50 + uy * end };
}

function Spokes({ pts, colorOf, litOf, reduce, coreR = 13, labelGap = 15, orbGap = 6 }) {
  const d = (s) => (reduce ? 0 : s);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(239,230,213,0.05)" strokeWidth="0.3" />
      {pts.map((p, i) => {
        const lit = litOf(p);
        const l = trim(p, coreR, labelGap, orbGap);
        return (
          <motion.line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={lit ? colorOf(p) : "rgba(239,230,213,0.25)"} strokeWidth={lit ? 0.45 : 0.25}
            strokeDasharray={lit ? undefined : "0.8 1.6"}
            initial={{ pathLength: reduce ? 1 : 0, opacity: 0 }} animate={{ pathLength: 1, opacity: lit ? 0.7 : 0.45 }}
            transition={{ delay: d(0.25 + i * 0.05), duration: d(1), ease: EASE }} />
        );
      })}
    </svg>
  );
}

function Core({ children, size = "26%", onClick, label }) {
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} aria-label={label}
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: EASE }}
      style={{ x: "-50%", y: "-50%", width: size }}
      className="absolute left-1/2 top-1/2 aspect-square rounded-full flex flex-col items-center justify-center text-center border border-white/10 bg-white/[0.03] backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {children}
    </Tag>
  );
}

const Glow = () => (
  <div className="absolute inset-[18%] rounded-full pointer-events-none"
    style={{ background: "radial-gradient(closest-side, rgba(91,46,145,0.35), transparent)" }} />
);

// ── Level 1: six areas ──────────────────────────────────────────────────────
export function AreaWeb({ map, onOpen }) {
  const reduce = useReducedMotion();
  const { s, label } = useSkillMapCopy();
  const pts = areaPoints(map.groups);
  const d = (x) => (reduce ? 0 : x);
  return (
    <div className="relative w-full max-w-[420px] mx-auto">
      <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground text-center">{s("systems")}</p>
      <div className="relative w-full aspect-square">
        <Glow />
        <Spokes pts={pts} reduce={reduce} colorOf={(p) => AREA_COLOR[p.area.id]} litOf={(p) => ["verified", "activity"].includes(areaStatus(p.area))} />
        <Core>
          <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">{s("coreSub")}</span>
          <span className="mt-1 text-xs md:text-sm font-semibold text-foreground leading-tight px-2">{s("coreTitle")}</span>
        </Core>
        {pts.map((p, i) => {
          const a = p.area, st = areaStatus(a), color = AREA_COLOR[a.id] || "#9A63E0";
          return (
            <motion.button key={a.id} type="button" onClick={() => onOpen(a.id)}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }} animate={{ opacity: st === "soon" ? 0.6 : 1, scale: 1 }}
              transition={{ delay: d(0.6 + i * 0.08), duration: d(0.8), ease: EASE }}
              className="absolute flex flex-col items-center gap-1 p-1 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group w-[88px]"
              style={{ left: `${p.x}%`, top: `${p.y}%`, x: "-50%", y: "-28%" }}
              aria-label={`${label(a)}: ${st === "soon" ? s("soon") : st === "verified" ? s("st_verified") : st === "activity" ? s("st_activity") : s("notExplored")}`}>
              <span className="transition-transform duration-500 group-hover:scale-110"><WebOrb color={color} status={st} size={46} id={a.id} /></span>
              <span className="text-[11px] font-semibold text-foreground/90 leading-tight text-center">{label(a)}</span>
              <span className="text-[9.5px] leading-tight text-center" style={{ color: st === "verified" ? color : undefined }}>
                {st === "verified" ? s("st_verified") : <span className="text-muted-foreground">{st === "soon" ? s("soon") : st === "activity" ? s("st_activity") : s("notExplored")}</span>}
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="mt-2 text-[9px] uppercase tracking-[0.22em] text-muted-foreground text-center">{s("use")}</p>
    </div>
  );
}

// ── Level 2: one area's leaves ──────────────────────────────────────────────
export function LeafWeb({ area, selected, onSelect, onBack }) {
  const reduce = useReducedMotion();
  const { s, label } = useSkillMapCopy();
  const color = AREA_COLOR[area.id] || "#9A63E0";
  const pts = leafPoints(area.leaves);
  const two = area.leaves.length > 7;
  const d = (x) => (reduce ? 0 : x);
  return (
    <div className="relative w-full max-w-[420px] mx-auto aspect-square mb-10">
      <Glow />
      <Spokes pts={pts} reduce={reduce} coreR={two ? 11 : 14} labelGap={9} orbGap={4} colorOf={() => color} litOf={(p) => ["verified", "activity"].includes(leafStatus(p.leaf))} />
      <Core size={two ? "22%" : "28%"} onClick={onBack} label={s("back")}>
        <span className="text-[11px] md:text-xs font-bold leading-tight px-1.5" style={{ color }}>{label(area)}</span>
        <span className="mt-0.5 text-[8.5px] text-muted-foreground">← {s("back")}</span>
      </Core>
      {pts.map((p, i) => {
        const l = p.leaf, st = leafStatus(l), on = selected === l.id;
        return (
          <motion.button key={l.id} type="button" onClick={() => onSelect(l.id)}
            initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }} animate={{ opacity: st === "soon" ? 0.55 : 1, scale: 1 }}
            transition={{ delay: d(0.35 + i * 0.04), duration: d(0.7), ease: EASE }}
            className="absolute flex flex-col items-center gap-0.5 p-0.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group w-[74px]"
            style={{ left: `${p.x}%`, top: `${p.y}%`, x: "-50%", y: "-22%" }}
            aria-pressed={on} aria-label={label(l)}>
            <span className={`rounded-full transition-transform duration-500 group-hover:scale-110 ${on ? "ring-2 ring-offset-2 ring-offset-transparent" : ""}`}
              style={on ? { "--tw-ring-color": color } : undefined}>
              <WebOrb color={color} status={st} size={two ? 28 : 34} id={l.id.replace(/\W/g, "_")} />
            </span>
            <span className={`text-[9.5px] leading-[1.15] text-center line-clamp-2 ${on ? "text-foreground font-semibold" : "text-foreground/80"}`}>{label(l)}</span>
            {st === "verified" && <span className="text-[10px] font-bold leading-none" style={{ color }}>{l.evidence.correctness}%</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Detail for the selected leaf (below the web) ────────────────────────────
export function LeafDetail({ leaf, area }) {
  const { s, label } = useSkillMapCopy();
  const color = AREA_COLOR[area.id] || "#9A63E0";
  const earlier = (area.evidence?.legacy_rounds || 0) + (area.evidence?.unattributed_rounds || 0);
  if (!leaf) {
    return (
      <div className="text-center space-y-1">
        <p className="text-[11px] text-muted-foreground">{s("tapSkill")}</p>
        {earlier > 0 && <p className="text-[10.5px] text-muted-foreground/80">{s("earlier", { n: earlier })}</p>}
      </div>
    );
  }
  const st = leafStatus(leaf), ev = leaf.evidence;
  const days = daysSince(ev?.last_verified_at);
  return (
    <motion.div key={leaf.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
      className={`rounded-2xl px-4 py-3 border ${st === "soon" ? "border-dashed border-white/10" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="text-sm font-semibold text-foreground">{label(leaf)}</div>
      {st === "soon" && <p className="text-xs text-muted-foreground mt-1">{s("soon")}</p>}
      {st === "untouched" && <p className="text-xs text-muted-foreground mt-1">{s("notExplored")}</p>}
      {st === "activity" && (
        <>
          <p className="text-xs text-foreground/75 mt-1">{s("unverified", { n: ev.attested_rounds })}</p>
          <p className="text-[10.5px] text-muted-foreground mt-1">{s("unverifiedHint")}</p>
        </>
      )}
      {st === "verified" && (
        <>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{s("correctness")}</span>
            <span className="text-2xl font-bold leading-none" style={{ color }}>{ev.correctness}%</span>
          </div>
          <p className="text-[11px] text-foreground/75 mt-1">
            {[(() => { const n = ev.items_in_window || ev.verified_items; return !n ? null : n === 1 ? s("basedOn_one") : s("basedOn", { n }); })(), s(`conf_${ev.confidence || "low"}`)].filter(Boolean).join(" · ")}
            {days != null && <> · {days === 0 ? s("checkedToday") : s("checkedDaysAgo", { n: days })}</>}
          </p>
          {(ev.attested_rounds || 0) > 0 && <p className="text-[10.5px] text-muted-foreground mt-1">+ {s("unverified", { n: ev.attested_rounds })}</p>}
          <p className="text-[10px] text-muted-foreground/80 mt-2 leading-snug">{s("explainPct")}</p>
        </>
      )}
      {earlier > 0 && <p className="text-[10.5px] text-muted-foreground/80 mt-2">{s("earlier", { n: earlier })}</p>}
    </motion.div>
  );
}
