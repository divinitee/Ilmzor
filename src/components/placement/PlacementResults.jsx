import React from "react";
import { Link } from "react-router-dom";
import { Trophy, Sparkles } from "lucide-react";
import { STARTER_LEVEL } from "@/lib/placementContent";

export default function PlacementResults({ level, weakAreas }) {
  const isStarter = level === STARTER_LEVEL;
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/15 flex items-center justify-center mb-5">
          <Trophy className="w-10 h-10 text-blue-500" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">Your placement</p>
        <h2 className="text-3xl font-bold text-foreground mb-2">{level}</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {isStarter
            ? "We'll start you from the very beginning and build up from the basics."
            : `You cleared every gate up to ${level}. That's where your learning path begins.`}
        </p>

        {weakAreas.length > 0 && (
          <div className="text-left bg-card border border-border rounded-2xl p-4 mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Areas to focus on</p>
            <div className="space-y-2.5">
              {weakAreas.map((w, i) => (
                <div key={i} className="text-sm">
                  <span className="font-semibold text-foreground">{w.label}</span>
                  <span className="text-muted-foreground"> — {w.tip || w.diagnosis}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link to="/" className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white font-semibold shadow-lg select-none">
          <Sparkles className="w-4 h-4" /> Continue to Skill Hub
        </Link>
      </div>
    </div>
  );
}