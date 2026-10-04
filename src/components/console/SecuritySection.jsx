import React, { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, LogOut, KeyRound, Smartphone, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { consoleApi, setConsoleToken, errorText } from "@/lib/consoleApi";
import { QrSvg, CodeInput, ErrorLine, BackupCodes } from "./ConsoleGate";

// Security: 2FA status, sign out everywhere, new backup codes, move 2FA to a
// new phone, the admin list, and the audit log. Every action here needs the
// console token AND (for anything that changes the second factor) a fresh code.

const panel = "rounded-2xl border border-white/10 bg-[#11122A]";
const smallBtn = "flex h-9 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm hover:bg-white/5 select-none disabled:opacity-50";
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

const OUTCOME_CLS = {
  ok: "text-emerald-300 bg-emerald-500/10",
  refused: "text-amber-300 bg-amber-500/10",
  error: "text-rose-300 bg-rose-500/10",
};

// Asks for a fresh authenticator code (or backup code) before a sensitive action.
function CodePrompt({ title, allowBackup, busy, error, onSubmit, onCancel }) {
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  return (
    <div className="mt-4 rounded-xl border border-violet-400/30 bg-black/20 p-4">
      <p className="mb-3 text-sm text-white/80">{title}</p>
      <CodeInput value={code} onChange={setCode} backup={backup} disabled={busy}
        onComplete={(v) => !backup && onSubmit(backup ? { backup_code: v } : { code: v })} />
      <div className="mt-3 flex gap-2">
        <button className="h-10 flex-1 rounded-xl bg-violet-600 text-sm font-semibold hover:bg-violet-500 select-none disabled:opacity-40" disabled={busy}
          onClick={() => onSubmit(backup ? { backup_code: code } : { code })}>
          {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Continue"}
        </button>
        <button className="h-10 flex-1 rounded-xl border border-white/15 text-sm hover:bg-white/5 select-none" onClick={onCancel}>Cancel</button>
      </div>
      {allowBackup && (
        <button className="mt-3 text-xs text-violet-300 select-none" onClick={() => { setBackup(!backup); setCode(""); }}>
          {backup ? "Use the authenticator app instead" : "Phone gone? Use a backup code"}
        </button>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

function TwoFactorPanel({ info, onChanged, onSessionLost }) {
  const [mode, setMode] = useState(null); // 'codes' | 'reenrol' | 'signout'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [newCodes, setNewCodes] = useState(null);
  const [setup, setSetup] = useState(null);
  const [confirmCode, setConfirmCode] = useState("");

  const reset = () => { setMode(null); setError(null); setSetup(null); setConfirmCode(""); };

  const run = async (fn) => {
    setBusy(true); setError(null);
    try { await fn(); }
    catch (e) { if (e.isSessionError) onSessionLost(e); else setError(e); }
    finally { setBusy(false); }
  };

  if (newCodes) {
    return <BackupCodes codes={newCodes} doneLabel="Done" onDone={() => { setNewCodes(null); reset(); onChanged(); }} />;
  }

  const low = info.backup_codes_left <= 2;
  return (
    <div className={`${panel} p-5`}>
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" />
        <div className="flex-1">
          <h3 className="font-semibold">Two-factor sign-in is on</h3>
          <p className="mt-1 text-sm text-white/60">Set up {fmt(info.enrolled_at)} · last sign-in {fmt(info.last_login_at)}</p>
          <p className={`mt-1 text-sm ${low ? "text-amber-300" : "text-white/60"}`}>
            {info.backup_codes_left} backup code{info.backup_codes_left === 1 ? "" : "s"} left{low ? ". Make new ones." : ""}
          </p>
        </div>
      </div>

      {!mode && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={smallBtn} onClick={() => setMode("codes")}><KeyRound className="h-4 w-4" /> New backup codes</button>
          <button className={smallBtn} onClick={() => setMode("reenrol")}><Smartphone className="h-4 w-4" /> Move to a new phone</button>
          <button className={`${smallBtn} border-rose-400/30 text-rose-200`} onClick={() => setMode("signout")}><LogOut className="h-4 w-4" /> Sign out everywhere</button>
        </div>
      )}

      {mode === "codes" && (
        <CodePrompt title="Enter a code from your authenticator app. Your old backup codes stop working." busy={busy} error={error} onCancel={reset}
          onSubmit={(f) => run(async () => { const r = await consoleApi("regenerateBackupCodes", f); setNewCodes(r.backup_codes); })} />
      )}

      {mode === "reenrol" && !setup && (
        <CodePrompt title="Confirm it's you with your current code (or a backup code if the old phone is gone)." allowBackup busy={busy} error={error} onCancel={reset}
          onSubmit={(f) => run(async () => { setSetup(await consoleApi("reenrollStart", f)); })} />
      )}

      {mode === "reenrol" && setup && (
        <div className="mt-4 rounded-xl border border-violet-400/30 bg-black/20 p-4">
          <p className="mb-3 text-sm text-white/80">Scan this with the app on your new phone, then enter the code it shows. Until you confirm, the old phone keeps working.</p>
          <div className="flex justify-center"><QrSvg value={setup.otpauth_uri} /></div>
          <p className="mt-2 break-all text-center font-mono text-xs text-white/50">{setup.secret.match(/.{1,4}/g)?.join(" ")}</p>
          <div className="mt-3"><CodeInput value={confirmCode} onChange={setConfirmCode} disabled={busy}
            onComplete={(v) => run(async () => {
              const r = await consoleApi("reenrollConfirm", { code: v });
              setConsoleToken(r.token);
              setSetup(null);
              setNewCodes(r.backup_codes);
            })} /></div>
          <button className="mt-3 h-10 w-full rounded-xl border border-white/15 text-sm hover:bg-white/5 select-none" onClick={reset}>Cancel</button>
          <ErrorLine error={error} />
        </div>
      )}

      {mode === "signout" && (
        <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/5 p-4">
          <p className="text-sm text-white/80">This ends every console session, including this one. Your VIRORA login stays signed in; you'll just need a new code.</p>
          <div className="mt-3 flex gap-2">
            <button className="h-10 flex-1 rounded-xl bg-rose-600 text-sm font-semibold hover:bg-rose-500 select-none disabled:opacity-40" disabled={busy}
              onClick={() => run(async () => { await consoleApi("signOutAll"); setConsoleToken(""); onSessionLost({ code: "token_revoked" }); })}>
              {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Sign out everywhere"}
            </button>
            <button className="h-10 flex-1 rounded-xl border border-white/15 text-sm hover:bg-white/5 select-none" onClick={reset}>Cancel</button>
          </div>
          <ErrorLine error={error} />
        </div>
      )}
    </div>
  );
}

function AuditLog({ onSessionLost }) {
  const [rows, setRows] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (skip = 0) => {
    setLoading(true); setError(null);
    try {
      const r = await consoleApi("auditList", { limit: 50, skip, ...(filter !== "all" ? { outcome: filter } : {}) });
      setRows((prev) => (skip ? [...prev, ...r.rows] : r.rows));
      setHasMore(r.has_more);
    } catch (e) { if (e.isSessionError) onSessionLost(e); else setError(e); }
    finally { setLoading(false); }
  }, [filter, onSessionLost]);

  useEffect(() => { load(0); }, [load]);

  return (
    <div className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <h3 className="font-semibold">Audit log</h3>
        <div className="flex items-center gap-2">
          {["all", "ok", "refused", "error"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-2 py-1 text-xs select-none ${filter === f ? "bg-violet-600 text-white" : "text-white/60 hover:bg-white/5"}`}>{f}</button>
          ))}
          <button onClick={() => load(0)} className="rounded-lg p-1 text-white/60 hover:bg-white/5" aria-label="Refresh"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>
      {error && <p className="px-4 py-3 text-sm text-rose-300">{errorText(error)}</p>}
      <div className="max-h-[480px] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#11122A] text-xs uppercase tracking-wider text-white/40">
            <tr><th className="px-4 py-2">When</th><th className="px-2 py-2">Who</th><th className="px-2 py-2">Action</th><th className="px-2 py-2">Result</th><th className="hidden px-2 py-2 md:table-cell">Details</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5 align-top">
                <td className="whitespace-nowrap px-4 py-2 text-white/60">{fmt(r.ts)}</td>
                <td className="max-w-[140px] truncate px-2 py-2 text-white/70">{r.actor_email}</td>
                <td className="px-2 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-2 py-2"><span className={`rounded-md px-1.5 py-0.5 text-xs ${OUTCOME_CLS[r.outcome] || ""}`}>{r.outcome}{r.reason ? ` · ${r.reason}` : ""}</span></td>
                <td className="hidden px-2 py-2 text-white/60 md:table-cell">{r.details}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-white/40">Nothing yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="border-t border-white/10 p-3 text-center">
          <button className={smallBtn + " mx-auto"} disabled={loading} onClick={() => load(rows.length)}>Load more</button>
        </div>
      )}
    </div>
  );
}

export default function SecuritySection({ onSessionLost }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { setInfo(await consoleApi("security")); }
    catch (e) { if (e.isSessionError) onSessionLost(e); else setError(e); }
  }, [onSessionLost]);

  useEffect(() => { load(); }, [load]);

  if (!info) {
    return <div className="flex h-64 items-center justify-center">{error ? <p className="text-sm text-rose-300">{errorText(error)}</p> : <Loader2 className="h-6 w-6 animate-spin text-violet-300" />}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Security</h2>
      <TwoFactorPanel info={info} onChanged={load} onSessionLost={onSessionLost} />

      <div className={panel}>
        <div className="border-b border-white/10 px-4 py-3"><h3 className="font-semibold">Admin accounts</h3></div>
        <ul>
          {info.admins.map((a) => (
            <li key={a.id} className="flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0">
              {a.console_access ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <XCircle className="h-4 w-4 text-white/30" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.name}{a.is_you ? " (you)" : ""}</p>
                <p className="truncate text-xs text-white/50">{a.email}</p>
              </div>
              <span className="text-xs text-white/50">{a.console_access ? "Console access" : "No console access"}</span>
            </li>
          ))}
        </ul>
        {info.admins.some((a) => !a.console_access) && (
          <p className="flex gap-2 border-t border-white/10 px-4 py-3 text-xs text-amber-200/80">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Accounts without console access still have the admin role, so they can still open the older admin pages and change data directly until the lock-down phase (and VT-33).
          </p>
        )}
      </div>

      <AuditLog onSessionLost={onSessionLost} />
    </div>
  );
}
