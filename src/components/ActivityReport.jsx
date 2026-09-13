import React from "react";
import { Clock3, ListChecks, Timer } from "lucide-react";

const formatDuration = (seconds = 0) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60 ? `${minutes % 60}m` : ""}`.trim();
};

const formatWhen = (date) => date ? new Date(date).toLocaleString() : "—";

export default function ActivityReport({ sessions = [], compact = false }) {
  const totalSeconds = sessions.reduce((sum, item) => sum + (item.duration_seconds || 0), 0);
  const today = new Date().toDateString();
  const todaySeconds = sessions
    .filter((item) => item.ended_at && new Date(item.ended_at).toDateString() === today)
    .reduce((sum, item) => sum + (item.duration_seconds || 0), 0);

  return (
    <div className={compact ? "" : "bg-background border border-border rounded-2xl p-5"}>
      <div className="grid grid-cols-3 gap-2 mb-5">
        <Stat icon={Clock3} label="Total time" value={formatDuration(totalSeconds)} />
        <Stat icon={Timer} label="Today" value={formatDuration(todaySeconds)} />
        <Stat icon={ListChecks} label="Sessions" value={sessions.length} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent activity</p>
        {sessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No tracked study activity yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.activity_label || "Learning activity"}</p>
                  <p className="truncate text-xs text-muted-foreground" title={item.route}>{formatWhen(item.ended_at)}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-primary">{formatDuration(item.duration_seconds)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
