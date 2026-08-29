import React from "react";
import { GATES } from "@/lib/placementContent";

// Shows which gate the student is climbing and how far through its 10 items
// they are. The dots make the staircase explicit: cleared gates stay lit.
export default function GateHeader({ level, idx, total }) {
  const current = GATES.indexOf(level);
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-blue-500">Level {level}</span>
        <span className="text-xs text-muted-foreground">{idx + 1} / {total}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${(idx / total) * 100}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5">
        {GATES.map((g, i) => (
          <span
            key={g}
            className={`flex-1 h-1 rounded-full transition-colors duration-500 ${
              i < current ? "bg-emerald-500" : i === current ? "bg-blue-500" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}