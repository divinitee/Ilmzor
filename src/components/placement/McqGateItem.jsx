import React from "react";

// One multiple-choice item (A1 / A2 gates) — answer-key scored, no grading
// round-trip, so selecting an option advances immediately.
export default function McqGateItem({ item, onSelect }) {
  return (
    <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
      <div className="bg-card border border-border rounded-2xl p-5 mb-5">
        <p className="text-base text-foreground leading-relaxed">{item.question}</p>
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {item.options.map((opt, i) => (
          <button
            key={opt}
            onClick={() => onSelect(i)}
            className="px-4 py-3.5 rounded-xl border-2 border-border bg-card text-foreground text-sm font-medium text-left hover:border-blue-400 hover:bg-blue-500/5 transition-all select-none"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}