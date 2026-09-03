import React from "react";
import { motion } from "framer-motion";
import { useAppLang } from "@/hooks/useAppLang";

// Animated radar/"web" chart of the 5 Skill Hub skills — replaces the old
// static bar-row hero. `rows` is always all 5 SKILLS from gameSkills.js,
// zero-filled for anything never played (see getRemoteSkillProgress).

const SKILL_LABEL_KEY = {
  vocabulary: "skillVocabulary",
  grammar: "skillGrammar",
  spelling: "skillSpelling",
  comprehension: "skillComprehension",
  creativity: "skillCreativity",
};

const SIZE = 232;
const CENTER = SIZE / 2;
const RADIUS = 78;
const LABEL_RADIUS = RADIUS + 30;
const RINGS = [0.34, 0.67, 1];
// Floor so a 0% skill still shows a faint point on the web instead of
// collapsing invisibly into the center.
const MIN_FRAC = 0.05;

function axisPoint(i, n, frac) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [CENTER + RADIUS * frac * Math.cos(angle), CENTER + RADIUS * frac * Math.sin(angle)];
}

export default function SkillWeb({ rows }) {
  const { t } = useAppLang();
  const n = rows.length;

  const ringPolys = RINGS.map((frac) => rows.map((_, i) => axisPoint(i, n, frac).join(",")).join(" "));
  const axisEnds = rows.map((_, i) => axisPoint(i, n, 1));
  const dataPts = rows.map((r, i) => axisPoint(i, n, Math.max(MIN_FRAC, (r.best || 0) / 100)));
  const dataPolyPoints = dataPts.map((p) => p.join(",")).join(" ");

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 overflow-visible">
        <defs>
          <radialGradient id="skillWebFill" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.08" />
          </radialGradient>
        </defs>

        {ringPolys.map((points, ri) => (
          <motion.polygon
            key={ri}
            points={points}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={1}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: ri * 0.07, duration: 0.5, ease: "easeOut" }}
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          />
        ))}

        {axisEnds.map(([x, y], i) => (
          <motion.line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.03 }}
          />
        ))}

        <motion.polygon
          points={dataPolyPoints}
          fill="url(#skillWebFill)"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinejoin="round"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.05, 1], opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
        />

        {dataPts.map(([x, y], i) => (
          <motion.circle
            key={rows[i].key}
            cx={x}
            cy={y}
            r={4}
            fill={rows[i].color}
            stroke="rgba(10,14,26,0.6)"
            strokeWidth={1.5}
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.4, 1] }}
            transition={{
              delay: 1 + i * 0.18,
              duration: 2.4,
              repeat: Infinity,
              repeatDelay: 1.4,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          />
        ))}
      </svg>

      {rows.map((r, i) => {
        const [lx, ly] = axisPoint(i, n, LABEL_RADIUS / RADIUS);
        const pct = Math.round(r.best || 0);
        return (
          <motion.div
            key={r.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 + i * 0.06 }}
            className="absolute flex flex-col items-center text-center pointer-events-none"
            style={{ left: lx, top: ly, transform: "translate(-50%, -50%)", width: 58 }}
          >
            <span className="text-sm leading-none" aria-hidden="true">{r.emoji}</span>
            <span className="text-[10px] font-medium text-foreground/80 leading-tight mt-0.5 truncate w-full">
              {t(`dashboard.${SKILL_LABEL_KEY[r.key]}`)}
            </span>
            <span className="text-[10px] font-bold leading-tight" style={{ color: r.color }}>{pct}%</span>
          </motion.div>
        );
      })}
    </div>
  );
}
