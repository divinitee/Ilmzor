import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { secrets } from 'base44:runtime';

// Creates a Dodo Payments checkout session for the CALLING user and returns
// the hosted checkout URL for the app to redirect to.
//
// The buyer's identity is taken from the authenticated session, never from
// the request body. If the client could name the email, anyone could buy a
// subscription onto somebody else's account — or, worse, claim someone
// else's payment by POSTing a different address.
//
// Secrets required (Base44 dashboard → Secrets):
//   DODO_API_KEY                  — optional. With it, checkout is a proper
//                                   API session; without it, the hosted
//                                   payment link below is used instead.
//                                   (dodoWebhook needs it regardless.)
//   DODO_PRODUCT_LEARNER_MONTHLY  — product id (pdt_...) for the $2.99 tier
//   DODO_PRODUCT_VIP_MONTHLY      — product id for the $5.99 tier
//   DODO_PRODUCT_LEARNER_YEARLY   — optional
//   DODO_PRODUCT_VIP_YEARLY       — optional
//   DODO_MODE                     — "test" (default) or "live"
//   APP_BASE_URL                  — optional; where to return after payment

const BASE_URLS = {
  test: "https://test.dodopayments.com",
  live: "https://live.dodopayments.com",
};

// Hosted checkout links. The live host is documented; the test host is a
// best guess and is NOT confirmed in Dodo's docs — open any product's
// "Payment Link" panel in test mode, and if the domain differs, set the
// DODO_CHECKOUT_HOST secret to override this.
const CHECKOUT_HOSTS = {
  test: "https://test.checkout.dodopayments.com",
  live: "https://checkout.dodopayments.com",
};

// A hosted payment link for the same product, carrying the same metadata the
// API session would have carried.
//
// This is the FALLBACK, not the preferred path: a link is a fixed URL for a
// fixed product, so everything that varies per buyer has to ride in the query
// string. That is exactly why every field below matters — drop them and the
// webhook loses the thread back to this student, and a teacher's commission
// goes unpaid because nothing says who referred them.
//
// email + disableEmail pins the purchase to the signed-in account. Without it
// a student could type a different address at checkout, and the webhook's
// email fallback would then fail to find their row — a paid subscription that
// lands on nobody.
function staticPaymentLink(
  productId: string,
  metadata: Record<string, string>,
  appUrl: string,
  mode: "test" | "live",
): string {
  const host = secrets.get("DODO_CHECKOUT_HOST") || CHECKOUT_HOSTS[mode];
  const q = new URLSearchParams();
  q.set("quantity", "1");
  q.set("redirect_url", `${appUrl}/payment-complete`);
  q.set("email", metadata.user_email);
  q.set("disableEmail", "true");
  if (metadata.user_name) q.set("fullName", metadata.user_name);
  for (const [key, value] of Object.entries(metadata)) {
    if (value) q.set(`metadata_${key}`, String(value));
  }
  return `${host.replace(/\/$/, "")}/buy/${encodeURIComponent(productId)}?${q.toString()}`;
}

const productSecretFor = (planId: string, cycle: string) => {
  const tier = planId === "vip" ? "VIP" : "LEARNER";
  const period = cycle === "yearly" ? "YEARLY" : "MONTHLY";
  return `DODO_PRODUCT_${tier}_${period}`;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "POST only" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    // Identity from the session, not the payload.
    let me;
    try {
      me = await base44.auth.me();
    } catch {
      me = null;
    }
    if (!me?.email) {
      return Response.json({ error: "not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const planId = String(body.plan || "learner").toLowerCase();
    const cycle = body.billing_cycle === "yearly" ? "yearly" : "monthly";

    // Optional — see staticPaymentLink above for what happens without it.
    const apiKey = secrets.get("DODO_API_KEY");

    const secretName = productSecretFor(planId, cycle);
    const productId = secrets.get(secretName);
    if (!productId) {
      // Named explicitly so the fix is obvious: create the product in Dodo,
      // then add its id as this secret.
      return Response.json(
        { error: `No Dodo product configured for ${planId}/${cycle}. Set the secret ${secretName}.` },
        { status: 500 },
      );
    }

    const mode = (secrets.get("DODO_MODE") || "test") === "live" ? "live" : "test";
    const appUrl = secrets.get("APP_BASE_URL") || "https://virora.base44.app";

    // The student's existing subscription row, so the webhook can match this
    // purchase back to the right teacher for commission.
    let existing = null;
    try {
      const rows = await base44.asServiceRole.entities.StudentSubscription
        .filter({ phone: me.email });
      existing = rows?.[0] || null;
    } catch {
      existing = null;
    }

    // Everything the webhook needs to reconnect this payment to this student
    // without trusting anything the browser sends later.
    const metadata: Record<string, string> = {
      user_email: me.email,
      user_id: me.id || "",
      user_name: me.display_name || me.full_name || me.email,
      plan: planId,
      billing_cycle: cycle,
    };
    // Which founder-ladder rung they bought on. A REPORTING LABEL ONLY — it
    // comes from the browser, so it is never trusted for anything that grants
    // value. The binding number (locked_price_usd) is derived in dodoWebhook
    // from the amount Dodo actually charged.
    if (body.founder_stage) metadata.founder_stage = String(body.founder_stage).slice(0, 40);
    if (existing?.referral_code) metadata.referral_code = existing.referral_code;
    if (existing?.teacher_id) metadata.teacher_id = existing.teacher_id;
    if (existing?.teacher_name) metadata.teacher_name = existing.teacher_name;

    // Preferred path: an API-created checkout session. It is a single-use URL
    // scoped to this buyer, so nothing about the purchase depends on a query
    // string a student could edit before paying.
    if (apiKey) {
      try {
        const res = await fetch(`${BASE_URLS[mode]}/checkouts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_cart: [{ product_id: productId, quantity: 1 }],
            customer: { email: me.email, name: metadata.user_name },
            return_url: `${appUrl}/payment-complete`,
            metadata,
          }),
        });

        const payload = await res.json().catch(() => ({}));
        // Dodo has used a few names for this across API versions; accept any.
        const url = res.ok
          ? (payload.checkout_url || payload.payment_link || payload.url || payload.link)
          : null;

        if (url) return Response.json({ ok: true, url, mode, via: "session" });

        // Fall through to the hosted link rather than failing the purchase.
        // A student who wants to pay should not be stopped by our API call.
        console.error("Dodo session failed, falling back to payment link:", res.status, payload);
      } catch (e) {
        console.error("Dodo session threw, falling back to payment link:", e?.message);
      }
    }

    const url = staticPaymentLink(productId, metadata, appUrl, mode);
    return Response.json({ ok: true, url, mode, via: "payment_link" });
  } catch (error) {
    console.error("createDodoCheckout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
