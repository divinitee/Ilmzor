import React, { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck, KeyRound, Smartphone, Lock, AlertTriangle, Copy, Check, Download } from "lucide-react";
import { qrMatrix } from "@/lib/qrArt";
import { consoleApi, setConsoleToken, errorText } from "@/lib/consoleApi";

// Step 2 of console sign-in (step 1 is the normal VIRORA login): set up an
// authenticator app the first time, then a 6-digit code every time.
//
// The TOTP secret only ever exists in this component's state during setup.
// It is never written to storage, the URL or the console log, and the server
// will not show it again once setup is confirmed.

const card = "w-full max-w-md rounded-2xl border border-white/10 bg-[#11122A] p-6 shadow-2xl";
const btn = "w-full h-11 rounded-xl bg-violet-600 font-semibold text-white select-none transition-colors hover:bg-violet-500 disabled:opacity-40";
const linkBtn = "text-sm text-violet-300 hover:text-violet-200 select-none";

export function Shell({ children }) {
  return <div className="flex min-h-screen items-center justify-center bg-[#0B0C1E] px-4 py-10 text-white">{children}</div>;
}

function Header({ icon: Icon = ShieldCheck, title, sub }) {
  return (
    <div className="mb-5 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15">
        <Icon className="h-6 w-6 text-violet-300" />
      </div>
      <h1 className="text-lg font-bold">{title}</h1>
      {sub && <p className="mt-1 text-sm text-white/60">{sub}</p>}
    </div>
  );
}

function QrSvg({ value }) {
  const m = qrMatrix(value);
  const n = m.length;
  const q = 4; // quiet zone
  const rects = [];
  m.forEach((row, r) => row.forEach((dark, c) => { if (dark) rects.push(<rect key={`${r}-${c}`} x={c + q} y={r + q} width="1" height="1" />); }));
  return (
    <svg viewBox={`0 0 ${n + 2 * q} ${n + 2 * q}`} className="h-56 w-56 rounded-xl bg-white" shapeRendering="crispEdges" role="img" aria-label="Authenticator setup QR code">
      <g fill="#000">{rects}</g>
    </svg>
  );
}

export function CodeInput({ value, onChange, onComplete, disabled, autoFocus = true, backup = false }) {
  const ref = useRef(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus, backup]);
  return (
    <input
      ref={ref}
      value={value}
      disabled={disabled}
      inputMode={backup ? "text" : "numeric"}
      autoComplete="one-time-code"
      spellCheck={false}
      placeholder={backup ? "XXXX-XXXX" : "000000"}
      onChange={(e) => {
        const v = backup ? e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 9) : e.target.value.replace(/\D/g, "").slice(0, 6);
        onChange(v);
        if (!backup && v.length === 6) onComplete?.(v);
      }}
      onKeyDown={(e) => e.key === "Enter" && onComplete?.(value)}
      className="h-14 w-full rounded-xl border border-white/15 bg-black/30 text-center font-mono text-2xl tracking-[0.4em] text-white outline-none focus:border-violet-400 disabled:opacity-50"
    />
  );
}

function ErrorLine({ error }) {
  if (!error) return null;
  return (
    <p className="mt-3 text-center text-sm text-rose-300">
      {errorText(error)}
      {error.code === "wrong_code" && typeof error.attempts_left === "number" && ` ${error.attempts_left} tries left before a 15-minute lock.`}
      {error.code === "locked" && error.locked_until && ` Try again after ${new Date(error.locked_until).toLocaleTimeString()}.`}
    </p>
  );
}

export function BackupCodes({ codes, onDone, doneLabel = "Open the console" }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = `VIRORA Console backup codes (each works once)\nCreated ${new Date().toISOString().slice(0, 10)}\n\n${codes.join("\n")}\n`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* clipboard blocked */ }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "virora-console-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className={card}>
      <Header icon={KeyRound} title="Save your backup codes" sub="If you lose your phone, each of these gets you in once. You won't see them again." />
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-black/30 p-4 font-mono text-base tracking-wider">
        {codes.map((c) => <span key={c} className="text-center">{c}</span>)}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={copy} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 text-sm hover:bg-white/5 select-none">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
        </button>
        <button onClick={download} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 text-sm hover:bg-white/5 select-none">
          <Download className="h-4 w-4" /> Download .txt
        </button>
      </div>
      <label className="mt-4 flex items-start gap-2 text-sm text-white/80 select-none">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-500" />
        I've stored these somewhere safe, away from this phone (a password manager or on paper).
      </label>
      <button className={`${btn} mt-4`} disabled={!saved} onClick={onDone}>{doneLabel}</button>
    </div>
  );
}

// First-time setup: QR → first code → backup codes.
function Enrol({ email, onSignedIn }) {
  const [setup, setSetup] = useState(null); // { otpauth_uri, secret }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { token, backup_codes }
  const [showKey, setShowKey] = useState(false);

  useEffect(() => () => setSetup(null), []);

  const start = async () => {
    setBusy(true); setError(null);
    try { setSetup(await consoleApi("enrollStart", {}, { withToken: false })); setCode(""); }
    catch (e) { setError(e); }
    finally { setBusy(false); }
  };

  const confirm = async (c = code) => {
    if (busy || c.length !== 6) return;
    setBusy(true); setError(null);
    try {
      const r = await consoleApi("enrollConfirm", { code: c }, { withToken: false });
      setSetup(null); // drop the secret from memory as soon as it's confirmed
      setResult(r);
    } catch (e) {
      setError(e); setCode("");
      if (e.code === "pending_expired") setSetup(null);
    } finally { setBusy(false); }
  };

  if (result) {
    return <BackupCodes codes={result.backup_codes} onDone={() => { setConsoleToken(result.token); onSignedIn(); }} />;
  }

  if (!setup) {
    return (
      <div className={card}>
        <Header icon={Smartphone} title="Set up two-factor sign-in" sub={`The console needs a code from your phone as well as your VIRORA login (${email}).`} />
        <ol className="mb-5 list-decimal space-y-1 pl-5 text-sm text-white/70">
          <li>Install Google Authenticator, Authy or 1Password on your phone.</li>
          <li>Scan the QR code on the next screen.</li>
          <li>Type the 6-digit code it shows.</li>
        </ol>
        <button className={btn} disabled={busy} onClick={start}>{busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Start setup"}</button>
        <ErrorLine error={error} />
      </div>
    );
  }

  const grouped = setup.secret.match(/.{1,4}/g)?.join(" ");
  return (
    <div className={card}>
      <Header icon={Smartphone} title="Scan with your authenticator app" sub={`Finish within ${setup.confirm_within_minutes || 15} minutes.`} />
      <div className="flex justify-center"><QrSvg value={setup.otpauth_uri} /></div>
      <div className="mt-3 text-center">
        {showKey ? (
          <p className="break-all font-mono text-sm text-white/80">{grouped}</p>
        ) : (
          <button className={linkBtn} onClick={() => setShowKey(true)}>Can't scan? Show the setup key</button>
        )}
      </div>
      <p className="mb-2 mt-5 text-sm text-white/70">Enter the 6-digit code from the app:</p>
      <CodeInput value={code} onChange={setCode} onComplete={confirm} disabled={busy} />
      <button className={`${btn} mt-3`} disabled={busy || code.length !== 6} onClick={() => confirm()}>
        {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Confirm"}
      </button>
      <ErrorLine error={error} />
    </div>
  );
}

function SignIn({ email, initialLockedUntil, onSignedIn }) {
  const [useBackup, setUseBackup] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialLockedUntil ? { code: "locked", locked_until: initialLockedUntil } : null);
  const [backupNotice, setBackupNotice] = useState(null);

  const submit = async (c = code) => {
    if (busy) return;
    if (!useBackup && c.length !== 6) return;
    if (useBackup && c.replace(/-/g, "").length !== 8) return;
    setBusy(true); setError(null);
    try {
      const r = await consoleApi("verify", useBackup ? { backup_code: c } : { code: c }, { withToken: false });
      setConsoleToken(r.token);
      if (r.method === "backup_code") setBackupNotice(r.backup_codes_left);
      else onSignedIn();
    } catch (e) {
      setError(e); setCode("");
    } finally { setBusy(false); }
  };

  if (backupNotice !== null) {
    return (
      <div className={card}>
        <Header icon={AlertTriangle} title="Backup code used" sub={`${backupNotice} left. Every other console session was signed out.`} />
        <p className="mb-4 text-sm text-white/70">If your phone is lost, go to Security and set up 2FA on a new phone straight away. That also gives you fresh backup codes.</p>
        <button className={btn} onClick={onSignedIn}>Continue</button>
      </div>
    );
  }

  return (
    <div className={card}>
      <Header icon={useBackup ? KeyRound : Lock} title="VIRORA Console" sub={useBackup ? "Enter one of your backup codes." : `Enter the code from your authenticator app (${email}).`} />
      <CodeInput value={code} onChange={setCode} onComplete={submit} disabled={busy} backup={useBackup} />
      <button className={`${btn} mt-3`} disabled={busy} onClick={() => submit()}>
        {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Sign in"}
      </button>
      <ErrorLine error={error} />
      <div className="mt-4 text-center">
        <button className={linkBtn} onClick={() => { setUseBackup(!useBackup); setCode(""); setError(null); }}>
          {useBackup ? "Use the authenticator app instead" : "Lost your phone? Use a backup code"}
        </button>
      </div>
    </div>
  );
}

export function Refused({ error }) {
  return (
    <div className={card}>
      <Header icon={AlertTriangle} title="Console unavailable" sub={errorText(error)} />
    </div>
  );
}

export default function ConsoleGate({ onSignedIn }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    consoleApi("status", {}, { withToken: false }).then(setStatus).catch(setError);
  }, []);

  if (error) return <Shell><Refused error={error} /></Shell>;
  if (!status) return <Shell><Loader2 className="h-6 w-6 animate-spin text-violet-300" /></Shell>;
  return (
    <Shell>
      {status.enrolled
        ? <SignIn email={status.email} initialLockedUntil={status.locked_until} onSignedIn={onSignedIn} />
        : <Enrol email={status.email} onSignedIn={onSignedIn} />}
    </Shell>
  );
}
