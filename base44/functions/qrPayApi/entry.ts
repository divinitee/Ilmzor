import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// qrPayApi: Humo / Uzcard payments by QR code, in so'm, confirmed by hand.
// (2026-10-02)
//
// The flow:
//   1. Student picks a plan on /pricing → "start" creates a ManualPayment with
//      a VR-xxxxxx code and the so'm amount from PaymentSettings.
//   2. Student scans the QR in their bank app, pays, writes the code in the
//      comment, uploads the receipt → "submit" marks it pending and emails
//      the admin.
//   3. Admin checks the money actually arrived, then "review" approves (which
//      activates the StudentSubscription) or rejects.
//
// Security rules, same as studentApi:
//  - Identity always comes from the session (auth.me()), never the payload.
//  - The amount always comes from PaymentSettings on the server, never the
//    browser, so a tampered client cannot "start" a 1-so'm VIP payment.
//  - ManualPayment and PaymentSettings are admin-only for writes (RLS). Only
//    this function (service role) creates or changes them for students.
//  - A receipt is never proof on its own. Access is only granted by an admin
//    pressing Approve after checking their bank, so a fake screenshot buys
//    nothing.

const PLAN_NAMES: Record<string, string> = { learner: 'Learner Plan', vip: 'VIP Plan' };
const PLANS = ['learner', 'vip'];
const CYCLES = ['monthly', 'yearly'];
const MAX_OPEN_PER_USER = 3;
const ADMIN_EMAIL = 'ilmzor.uz@gmail.com';

const nowIso = () => new Date().toISOString();
const todayUtc = () => new Date().toISOString().slice(0, 10);
const clean = (v: unknown, n = 120) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);
const displayName = (u: any) => u?.display_name || u?.full_name || u?.email || '';
const isRealPlan = (sub: any) => !!sub?.plan && !/free/i.test(sub.plan);

class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

// ------------------------------------------------------------- settings

const SETTINGS_FIELDS = [
  'qr_enabled', 'qr_image_url', 'recipient_name', 'telegram_handle', 'activation_hours',
  'price_uzs_learner_monthly', 'price_uzs_learner_yearly', 'price_uzs_vip_monthly', 'price_uzs_vip_yearly',
];

async function loadSettings(svc: any) {
  const rows = await svc.PaymentSettings.list('-updated_date', 1);
  return rows?.[0] || null;
}

const priceOf = (s: any, plan: string, cycle: string) => {
  const n = Number(s?.[`price_uzs_${plan}_${cycle}`]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

// Ready means a student can actually finish a payment: switched on, a QR to
// scan, and a price for every plan/cycle the pricing page offers.
function readiness(s: any) {
  if (!s) return false;
  if (!s.qr_enabled || !s.qr_image_url) return false;
  return PLANS.every((p) => CYCLES.every((c) => priceOf(s, p, c) > 0));
}

function publicConfig(s: any) {
  const prices: Record<string, Record<string, number>> = {};
  for (const p of PLANS) {
    prices[p] = {};
    for (const c of CYCLES) prices[p][c] = priceOf(s, p, c);
  }
  return {
    ready: readiness(s),
    prices,
    telegram_handle: clean(s?.telegram_handle, 64).replace(/^@/, ''),
    activation_hours: Number(s?.activation_hours) > 0 ? Number(s.activation_hours) : null,
  };
}

// ------------------------------------------------------------- helpers

async function uniqueCode(svc: any) {
  for (let i = 0; i < 8; i++) {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000;
    const code = `VR-${n}`;
    const clash = await svc.ManualPayment.filter({ payment_code: code });
    if (!clash?.length) return code;
  }
  throw new ApiError(500, 'code_generation_failed');
}

function addPeriod(fromDate: string, cycle: string) {
  const d = new Date(`${fromDate}T00:00:00Z`);
  if (cycle === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

// Same row selection as studentApi.findSub: a live row wins, then newest.
async function findSub(svc: any, email: string, userId: string) {
  let rows = await svc.StudentSubscription.filter({ phone: email });
  if (!rows?.length) rows = await svc.StudentSubscription.filter({ created_by_id: userId });
  if (!rows?.length) return null;
  const rank = (s: any) => (s.status === 'active' ? 2 : 0) + (s.dodo_subscription_id ? 1 : 0);
  return [...rows].sort((a, b) =>
    rank(b) - rank(a) || String(b.updated_date || '').localeCompare(String(a.updated_date || '')),
  )[0];
}

const studentView = (p: any) => ({
  id: p.id,
  plan: p.plan,
  billing_cycle: p.billing_cycle,
  amount_uzs: p.amount_uzs,
  payment_code: p.payment_code,
  status: p.status,
  has_receipt: !!p.receipt_uri,
  submitted_at: p.submitted_at || '',
  reviewed_at: p.reviewed_at || '',
  admin_note: p.status === 'rejected' ? p.admin_note || '' : '',
  created_date: p.created_date,
});

function requireAdmin(me: any) {
  if (me?.role !== 'admin') throw new ApiError(403, 'forbidden');
}

// ------------------------------------------------------------- student actions

async function config(svc: any) {
  return { config: publicConfig(await loadSettings(svc)) };
}

async function start(svc: any, me: any, body: any) {
  const plan = String(body.plan || '');
  const cycle = String(body.billing_cycle || '');
  if (!PLANS.includes(plan) || !CYCLES.includes(cycle)) throw new ApiError(400, 'bad_plan');

  const settings = await loadSettings(svc);
  if (!readiness(settings)) throw new ApiError(409, 'not_configured');
  const amount = priceOf(settings, plan, cycle);

  const mine = await svc.ManualPayment.filter({ user_id: me.id }, '-created_date', 20);
  const open = (mine || []).filter((p: any) => p.status === 'awaiting_receipt' || p.status === 'pending');

  // Reuse an unfinished payment for the same plan instead of piling up codes.
  // A pending one (receipt sent) is reused too: the student is shown its
  // status rather than a second code for the same money.
  let payment = open.find((p: any) => p.plan === plan && p.billing_cycle === cycle) || null;
  if (payment && payment.status === 'awaiting_receipt' && payment.amount_uzs !== amount) {
    // The admin changed the price since; refresh it before they pay.
    payment = await svc.ManualPayment.update(payment.id, { amount_uzs: amount });
  }
  if (!payment) {
    if (open.length >= MAX_OPEN_PER_USER) throw new ApiError(429, 'too_many_open');
    payment = await svc.ManualPayment.create({
      user_id: me.id,
      user_email: me.email,
      user_name: clean(displayName(me)),
      plan,
      billing_cycle: cycle,
      amount_uzs: amount,
      payment_code: await uniqueCode(svc),
      status: 'awaiting_receipt',
    });
  }

  return {
    payment: studentView(payment),
    qr: {
      image_url: settings.qr_image_url,
      recipient_name: clean(settings.recipient_name),
    },
    config: publicConfig(settings),
  };
}

async function submit(svc: any, me: any, body: any) {
  const id = String(body.payment_id || '');
  const receipt = String(body.receipt_uri || '').trim();
  if (!id) throw new ApiError(400, 'payment_required');
  if (!receipt || receipt.length > 1000 || /\s/.test(receipt)) throw new ApiError(400, 'receipt_required');

  const p = await svc.ManualPayment.get(id).catch(() => null);
  if (!p || p.user_id !== me.id) throw new ApiError(404, 'not_found');
  if (p.status !== 'awaiting_receipt' && p.status !== 'pending') throw new ApiError(409, 'already_reviewed');

  const updated = await svc.ManualPayment.update(p.id, {
    receipt_uri: receipt,
    status: 'pending',
    submitted_at: nowIso(),
  });

  // The admin email is sent by the router after this returns.
  return { payment: studentView(updated), notify: true };
}

async function mine(svc: any, me: any) {
  const rows = await svc.ManualPayment.filter({ user_id: me.id }, '-created_date', 10);
  return { payments: (rows || []).map(studentView) };
}

// ------------------------------------------------------------- admin actions

async function adminList(svc: any, me: any, body: any) {
  requireAdmin(me);
  const status = String(body.status || 'pending');
  const query = ['awaiting_receipt', 'pending', 'approved', 'rejected'].includes(status) ? { status } : {};
  const rows = await svc.ManualPayment.filter(query, status === 'pending' ? 'submitted_at' : '-updated_date', 200);
  return { payments: rows || [] };
}

async function review(svc: any, me: any, body: any) {
  requireAdmin(me);
  const id = String(body.payment_id || '');
  const decision = String(body.decision || '');
  const note = clean(body.note, 500);
  if (!id || !['approve', 'reject'].includes(decision)) throw new ApiError(400, 'bad_request');

  const p = await svc.ManualPayment.get(id).catch(() => null);
  if (!p) throw new ApiError(404, 'not_found');
  if (p.status === 'approved' || p.status === 'rejected') throw new ApiError(409, 'already_reviewed');

  if (decision === 'reject') {
    const updated = await svc.ManualPayment.update(p.id, {
      status: 'rejected', admin_note: note, reviewed_at: nowIso(), reviewed_by: me.email,
    });
    return { payment: updated };
  }

  if (p.status !== 'pending') throw new ApiError(409, 'no_receipt_yet');

  const sub = await findSub(svc, p.user_email, p.user_id);

  // A live card subscription is owned by Dodo's webhooks; editing it by hand
  // would be overwritten on the next renewal. Sort that one out manually.
  if (sub && sub.provider === 'dodo' && sub.status === 'active' && !sub.cancelled_at) {
    throw new ApiError(409, 'has_active_card_subscription');
  }

  // Paying again while still paid up extends from the current end date, so
  // an early renewal never eats the days they already paid for.
  const today = todayUtc();
  const stillPaid = sub && sub.status === 'active' && !sub.is_trial && isRealPlan(sub)
    && sub.expires_at && sub.expires_at > today;
  const from = stillPaid ? String(sub.expires_at).slice(0, 10) : today;

  const patch: Record<string, unknown> = {
    status: 'active',
    provider: 'manual',
    plan: PLAN_NAMES[p.plan],
    billing_cycle: p.billing_cycle,
    is_trial: false,
    expires_at: addPeriod(from, p.billing_cycle),
    payment_ref: p.payment_code,
    cancelled_at: '',
    paused_at: '',
    paused_days_remaining: null,
  };
  if (!sub?.paid_since) patch.paid_since = today;

  const row = sub
    ? await svc.StudentSubscription.update(sub.id, patch)
    : await svc.StudentSubscription.create({
        student_name: p.user_name || p.user_email,
        phone: p.user_email,
        ...patch,
      });

  const updated = await svc.ManualPayment.update(p.id, {
    status: 'approved',
    admin_note: note,
    reviewed_at: nowIso(),
    reviewed_by: me.email,
    subscription_id: row?.id || '',
  });
  return { payment: updated, subscription: row };
}

async function getSettings(svc: any, me: any) {
  requireAdmin(me);
  const s = await loadSettings(svc);
  return { settings: s, config: publicConfig(s) };
}

async function saveSettings(svc: any, me: any, body: any) {
  requireAdmin(me);
  const incoming = body.settings || {};
  const patch: Record<string, unknown> = {};
  for (const k of SETTINGS_FIELDS) {
    if (!(k in incoming)) continue;
    const v = incoming[k];
    if (k === 'qr_enabled') patch[k] = !!v;
    else if (k.startsWith('price_uzs_') || k === 'activation_hours') {
      const n = Number(v);
      patch[k] = Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
    } else if (k === 'qr_image_url') {
      const url = String(v || '').trim();
      if (url && !/^https:\/\//.test(url)) throw new ApiError(400, 'qr_url_must_be_https');
      patch[k] = url.slice(0, 1000);
    } else if (k === 'telegram_handle') {
      patch[k] = clean(v, 64).replace(/^@/, '');
    } else {
      patch[k] = clean(v, 120);
    }
  }
  const existing = await loadSettings(svc);
  const saved = existing
    ? await svc.PaymentSettings.update(existing.id, patch)
    : await svc.PaymentSettings.create(patch);
  return { settings: saved, config: publicConfig(saved) };
}

// ------------------------------------------------------------- router

const ACTIONS: Record<string, (svc: any, me: any, body: any) => Promise<any>> = {
  config: (svc) => config(svc),
  start,
  submit,
  mine: (svc, me) => mine(svc, me),
  adminList,
  review,
  getSettings: (svc, me) => getSettings(svc, me),
  saveSettings,
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    let me: any = null;
    try { me = await base44.auth.me(); } catch { me = null; }
    if (!me?.id || !me?.email) return Response.json({ error: 'not authenticated', code: 'unauthenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const fn = ACTIONS[action];
    if (!fn) return Response.json({ error: 'unknown action', code: 'unknown_action' }, { status: 400 });

    const data = await fn(base44.asServiceRole.entities, me, body);

    // Admin heads-up on a new receipt. Outside the action so a mail failure
    // can never undo or fail the student's submission.
    if (action === 'submit' && data?.payment) {
      try {
        const p = data.payment;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ADMIN_EMAIL,
          subject: `QR to'lov: ${clean(displayName(me))} — ${p.payment_code}`,
          body: `Yangi QR to'lov cheki yuborildi.\n\n👤 ${clean(displayName(me))}\n📧 ${clean(me.email)}\n📦 ${p.plan} · ${p.billing_cycle}\n💰 ${p.amount_uzs} so'm\n🔖 Kod: ${p.payment_code}\n\nBank ilovangizda tushumni tekshiring, keyin tasdiqlang:\nhttps://virora.space/admin-qr-payments`,
        });
      } catch (e) {
        console.error('qrPayApi notify failed:', (e as any)?.message);
      }
      delete data.notify;
    }

    return Response.json({ ok: true, ...data });
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('qrPayApi error:', error);
    return Response.json({ error: (error as any)?.message || 'server error', code: 'server_error' }, { status: 500 });
  }
});
