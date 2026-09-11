import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { secrets } from 'base44:runtime';
import { Webhook } from 'npm:standardwebhooks@1.0.0';

// Dodo Payments webhook receiver — the thing that actually grants and revokes
// access, so it is the single most security-sensitive endpoint in the app.
// An unverified endpoint here would let anyone who finds the URL POST
// themselves a paid subscription, which is why verification happens before
// any side effect and a failure returns 401 without touching the database.
//
// Dodo follows the Standard Webhooks spec: three headers (webhook-id,
// webhook-signature, webhook-timestamp) signed over the RAW request body.
// The body must be verified as the exact bytes received — re-serialising the
// parsed JSON changes the signature and every event would fail.
//
// Secrets required (Base44 dashboard → Secrets):
//   DODO_WEBHOOK_KEY — Dodo dashboard → Developer → Webhooks

// Events that mean "this person has paid and should have access".
const ACTIVATING = new Set([
  "subscription.active",
  "subscription.renewed",
  "subscription.unpaused",
  "subscription.plan_changed",
]);
// Suspended by the provider — access stops, but the subscription may come back.
const PAUSING = new Set(["subscription.on_hold", "subscription.paused"]);
// Deliberately ended.
const CANCELLING = new Set(["subscription.cancelled"]);
// Ran out or never got off the ground.
const ENDING = new Set(["subscription.expired", "subscription.failed"]);
// Payment retry in progress. Deliberately NOT access-affecting: a card that
// fails on the first attempt usually succeeds on retry, and yanking a paying
// student's access mid-retry is worse than a few days of grace. Dodo sends
// on_hold when it actually gives up, and that IS handled above.
const NON_ACCESS_AFFECTING = new Set(["subscription.past_due", "subscription.update_payment_method", "subscription.updated"]);

const isoDate = (v: unknown): string => {
  if (!v) return "";
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // 1. Raw body first — required for signature verification.
  const raw = await req.text();

  // 2. Verify BEFORE anything else touches data.
  const secret = secrets.get("DODO_WEBHOOK_KEY");
  if (!secret) {
    console.error("DODO_WEBHOOK_KEY is not set — refusing to process webhook");
    return new Response("webhook secret not configured", { status: 500 });
  }
  try {
    new Webhook(secret).verify(raw, {
      "webhook-id": req.headers.get("webhook-id") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
    });
  } catch (e) {
    console.error("Rejected webhook with bad signature:", e?.message);
    return new Response("invalid signature", { status: 401 });
  }

  try {
    const event = JSON.parse(raw);
    const type: string = event?.type || "";
    const data = event?.data || {};
    const eventId = req.headers.get("webhook-id") || "";

    if (!type.startsWith("subscription.")) {
      // payment.* events carry no access decision of their own — the
      // subscription.* event that follows is what moves the subscription.
      return Response.json({ ok: true, ignored: type });
    }

    const subscriptionId = data.subscription_id || "";
    const metadata = data.metadata || {};
    const email = metadata.user_email || data.customer?.email || "";

    // 3. Find the VIRORA subscription row. Prefer the Dodo id (stable even if
    // the customer changes their email at checkout), then fall back to the
    // email we stamped into metadata when creating the checkout.
    let row = null;
    if (subscriptionId) {
      const byId = await base44.asServiceRole.entities.StudentSubscription
        .filter({ dodo_subscription_id: subscriptionId });
      row = byId?.[0] || null;
    }
    if (!row && email) {
      const byEmail = await base44.asServiceRole.entities.StudentSubscription
        .filter({ phone: email });
      row = byEmail?.[0] || null;
    }

    // 4. Idempotency. Dodo retries deliveries; without this a retried
    // subscription.renewed would accrue teacher commission a second time.
    if (row && eventId && row.last_dodo_event_id === eventId) {
      return Response.json({ ok: true, duplicate: eventId });
    }

    if (NON_ACCESS_AFFECTING.has(type)) {
      if (row) {
        await base44.asServiceRole.entities.StudentSubscription.update(row.id, {
          last_dodo_event_id: eventId,
        });
      }
      return Response.json({ ok: true, noted: type });
    }

    // 5. Translate the Dodo event into this app's own subscription state.
    // These are the same states the admin panel uses (lib/subscription.js),
    // so /admin and /teacher read a Dodo-driven row exactly like a manual one.
    const patch: Record<string, unknown> = {
      provider: "dodo",
      last_dodo_event_id: eventId,
    };
    if (subscriptionId) patch.dodo_subscription_id = subscriptionId;
    if (data.customer?.customer_id) patch.dodo_customer_id = data.customer.customer_id;

    if (ACTIVATING.has(type)) {
      patch.status = "active";
      patch.is_trial = false;
      patch.cancelled_at = "";
      patch.paused_at = "";
      patch.paused_days_remaining = null;
      const next = isoDate(data.next_billing_date);
      if (next) patch.expires_at = next;
    } else if (PAUSING.has(type)) {
      patch.status = "paused";
      patch.paused_at = new Date().toISOString().slice(0, 10);
    } else if (CANCELLING.has(type)) {
      // Dodo keeps access to the end of the paid period, so this mirrors the
      // admin panel's "cancel at period end": stay active until the date,
      // and let the app's own expiry check flip it to cancelled.
      patch.cancelled_at = new Date().toISOString().slice(0, 10);
      const next = isoDate(data.next_billing_date);
      if (next && new Date(next) > new Date()) {
        patch.status = "active";
        patch.expires_at = next;
      } else {
        patch.status = "cancelled";
      }
    } else if (ENDING.has(type)) {
      patch.status = type === "subscription.failed" ? "inactive" : "cancelled";
    } else {
      return Response.json({ ok: true, unhandled: type });
    }

    // 6. Apply. If we've never seen this person, create the row so a payment
    // is never silently dropped on the floor.
    if (row) {
      await base44.asServiceRole.entities.StudentSubscription.update(row.id, patch);
    } else {
      if (!email) {
        console.error("Webhook with no matching row and no email:", type, subscriptionId);
        return Response.json({ ok: false, error: "unmatched, no email" }, { status: 202 });
      }
      row = await base44.asServiceRole.entities.StudentSubscription.create({
        student_name: metadata.user_name || email,
        phone: email,
        plan: metadata.plan || "",
        billing_cycle: metadata.billing_cycle || "monthly",
        referral_code: metadata.referral_code || "",
        teacher_id: metadata.teacher_id || "",
        teacher_name: metadata.teacher_name || "",
        ...patch,
      });
    }

    // 7. Teacher commission. Only on a real activating event, only when that
    // teacher has a rate set. Guarded by the idempotency check above so a
    // retried delivery can't pay a teacher twice for one renewal.
    if (ACTIVATING.has(type) && row?.teacher_id) {
      try {
        const teacher = await base44.asServiceRole.entities.User.get(row.teacher_id);
        const rate = Number(teacher?.teacher_commission_rate_pct);
        // Dodo sends minor units (cents); guard against a missing amount.
        const grossCents = Number(data.recurring_pre_tax_amount || 0);
        if (teacher && rate > 0 && grossCents > 0) {
          const commission = (grossCents / 100) * (rate / 100);
          const accrued = Number(teacher.teacher_commission_accrued_usd || 0) + commission;
          await base44.asServiceRole.entities.User.update(teacher.id, {
            teacher_commission_accrued_usd: Math.round(accrued * 100) / 100,
          });
        }
      } catch (e) {
        // Never fail the webhook over commission bookkeeping — the student's
        // access matters more, and Dodo would retry the whole event.
        console.error("Commission accrual failed:", e?.message);
      }
    }

    return Response.json({ ok: true, type, subscription: subscriptionId });
  } catch (error) {
    console.error("dodoWebhook error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
