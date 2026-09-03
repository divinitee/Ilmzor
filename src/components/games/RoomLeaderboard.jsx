import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trophy, Zap, Crown } from "lucide-react";
import { motion } from "framer-motion";

export default function RoomLeaderboard({ user }) {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const roomCode = user?.classroom_code;

  useEffect(() => {
    if (!roomCode) { setLoading(false); return; }
    base44.entities.UserCoins.filter({ classroom_code: roomCode }, "-coins", 20)
      .then(setBoard)
      .finally(() => setLoading(false));
  }, [roomCode]);

  if (!roomCode) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-foreground">Sinf reytingi</h3>
        <span className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-mono font-semibold">{roomCode}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><div className="w-6 h-6 border-3 border-muted border-t-amber-500 rounded-full animate-spin" /></div>
      ) : board.length === 0 ? (
        <div className="bg-muted/40 rounded-2xl p-5 text-center">
          <p className="text-sm text-muted-foreground">Hali hech kim o'ynamagan. Birinchi bo'ling! 🎮</p>
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
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 ${isMe ? "bg-primary/5" : ""}`}
              >
                <span className="text-base w-7 text-center flex-shrink-0">{medal}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                    {entry.user_name || entry.email?.split("@")[0]}
                    {isMe && <span className="ml-1 text-xs font-normal text-muted-foreground">(siz)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{entry.total_correct || 0} to'g'ri javob</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-sm font-bold text-amber-600">{entry.coins}</span>
                  <span className="text-base">⚡</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}