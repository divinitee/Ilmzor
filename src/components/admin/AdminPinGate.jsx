import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Lock, ShieldAlert } from "lucide-react";
import { hashPin, markUnlocked, PIN_PATTERN } from "@/lib/adminPin";

// Shown over /admin when the session isn't unlocked yet. If the admin has no
// PIN set, it offers to set one (and lets them skip). See lib/adminPin.js for
// exactly how little this protects — it is a laptop-left-open guard, not
// security.
export default function AdminPinGate({ user, onUnlocked }) {
  const hasPin = !!user?.admin_pin_hash;
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSet = async () => {
    setError("");
    if (!PIN_PATTERN.test(pin)) return setError("PIN must be 4–8 digits.");
    if (pin !== confirmPin) return setError("The two PINs don't match.");
    setBusy(true);
    try {
      await base44.auth.updateMe({ admin_pin_hash: await hashPin(pin) });
      markUnlocked();
      onUnlocked();
    } catch (e) {
      setError(`Couldn't save the PIN: ${e?.message || "unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleEnter = async () => {
    setError("");
    setBusy(true);
    try {
      if ((await hashPin(pin)) === user.admin_pin_hash) {
        markUnlocked();
        onUnlocked();
      } else {
        setError("Wrong PIN.");
        setPin("");
      }
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    markUnlocked();
    onUnlocked();
  };

  const inputCls =
    "w-full h-12 px-4 text-center text-lg tracking-[0.4em] font-mono border border-input rounded-xl bg-background text-foreground focus:border-primary focus:outline-none";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>

        {hasPin ? (
          <>
            <h1 className="text-lg font-bold text-foreground text-center">Admin PIN</h1>
            <p className="text-sm text-muted-foreground text-center mt-1 mb-5">
              Enter your PIN to open the admin panel.
            </p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={(e) => e.key === "Enter" && handleEnter()}
              placeholder="••••"
              className={inputCls}
            />
            <button
              onClick={handleEnter}
              disabled={busy || !pin}
              className="w-full h-11 mt-4 rounded-xl bg-primary text-primary-foreground font-semibold select-none disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              Unlock
            </button>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-foreground text-center">Set an admin PIN</h1>
            <p className="text-sm text-muted-foreground text-center mt-1 mb-5">
              4–8 digits, asked once per browser session.
            </p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="New PIN"
              className={inputCls}
            />
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={(e) => e.key === "Enter" && handleSet()}
              placeholder="Confirm"
              className={`${inputCls} mt-3`}
            />
            <button
              onClick={handleSet}
              disabled={busy || !pin || !confirmPin}
              className="w-full h-11 mt-4 rounded-xl bg-primary text-primary-foreground font-semibold select-none disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              Set PIN
            </button>
            <button
              onClick={skip}
              className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground select-none py-2"
            >
              Skip for now
            </button>
          </>
        )}

        {error && <p className="text-sm text-destructive text-center mt-3">{error}</p>}

        <div className="mt-5 pt-4 border-t border-border flex gap-2">
          <ShieldAlert className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            This PIN only stops someone using your unlocked device. It does not protect your
            data from anyone technical — that's your Base44 account login. Turn on 2FA there.
          </p>
        </div>
      </div>
    </div>
  );
}
