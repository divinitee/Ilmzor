import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { secrets } from 'base44:runtime';
import {
  PLANS, CYCLES, ApiError, clean, nowIso, loadSettings, reviewPayment,
  notifyTelegram, tg, randomToken, randomDigits,
} from '../../shared/qrPayCore.ts';

// qrPayApi: Humo / Uzcard payments by QR code, in so'm, confirmed by hand.
// (2026-10-02)
//
// The flow:
//   1. Student picks a plan on /pricing → "start" creates a ManualPayment with
//      a VR-xxxxxx code and the so'm amount from PaymentSettings.
//   2. Student scans the QR in their bank app, pays, writes the code in the
//      comment, uploads the receipt → "submit" marks it pending, emails the
//      admin and, if linked, pushes it to the admin's Telegram with
//      Approve / Reject buttons (base44/functions/telegramPayBot).
//   3. Admin checks the money actually arrived, then approves (which
//      activates the StudentSubscription) or rejects — on /admin-qr-payments
//      or in Telegram. Both go through shared/qrPayCore.reviewPayment.
//
// Security rules, same as studentApi:
//  - Identity always comes from the session (auth.me()), never the payload.
//  - The amount always comes from PaymentSettings on the server, never the
//    browser, so a tampered client cannot "start" a 1-so'm VIP payment.
//  - ManualPayment and PaymentSettings are admin-only for writes (RLS). Only
//    this function and telegramPayBot (service role) change them.
//  - A receipt is never proof on its own. Access is only granted by an admin
//    pressing Approve after checking their bank, so a fake screenshot buys
//    nothing.
//
// Secrets: VIRORA_payment_BOT_tg — the payments bot token (optional — Telegram features stay off without
// it), TG_WEBHOOK_URL (optional override of the bot webhook URL).

const MAX_OPEN_PER_USER = 3;
const ADMIN_EMAIL = 'gameboey0191@gmail.com';
const DEFAULT_WEBHOOK_URL = 'https://base44.app/api/apps/6a40f974860993eff3634df0/functions/telegramPayBot';

const displayName = (u: any) => u?.display_name || u?.full_name || u?.email || '';
const botToken = () => secrets.get('VIRORA_payment_BOT_tg') || '';

// ------------------------------------------------------------- settings

const SETTINGS_FIELDS = [
  'qr_enabled', 'qr_image_url', 'qr_payload', 'recipient_name', 'telegram_handle', 'activation_hours',
  'price_uzs_learner_monthly', 'price_uzs_learner_yearly', 'price_uzs_vip_monthly', 'price_uzs_vip_yearly',
];

const priceOf = (s: any, plan: string, cycle: string) => {
  const n = Number(s?.[`price_uzs_${plan}_${cycle}`]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

// Ready means a student can actually finish a payment: switched on, a QR to
// scan, and a price for every plan/cycle the pricing page offers.
function readiness(s: any) {
  if (!s) return false;
  if (!s.qr_enabled || (!s.qr_image_url && !s.qr_payload)) return false;
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

// What the admin page may see of the settings row: never the webhook secret.
function adminSettingsView(s: any) {
  if (!s) return null;
  const { tg_webhook_secret: _secret, tg_link_code: _code, ...rest } = s;
  return rest;
}

function telegramStatus(s: any) {
  return {
    token_set: !!botToken(),
    linked: !!s?.tg_admin_chat_id,
    bot_username: s?.tg_bot_username || '',
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
      image_url: settings.qr_image_url || '',
      // The raw text inside the bank QR. The page redraws it in the plan's
      // style; the money goes wherever this text says, so it is admin-set only.
      payload: settings.qr_payload || '',
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
  // Notifications are sent by the router after this returns.
  return { payment: studentView(updated), _notify: updated };
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
  const sort = status === 'pending' ? 'submitted_at' : '-updated_date';
  const rows = await svc.ManualPayment.filter(query, sort, status === 'all' ? 2000 : 200);
  return { payments: rows || [] };
}

async function review(svc: any, me: any, body: any) {
  requireAdmin(me);
  return reviewPayment(svc, String(body.payment_id || ''), String(body.decision || ''), String(body.note || ''), me.email);
}

async function getSettings(svc: any, me: any) {
  requireAdmin(me);
  const s = await loadSettings(svc);
  return { settings: adminSettingsView(s), config: publicConfig(s), telegram: telegramStatus(s) };
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
    } else if (k === 'qr_payload') {
      const p = String(v || '').trim();
      if (p.length > 1000 || /[\r\n]/.test(p)) throw new ApiError(400, 'bad_qr_payload');
      patch[k] = p;
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
  return { settings: adminSettingsView(saved), config: publicConfig(saved), telegram: telegramStatus(saved) };
}

// Point the bot at telegramPayBot with a fresh secret and hand the admin a
// one-time code to send to the bot. Whoever sends that code (within 15 min)
// becomes the only chat allowed to approve.
async function tgSetup(svc: any, me: any) {
  requireAdmin(me);
  const token = botToken();
  if (!token) throw new ApiError(409, 'bot_token_missing');

  const bot = await tg(token, 'getMe', {}).catch((e) => { throw new ApiError(502, 'bot_token_invalid', e.message); });
  const secret = randomToken(24);
  const url = secrets.get('TG_WEBHOOK_URL') || DEFAULT_WEBHOOK_URL;
  await tg(token, 'setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  }).catch((e) => { throw new ApiError(502, 'set_webhook_failed', e.message); });

  const code = randomDigits(6);
  const patch = {
    tg_webhook_secret: secret,
    tg_bot_username: bot?.username || '',
    tg_link_code: code,
    tg_link_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
  const existing = await loadSettings(svc);
  const saved = existing ? await svc.PaymentSettings.update(existing.id, patch) : await svc.PaymentSettings.create(patch);
  return { link_code: code, bot_username: saved.tg_bot_username, telegram: telegramStatus(saved) };
}

async function tgUnlink(svc: any, me: any) {
  requireAdmin(me);
  const existing = await loadSettings(svc);
  if (!existing) return { telegram: telegramStatus(null) };
  const saved = await svc.PaymentSettings.update(existing.id, { tg_admin_chat_id: '', tg_link_code: '', tg_link_expires_at: '' });
  return { telegram: telegramStatus(saved) };
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
  tgSetup: (svc, me) => tgSetup(svc, me),
  tgUnlink: (svc, me) => tgUnlink(svc, me),
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

    const svc = base44.asServiceRole.entities;
    const data = await fn(svc, me, body);

    // New receipt: tell the admin by email and Telegram. Outside the action
    // so a failed notification can never undo the student's submission.
    if (action === 'submit' && data?._notify) {
      const p = data._notify;
      delete data._notify;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: ADMIN_EMAIL,
          subject: `QR payment: ${clean(displayName(me))} — ${p.payment_code}`,
          body: `New QR payment receipt submitted.\n\n👤 ${clean(displayName(me))}\n📧 ${clean(me.email)}\n📦 ${p.plan} · ${p.billing_cycle}\n💰 ${p.amount_uzs} UZS\n🔖 Code: ${p.payment_code}\n\nCheck your bank app for the incoming payment, then approve it here:\nhttps://virora.space/admin-qr-payments`,
        });
      } catch (e) {
        console.error('qrPayApi email failed:', (e as any)?.message);
      }
      try {
        await notifyTelegram(base44, botToken(), await loadSettings(svc), p);
      } catch (e) {
        console.error('qrPayApi telegram failed:', (e as any)?.message);
      }
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
