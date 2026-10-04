import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw, UserPlus, Hourglass, QrCode, GraduationCap, Users, Wallet, ArrowRight } from "lucide-react";
import { consoleApi, errorText } from "@/lib/consoleApi";

// Overview: the counters and everything waiting on Tee. Read-only: loading
// this page never writes anything (the old /admin deleted duplicate rows on
// load; the console must not).

const fmtUzs = (n) => `${Number(n || 0).toLocaleString("en-US")} so'm`;
const ago = (iso) => {
  if (!iso) return "";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} days ago`;
};

function Tile({ icon: Icon, label, value, note, accent = "text-white", highlight = false }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "border-amber-400/40 bg-amber-400/5" : "border-white/10 bg-[#11122A]"}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/50">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
      {note && <div className="mt-1 text-xs text-white/50">{note}</div>}
    </div>
  );
}

export default function OverviewSection({ onSessionLost }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await consoleApi("overview")); }
    catch (e) { if (e.isSessionError) onSessionLost(e); else setError(e); }
    finally { setLoading(false); }
  }, [onSessionLost]);

  useEffect(() => { load(); }, [load]);

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        {error ? <p className="text-sm text-rose-300">{errorText(error)}</p> : <Loader2 className="h-6 w-6 animate-spin text-violet-300" />}
      </div>
    );
  }

  const c = data.counters;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Overview</h2>
          <p className="text-xs text-white/50">As of {new Date(data.as_of).toLocaleString()}</p>
        </div>
        <button onClick={load} disabled={loading} className="flex h-9 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm hover:bg-white/5 select-none disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile icon={QrCode} label="Pending QR payments" value={c.pending_qr_payments} highlight={c.pending_qr_payments > 0} accent={c.pending_qr_payments ? "text-amber-300" : "text-white"} />
        <Tile icon={GraduationCap} label="Teacher applications" value={c.pending_teacher_applications} highlight={c.pending_teacher_applications > 0} accent={c.pending_teacher_applications ? "text-amber-300" : "text-white"} />
        <Tile icon={Users} label="Paying students" value={c.paying_students} note={c.lapsed_not_refreshed ? `+${c.lapsed_not_refreshed} past their end date (not counted)` : "Trials and free plans not counted"} accent="text-[#E9D29A]" />
        <Tile icon={UserPlus} label="New signups (7 days)" value={c.signups_7d} />
        <Tile icon={Hourglass} label="Trials ending ≤ 48 h" value={c.trials_ending_48h} accent="text-sky-300" />
        <Tile icon={Wallet} label={`Revenue ${data.month}`} value={fmtUzs(c.revenue_month_qr_uzs)} note={c.revenue_month_card_usd === null ? "QR only. Card payments aren't recorded one by one yet (Payments phase)." : `Card: $${c.revenue_month_card_usd}`} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#11122A]">
        <div className="border-b border-white/10 px-4 py-3">
          <h3 className="font-semibold">Needs you</h3>
        </div>
        {data.needs_you.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-white/50">Nothing waiting on you.</p>
        ) : (
          <ul>
            {data.needs_you.map((n) => (
              <li key={`${n.kind}-${n.id}`} className="flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.kind === "qr_payment" ? "bg-amber-400/15 text-amber-300" : "bg-violet-500/15 text-violet-300"}`}>
                  {n.kind === "qr_payment" ? <QrCode className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="truncate text-xs text-white/50">{n.sub}{n.since ? ` · ${ago(n.since)}` : ""}</p>
                </div>
                {/* Until P2/P3 move these actions into the console, jump to the existing page. */}
                <Link to={n.link} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-violet-300 hover:bg-white/5 select-none">
                  Open <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
