import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAppLang } from "@/hooks/useAppLang";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Clock, Lock } from "lucide-react";
import { isPaying } from "@/lib/subscription";
import { formatUsd } from "@/lib/founderPricing";

// Where Dodo returns a student after checkout.
//
// Access is granted by the dodoWebhook function, not by this page — a page the
// buyer's browser loads can never be what decides whether they paid. So this
// screen's whole job is to wait for that webhook to land and say something
// truthful in the meantime.
//
// Without it the student is dropped back on the dashboard with no
// acknowledgement at all, and for the second or two before the webhook arrives
// their account still reads as free. They just paid and the site acts like
// nothing happened, which is the worst possible moment to look broken.
//
// The wait is real but short. If it runs long we say the payment was received
// and access is still being set up — true in every case, because Dodo only
// redirects here after the charge succeeded, and Dodo retries its webhook.

const POLL_MS = 2000;
const MAX_WAIT_MS = 40000;

const fill = (template, values) =>
  Object.entries(values).reduce(
    (out, [key, value]) => out.split(`{${key}}`).join(value),
    template || "",
  );

export default function PaymentComplete() {
  const navigate = useNavigate();
  const { t } = useAppLang();

  const [state, setState] = useState("checking"); // checking | active | slow | signed_out
  const [sub, setSub] = useState(null);
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const poll = useCallback(async () => {
    clearTimers();
    setState("checking");

    let me;
    try {
      me = await base44.auth.me();
    } catch {
      me = null;
    }
    if (!me?.email) {
      // The charge still went through — Dodo would not have redirected here
      // otherwise — so this is a session problem, not a payment problem, and
      // the copy has to say so or the student thinks they lost their money.
      setState("signed_out");
      return;
    }

    const startedAt = Date.now();

    const attempt = async () => {
      let row = null;
      try {
        const rows = await base44.entities.StudentSubscription.filter({ phone: me.email });
        row = rows?.[0] || null;
      } catch {
        row = null;
      }

      if (row && isPaying(row)) {
        setSub(row);
        setState("active");
        return;
      }
      if (Date.now() - startedAt >= MAX_WAIT_MS) {
        setSub(row);
        setState("slow");
        return;
      }
      timers.current.push(setTimeout(attempt, POLL_MS));
    };

    attempt();
  }, []);

  useEffect(() => {
    poll();
    return clearTimers;
  }, [poll]);

  const planLabel = sub?.plan || "";
  const cycleWord = sub?.billing_cycle === "yearly"
    ? t("payment.cycle_year")
    : t("payment.cycle_month");

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center space-y-5"
      >
        {state === "checking" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
            <h1 className="text-2xl font-bold">{t("payment.checking_title")}</h1>
            <p className="text-muted-foreground">{t("payment.checking_sub")}</p>
          </>
        )}

        {state === "active" && (
          <>
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
            >
              <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" />
            </motion.div>
            <h1 className="text-2xl font-bold">{t("payment.success_title")}</h1>
            <p className="text-muted-foreground">
              {fill(t("payment.success_sub"), { plan: planLabel })}
            </p>

            {/* Only rendered from the stored record, never from a price this
                page worked out for itself — the number a student is shown as
                locked has to be the number that was actually locked. */}
            {sub?.locked_price_usd > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-primary bg-primary/10 rounded-lg px-3 py-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  {fill(t("payment.locked_note"), {
                    price: formatUsd(sub.locked_price_usd),
                    cycle: cycleWord,
                  })}
                </span>
              </div>
            )}

            <Button className="w-full" onClick={() => navigate("/")}>
              {t("payment.go_home")}
            </Button>
          </>
        )}

        {state === "slow" && (
          <>
            <Clock className="w-12 h-12 mx-auto text-amber-500" />
            <h1 className="text-2xl font-bold">{t("payment.slow_title")}</h1>
            <p className="text-muted-foreground">{t("payment.slow_sub")}</p>
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={poll}>{t("payment.retry")}</Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
                {t("payment.go_home")}
              </Button>
            </div>
          </>
        )}

        {state === "signed_out" && (
          <>
            <Clock className="w-12 h-12 mx-auto text-amber-500" />
            <h1 className="text-2xl font-bold">{t("payment.signed_out_title")}</h1>
            <p className="text-muted-foreground">{t("payment.signed_out_sub")}</p>
            <Button className="w-full" onClick={() => navigate("/login")}>
              {t("payment.login")}
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
