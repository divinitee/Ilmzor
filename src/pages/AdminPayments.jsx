import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { priceFor, getCurrentStage, formatUsd } from "@/lib/founderPricing";

// Admin-only preflight for the Dodo Payments wiring. Not linked in nav —
// visit /admin-payments while logged in as an admin.
//
// Run this after setting the DODO_PRODUCT_* secrets, and again every time a
// rung changes and they are repointed (21 Oct, and each rung after). It is the
// only thing standing between a transposed product id and charging students
// the wrong price under a promise that says the price can never change.
//
// The expected numbers come from lib/founderPricing.js — the same module the
// pricing page renders from — so this can never pass while disagreeing with
// what the customer was shown.

const EXPECTED_INTERVAL = { monthly: "month", yearly: "year" };

function checkProduct(row) {
  const problems = [];
  if (!row.configured) return { ok: false, problems: ["Secret not set in Base44"] };
  if (row.error) return { ok: false, problems: [row.error] };

  const expected = priceFor(row.plan, row.cycle);
  if (row.price_usd == null) {
    problems.push("Dodo returned no usable price");
  } else if (Math.abs(row.price_usd - expected) > 0.001) {
    problems.push(`Dodo charges ${formatUsd(row.price_usd)} but the site advertises ${formatUsd(expected)}`);
  }

  if (row.currency && String(row.currency).toUpperCase() !== "USD") {
    problems.push(`Currency is ${row.currency}, expected USD`);
  }
  if (row.is_recurring === false) {
    problems.push("Product is one-time, not a subscription");
  }
  // The whole point of tax-inclusive pricing: the advertised price is the
  // charged price. An unchecked product silently adds tax on top for this
  // rung only, which is the hardest kind of pricing bug to notice.
  if (row.tax_inclusive !== true) {
    problems.push("Tax Inclusive Pricing is OFF — the customer would be charged more than the site shows");
  }
  const interval = String(row.frequency_interval || "").toLowerCase();
  if (interval && interval !== EXPECTED_INTERVAL[row.cycle]) {
    problems.push(`Billing interval is "${row.frequency_interval}", expected ${EXPECTED_INTERVAL[row.cycle]}`);
  }
  if (row.frequency_count != null && Number(row.frequency_count) !== 1) {
    problems.push(`Bills every ${row.frequency_count} intervals, expected every 1`);
  }

  return { ok: problems.length === 0, problems };
}

const Row = ({ label, ok, detail }) => (
  <div className="flex items-start gap-2 py-1">
    {ok
      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
      : <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />}
    <div className="text-sm">
      <span className="font-medium">{label}</span>
      {detail && <span className="text-muted-foreground"> — {detail}</span>}
    </div>
  </div>
);

export default function AdminPayments() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("verifyDodoConfig", {});
      if (res?.data?.error) throw new Error(res.data.error);
      setData(res?.data || null);
    } catch (e) {
      setError(e.message || "Could not read the payment configuration");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    base44.auth.me()
      .then((me) => {
        const admin = me?.role === "admin";
        setIsAdmin(admin);
        if (admin) load();
        else setLoading(false);
      })
      .catch(() => { setIsAdmin(false); setLoading(false); });
  }, [load]);

  if (isAdmin === false) {
    return <div className="p-8 text-center text-muted-foreground">This page is for admins only.</div>;
  }
  if (isAdmin === null || (loading && !data)) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const stage = getCurrentStage();
  const rows = data?.products || [];
  const checks = rows.map((r) => ({ row: r, ...checkProduct(r) }));
  const allGood =
    checks.length > 0 &&
    checks.every((c) => c.ok) &&
    !(data?.duplicates?.length) &&
    data?.env?.webhook_key_set;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Payments configuration</h1>
          <p className="text-sm text-muted-foreground">
            Dodo Payments, <span className="font-medium">{data?.env?.mode}</span> mode · current rung:{" "}
            <span className="font-medium">{stage.id}</span>
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Re-check
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-sm">{error}</div>
      )}

      {data && (
        <>
          <div className={`p-4 rounded-lg border ${allGood ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
            <div className="flex items-center gap-2 font-semibold">
              {allGood
                ? <><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Safe to take payments</>
                : <><AlertTriangle className="w-5 h-5 text-amber-500" /> Not ready — fix the items below first</>}
            </div>
            {data.env.mode === "live" && (
              <p className="text-xs text-muted-foreground mt-2">
                Live mode. Anything you test here moves real money.
              </p>
            )}
          </div>

          <div className="space-y-1 p-4 rounded-lg border">
            <h2 className="font-semibold mb-2">Environment</h2>
            <Row label="Webhook signing key" ok={data.env.webhook_key_set}
                 detail={data.env.webhook_key_set ? "set" : "DODO_WEBHOOK_KEY missing — the webhook rejects every event, so nobody gets access after paying"} />
            <Row label="API key" ok={data.env.api_key_set}
                 detail={data.env.api_key_set ? "set" : "DODO_API_KEY missing — checkout falls back to payment links and the locked-in price cannot be recorded"} />
            <Row label="Return URL" ok detail={data.env.app_base_url} />
            {data.duplicates?.length > 0 && (
              <Row label="Duplicate product ids" ok={false}
                   detail={`${data.duplicates.join(", ")} — two plans point at the same product, so one of them charges the wrong price`} />
            )}
          </div>

          <div className="space-y-3">
            {checks.map(({ row, ok, problems }) => (
              <div key={row.secret} className={`p-4 rounded-lg border ${ok ? "" : "border-rose-500/40"}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    {ok
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : <XCircle className="w-4 h-4 text-rose-500" />}
                    <span className="font-semibold capitalize">{row.plan} · {row.cycle}</span>
                    {row.name && <span className="text-sm text-muted-foreground">{row.name}</span>}
                  </div>
                  <span className="text-sm">
                    site {formatUsd(priceFor(row.plan, row.cycle))}
                    {row.price_usd != null && (
                      <> · dodo <span className={ok ? "" : "text-rose-500 font-semibold"}>{formatUsd(row.price_usd)}</span></>
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                  {row.secret} = {row.product_id || "(not set)"}
                </p>
                {problems.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {problems.map((p, i) => (
                      <li key={i} className="text-sm text-rose-500">· {p}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Expected prices come from <code>lib/founderPricing.js</code>, the same module the pricing page
            renders from. Re-run this after every rung change.
          </p>
        </>
      )}
    </div>
  );
}
