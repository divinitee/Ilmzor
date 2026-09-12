import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { secrets } from 'base44:runtime';

// Reports what Dodo Payments ACTUALLY has configured for each plan, so the
// wiring can be proved correct before real money moves through it.
//
// Why this exists: the four DODO_PRODUCT_* secrets are opaque ids pasted by
// hand, and VIRORA's happen to share a prefix (pdt_0NnR0x... / pdt_0NnR2D...).
// Transpose two of them and nothing errors — Learner buyers are simply charged
// the VIP price, or VIP buyers get VIP access for the Learner price. Neither
// shows up in a log. Under a "locked for life" promise the second one can
// never be corrected on the accounts it hits, so the mistake has to be caught
// BEFORE the first sale, not after.
//
// This function only reports Dodo's side. The comparison against the ladder
// lives in AdminPayments.jsx, which imports lib/founderPricing.js directly —
// keeping the expected prices in exactly one place instead of duplicating
// them into a second runtime that would drift at the first rung change.
//
// Secret VALUES are never returned. Product ids are (they are already public
// in every checkout URL); keys are reported only as present/absent.

const BASE_URLS = {
  test: "https://test.dodopayments.com",
  live: "https://live.dodopayments.com",
};

const PRODUCTS = [
  { plan: "learner", cycle: "monthly", secret: "DODO_PRODUCT_LEARNER_MONTHLY" },
  { plan: "vip", cycle: "monthly", secret: "DODO_PRODUCT_VIP_MONTHLY" },
  { plan: "learner", cycle: "yearly", secret: "DODO_PRODUCT_LEARNER_YEARLY" },
  { plan: "vip", cycle: "yearly", secret: "DODO_PRODUCT_VIP_YEARLY" },
];

// `price` is a discriminated union: a bare minor-unit integer on some
// responses, a { price, tax_inclusive, ... } object on others.
const priceBlock = (product: Record<string, unknown>) =>
  product?.price && typeof product.price === "object"
    ? (product.price as Record<string, unknown>)
    : null;

const majorUnits = (product: Record<string, unknown>): number | null => {
  const block = priceBlock(product);
  const raw = block ? block.price : product?.price;
  const cents = Number(raw);
  return Number.isFinite(cents) && cents > 0 ? Math.round(cents) / 100 : null;
};

// Fall back to the top-level flag when the nested block omits it, so an
// undefined never reads as "tax inclusive is off".
const pick = (product: Record<string, unknown>, key: string) => {
  const block = priceBlock(product);
  const nested = block?.[key];
  return nested === undefined || nested === null ? product?.[key] : nested;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let me;
    try {
      me = await base44.auth.me();
    } catch {
      me = null;
    }
    // This exposes payment configuration, so it is admins only — and the
    // check is on the session, never on anything the caller sends.
    if (me?.role !== "admin") {
      return Response.json({ error: "admins only" }, { status: 403 });
    }

    const mode = (secrets.get("DODO_MODE") || "test") === "live" ? "live" : "test";
    const apiKey = secrets.get("DODO_API_KEY");

    const env = {
      mode,
      api_key_set: Boolean(apiKey),
      webhook_key_set: Boolean(secrets.get("DODO_WEBHOOK_KEY")),
      checkout_host_override: Boolean(secrets.get("DODO_CHECKOUT_HOST")),
      app_base_url: secrets.get("APP_BASE_URL") || "https://virora.base44.app",
    };

    if (!apiKey) {
      return Response.json({
        env,
        products: PRODUCTS.map((p) => ({
          ...p,
          configured: Boolean(secrets.get(p.secret)),
          product_id: secrets.get(p.secret) || null,
          error: "DODO_API_KEY not set — cannot read products from Dodo",
        })),
      });
    }

    const products = await Promise.all(PRODUCTS.map(async (p) => {
      const productId = secrets.get(p.secret);
      if (!productId) {
        return { ...p, configured: false, product_id: null, error: "secret not set" };
      }
      try {
        const res = await fetch(
          `${BASE_URLS[mode]}/products/${encodeURIComponent(productId)}`,
          { headers: { Authorization: `Bearer ${apiKey}` } },
        );
        if (!res.ok) {
          return {
            ...p, configured: true, product_id: productId,
            error: `Dodo returned ${res.status}`,
          };
        }
        const product = await res.json();
        return {
          ...p,
          configured: true,
          product_id: productId,
          name: product?.name ?? null,
          price_usd: majorUnits(product),
          currency: pick(product, "currency") ?? null,
          is_recurring: pick(product, "is_recurring") ?? null,
          tax_inclusive: pick(product, "tax_inclusive") ?? null,
          frequency_count: pick(product, "payment_frequency_count") ?? null,
          frequency_interval: pick(product, "payment_frequency_interval") ?? null,
          error: null,
        };
      } catch (e) {
        return { ...p, configured: true, product_id: productId, error: e?.message || "lookup failed" };
      }
    }));

    // Two plans pointing at one product is the exact transposition this is
    // built to catch, and it is invisible when each row is read on its own.
    const ids = products.map((p) => p.product_id).filter(Boolean);
    const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];

    return Response.json({ env, products, duplicates });
  } catch (error) {
    console.error("verifyDodoConfig error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
