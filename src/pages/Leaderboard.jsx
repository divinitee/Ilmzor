import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { motion } from "framer-motion";

export default function Leaderboard() {
  const [user, setUser] = useState(null);
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      base44.entities.UserCoins.list("-coins", 100),
    ]).then(([me, list]) => {
      setUser(me);
      setBoard(list);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b border-border px-4 pb-3 flex items-center gap-3 safe-header sticky top-0 z-30">
        <Link to="/" className="text-muted-foreground hover:text-foreground p-1.5 select-none">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2 select-none">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-foreground">Reyting jadvali</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : board.length === 0 ? (
          <div className="bg-background border border-border rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">Hali hech kim tanga yig'magan. Birinchi bo'ling! 🎮</p>
          </div>
        ) : (
          <div className="bg-background border border-border rounded-2xl overflow-hidden">
            {board.map((entry, i) => {
              const isMe = entry.email === user?.email;
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.6) }}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 ${isMe ? "bg-primary/5" : ""}`}
                >
                  <span className="text-base w-8 text-center flex-shrink-0">{medal}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                      {entry.user_name || entry.email?.split("@")[0]}
                      {isMe && <span className="ml-1 text-xs font-normal text-muted-foreground">(siz)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.total_correct || 0} to'g'ri javob</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-sm font-bold text-amber-600">{entry.coins || 0}</span>
                    <span className="text-base">🪙</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}