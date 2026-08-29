import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

// Admin-only, one-time utility. Not linked in nav. Visit /admin-wipe-users
// directly while logged in as an admin. Factory-resets every registered
// user's data before the mandatory placement gate goes live, so no one is
// stuck in a broken half-registered state from before the gate existed.
//
// Deletes rows from every user-data entity. Does NOT touch VocabularyWord
// (admin-managed content, not user data). Whether User (auth) records
// themselves can be deleted this way is untested — if any remain after
// running this, they likely need Base44's own Users tab, not this tool.

const TARGET_ENTITIES = [
  "StudentSubscription", "UserCoins", "AssessmentResult",
  "QuizResult", "ChatMessage", "AiUsageLog", "TeacherReferral", "User",
];

const CONFIRM_PHRASE = "DELETE ALL USERS";

export default function AdminWipeUsers() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [counts, setCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (me) => {
      setIsAdmin(me?.role === "admin");
      if (me?.role !== "admin") return;
      const results = {};
      for (const name of TARGET_ENTITIES) {
        try {
          const rows = await base44.entities[name].list();
          results[name] = rows.length;
        } catch (e) {
          results[name] = `error: ${e.message}`;
        }
      }
      setCounts(results);
      setLoadingCounts(false);
    }).catch(() => setIsAdmin(false));
  }, []);

  const runWipe = async () => {
    setRunning(true);
    const newLog = [];
    for (const name of TARGET_ENTITIES) {
      try {
        let rows = await base44.entities[name].list();
        let deleted = 0;
        while (rows.length > 0) {
          for (const row of rows) {
            await base44.entities[name].delete(row.id);
            deleted += 1;
          }
          rows = await base44.entities[name].list();
        }
        newLog.push({ name, status: "ok", deleted });
      } catch (e) {
        newLog.push({ name, status: "error", message: e.message });
      }
      setLog([...newLog]);
    }
    setRunning(false);
    setDone(true);
  };

  if (isAdmin === null || (isAdmin && loadingCounts)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-rose-500" />
        <h1 className="text-xl font-bold text-foreground">Factory-reset all users</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Irreversible. Deletes every row below across all registered users. There is no undo.
      </p>

      <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-1.5">
        {TARGET_ENTITIES.map((name) => (
          <div key={name} className="flex justify-between text-sm">
            <span className="text-foreground">{name}</span>
            <span className="text-muted-foreground font-mono">{String(counts[name])}</span>
          </div>
        ))}
      </div>

      {!done ? (
        <>
          <p className="text-xs text-muted-foreground mb-2">
            Type <span className="font-mono font-bold text-foreground">{CONFIRM_PHRASE}</span> to confirm.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-card text-foreground mb-4"
            placeholder={CONFIRM_PHRASE}
            disabled={running}
          />
          <button
            onClick={runWipe}
            disabled={confirmText !== CONFIRM_PHRASE || running}
            className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 select-none"
          >
            {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : "Delete everything, permanently"}
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm text-emerald-500 font-semibold mb-2">
          <CheckCircle2 className="w-4 h-4" /> Done
        </div>
      )}

      {log.length > 0 && (
        <div className="mt-4 space-y-1 text-xs font-mono">
          {log.map((l) => (
            <div key={l.name} className={l.status === "ok" ? "text-muted-foreground" : "text-rose-500"}>
              {l.name}: {l.status === "ok" ? `${l.deleted} deleted` : l.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
