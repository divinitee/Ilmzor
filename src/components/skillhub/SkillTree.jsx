import React, { useEffect, useRef } from "react";
import { TREE_POINTS as T, TREE_SEGMENTS, TREE_JOINTS, TREE_ROUTES, taperPath } from "@/lib/skillTreeData";
import { RM } from "@/components/skillhub/StagePrimitives";

/* The Skill Hub overview tree (2026-09-16).

   Purely decorative: this renders the tree the six skill nodes sit on, plus
   the hover pathway glow. It never takes pointer events — the real buttons
   are the SkillNodes that SkillStage positions on top of it, from the same
   TREE_POINTS table this is drawn from. Nothing here reads learner data;
   the tree is fixed structure, not a recommendation.

   The glow is the part with rules attached to it:
   - one continuous path per root->leaf route, so the reveal sweeps the whole
     way in one motion (chained per-branch segments read as blocky/stepped);
   - it always runs root outward, including when a leaf is what's hovered;
   - once a route lands it stops redrawing and only breathes its brightness,
     symmetrically, so the loop has no seam and the line never blanks out;
   - letting go never stops the light dead. The sweep keeps travelling while
     its brightness fades, so the glow leaves the way it arrived.

   The motion is driven from here with the Web Animations API rather than
   from CSS classes. That last rule is why: fading a line's brightness WHILE
   its sweep continues from wherever it had reached is not something a class
   toggle can express. The CSS version snapped the line to full length the
   instant the pointer left, then faded the finished line — measurably (a
   sweep 57% drawn jumped straight to 100%), and visibly as a flash of the
   rest of the branch. Restarting every lit route together, rather than
   leaving routes shared with the previous hover already-lit while their
   siblings sweep in, needs the same explicit control.

   index.css keeps only the resting appearance of these paths. */

const CORE = { peak: 0.62, dim: 0.24 };
const HALO = { peak: 0.26, dim: 0.09 };
const SWEEP_EASE = "cubic-bezier(.32,.06,.24,1)";
const BREATHE_MS = 3200;
const RELEASE_MS = 520;

const rnd = (seed) => { const x = Math.sin(seed * 999) * 10000; return x - Math.floor(x); };
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

// Blurred canopy masses behind the branches. Kept clear of where the leaf
// skill nodes sit so they read as foliage rather than a haze under a button.
const FOLIAGE = [
  { x: 33, y: 17, r: 15, c: "#5A3E8C", o: 0.46 },
  { x: 67, y: 16, r: 14, c: "#4E3480", o: 0.42 },
  { x: 50, y: 11, r: 12, c: "#8A66C4", o: 0.4 },
  { x: 19, y: 43, r: 9, c: "#6B4A9E", o: 0.36 },
  { x: 81, y: 43, r: 9, c: "#6B4A9E", o: 0.36 },
  { x: 50, y: 29, r: 13, c: "#A387D6", o: 0.28 },
];

// Crystal shards sit ALONG the twigs and in the notch between the two roots
// — not on the branch tips themselves, which are covered by the skill node
// boxes. Deterministic placement (no Math.random) so they never shuffle
// between renders or reloads.
const SHARD_HUES = ["#8A6BD6", "#A98CE0", "#6B4FA6", "#C7B2EE"];
const SHARD_ANCHORS = [
  ...[["boughL", "listening"], ["boughL", "reading"], ["boughR", "writing"], ["boughR", "speaking"]]
    .flatMap(([b, l]) => [0.42, 0.62, 0.82].map((t) => lerp(T[b], T[l], t))),
  T.boughL, T.boughR,
  { x: 47, y: 79 }, { x: 53, y: 80 }, { x: 50, y: 84 },
];
const SHARDS = SHARD_ANCHORS.map((p, i) => {
  const s = i * 7 + 1;
  const ang = rnd(s) * Math.PI * 2;
  const dist = 1.4 + rnd(s + 2) * 2.4;
  return {
    x: p.x + Math.cos(ang) * dist,
    y: p.y + Math.sin(ang) * dist,
    size: 1.7 + rnd(s + 5) * 1.6,
    rot: rnd(s + 7) * 360,
    hue: SHARD_HUES[i % SHARD_HUES.length],
    gd: `${(2.6 + rnd(s + 9) * 2.4).toFixed(2)}s`,
    go: `${(rnd(s + 11) * -4).toFixed(2)}s`,
  };
});

// Drifting motes in the open air between the branches.
const FIREFLIES = [[50, 7], [38, 24], [62, 24], [50, 34], [11, 30], [89, 30], [31, 60], [69, 60], [50, 62], [21, 68], [79, 68]]
  .map(([x, y], i) => ({
    x, y,
    r: 0.45 + rnd(i) * 0.6,
    fd: `${(5 + rnd(i + 1) * 3.5).toFixed(2)}s`,
    fo: `${(rnd(i + 21) * -6).toFixed(2)}s`,
    dx: `${((rnd(i + 31) - 0.5) * 3).toFixed(2)}px`,
    dy: `${((rnd(i + 41) - 0.5) * 3).toFixed(2)}px`,
    td: `${(3.5 + rnd(i + 51) * 2.5).toFixed(2)}s`,
    to: `${(rnd(i + 61) * -5).toFixed(2)}s`,
  }));

function Shard({ s }) {
  const d = `M 0 ${-s.size} L ${s.size * 0.62} 0 L 0 ${s.size} L ${-s.size * 0.62} 0 Z`;
  const hl = `M 0 ${-s.size} L ${s.size * 0.62} 0 L 0 ${-s.size * 0.25} Z`;
  return (
    <g transform={`translate(${s.x} ${s.y}) rotate(${s.rot})`}>
      <path d={d} fill={s.hue} opacity="0.9" />
      <path d={hl} fill="#F3EAFB" opacity="0.55" className="vt-glisten"
        style={{ "--vt-gd": s.gd, "--vt-go": s.go }} />
    </g>
  );
}

const LAYERS = [["core", CORE], ["halo", HALO]];

export default function SkillTree({ activeKey }) {
  const paths = useRef({});      // "core:route-id" -> <path>
  const activeRef = useRef(new Set());

  useEffect(() => {
    // Hovering a root sends its glow to all four leaves; hovering a leaf
    // lights the one path back to it from both roots. Either way the paths
    // are authored root -> leaf, so the sweep direction is fixed by the
    // geometry and cannot run backwards.
    const active = new Set(
      activeKey ? TREE_ROUTES.filter((r) => r.root === activeKey || r.leaf === activeKey).map((r) => r.id) : []
    );
    activeRef.current = active;

    // Read every brightness we need before writing any, so releasing a
    // handful of routes doesn't interleave style reads and writes.
    const releasing = [];
    TREE_ROUTES.forEach((r) => {
      if (active.has(r.id)) return;
      LAYERS.forEach(([kind]) => {
        const el = paths.current[`${kind}:${r.id}`];
        if (el && el.getAnimations().length) releasing.push({ el, id: r.id, from: getComputedStyle(el).opacity });
      });
    });

    TREE_ROUTES.forEach((r) => {
      if (!active.has(r.id)) return;
      LAYERS.forEach(([kind, tone]) => {
        const el = paths.current[`${kind}:${r.id}`];
        if (!el) return;

        el.getAnimations().forEach((a) => a.cancel());

        if (RM) { el.style.opacity = String(tone.peak); return; }

        // Every lit route restarts together, so a route carried over from
        // the previous hover sweeps again with its siblings instead of
        // sitting already-lit beside them.
        const sweep = el.animate(
          [
            { strokeDashoffset: "1px", opacity: 0, offset: 0 },
            { opacity: tone.peak, offset: 0.09 },
            { strokeDashoffset: "0px", opacity: tone.peak, offset: 1 },
          ],
          { duration: r.dur * 1000, easing: SWEEP_EASE, fill: "forwards" }
        );
        // Breathing starts the instant the sweep lands, from the brightness
        // the sweep ended on, and only ever moves brightness — so the loop
        // has no seam and the drawn line is never redrawn.
        sweep.finished.then(() => {
          if (!activeRef.current.has(r.id)) return;
          el.animate(
            [{ opacity: tone.peak }, { opacity: tone.dim }, { opacity: tone.peak }],
            { duration: BREATHE_MS, easing: "ease-in-out", iterations: Infinity }
          );
        }).catch(() => { /* cancelled by a newer hover — expected */ });
      });
    });

    releasing.forEach(({ el, id, from }) => {
      if (RM) { el.getAnimations().forEach((a) => a.cancel()); el.style.opacity = "0"; return; }
      // Fade the brightness only. The sweep underneath keeps running, so a
      // half-drawn line carries on to the end as it dims instead of
      // snapping to full length. Created after the sweep, so it takes over
      // opacity while leaving stroke-dashoffset to it.
      const fade = el.animate([{ opacity: from }, { opacity: 0 }],
        { duration: RELEASE_MS, easing: "ease-out", fill: "forwards" });
      fade.finished.then(() => {
        if (activeRef.current.has(id)) return;   // re-lit mid-fade; leave it alone
        el.getAnimations().forEach((a) => a.cancel());
      }).catch(() => { /* superseded */ });
    });
  }, [activeKey]);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="vtTrunk" x1="0" y1="100" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3A2158" />
          <stop offset="0.6" stopColor="#6B4A9E" />
          <stop offset="1" stopColor="#9E7FCB" />
        </linearGradient>
        <linearGradient id="vtVein" x1="0" y1="100" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#B08D57" stopOpacity="0" />
          <stop offset="0.5" stopColor="#E8C892" stopOpacity="0.62" />
          <stop offset="1" stopColor="#E8C892" stopOpacity="0.1" />
        </linearGradient>
        <filter id="vtSoft" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4.2" />
        </filter>
        <filter id="vtEdge" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
        {/* one filter over the whole halo layer rather than per-path: cheaper,
            and overlapping routes bloom together instead of stacking edges */}
        <filter id="vtHalo" filterUnits="userSpaceOnUse" x="-25" y="-25" width="150" height="150">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
      </defs>

      {/* canopy */}
      <g filter="url(#vtSoft)">
        {FOLIAGE.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={b.c} opacity={b.o} />)}
      </g>

      {/* trunk, boughs, twigs */}
      <g filter="url(#vtEdge)">
        {TREE_SEGMENTS.map((seg, i) => <path key={i} d={taperPath(seg)} fill="url(#vtTrunk)" />)}
        {TREE_JOINTS.map((j, i) => <circle key={i} cx={j.p.x} cy={j.p.y} r={j.r * 0.62} fill="url(#vtTrunk)" />)}
      </g>

      {/* One ambient bronze vein, up the trunk only. There were three — the
          two out along the boughs read as stray diagonals whenever those
          boughs weren't lit, because nothing thick sat under them. On the
          trunk it reads as a vein inside the wood, which is the point. */}
      <line x1={T.merge.x} y1={T.merge.y} x2={T.fork.x} y2={T.fork.y} stroke="url(#vtVein)" strokeWidth="0.9" strokeLinecap="round" />

      {/* warm glow at the base */}
      <ellipse cx="50" cy="88" rx="24" ry="5" fill="#E8C892" opacity="0.18" filter="url(#vtSoft)" />

      {/* pathway glow: soft bloom layer, then the crisp core on top */}
      <g filter="url(#vtHalo)">
        {TREE_ROUTES.map((r) => (
          <path key={r.id} d={r.d} pathLength="1" className="vt-route vt-halo"
            ref={(el) => { paths.current[`halo:${r.id}`] = el; }} />
        ))}
      </g>
      {TREE_ROUTES.map((r) => (
        <path key={r.id} d={r.d} pathLength="1" className="vt-route vt-core"
          ref={(el) => { paths.current[`core:${r.id}`] = el; }} />
      ))}

      {/* crystal growths */}
      {SHARDS.map((s, i) => <Shard key={i} s={s} />)}

      {/* drifting motes */}
      {FIREFLIES.map((f, i) => (
        <g key={i} className="vt-firefly" style={{ "--vt-fd": f.fd, "--vt-fo": f.fo, "--vt-dx": f.dx, "--vt-dy": f.dy }}>
          <circle cx={f.x} cy={f.y} r={f.r * 1.8} fill="#E8C892" opacity="0.14" filter="url(#vtSoft)" />
          <circle cx={f.x} cy={f.y} r={f.r} fill="#FBEFD8" opacity="0.6" className="vt-spark"
            style={{ "--vt-td": f.td, "--vt-to": f.to }} />
        </g>
      ))}
    </svg>
  );
}
