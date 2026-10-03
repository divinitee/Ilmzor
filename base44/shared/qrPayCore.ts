// Shared core for Humo / Uzcard QR payments (2026-10-02).
// Used by base44/functions/qrPayApi (site + admin page) and
// base44/functions/telegramPayBot (Approve/Reject from Telegram), so an
// approval behaves exactly the same whichever button the admin pressed.
//
// Every function here takes `svc` = base44.asServiceRole.entities. Callers
// are responsible for having checked WHO is acting before calling.

export const PLAN_NAMES: Record<string, string> = { learner: 'Learner Plan', vip: 'VIP Plan' };
export const PLANS = ['learner', 'vip'];
export const CYCLES = ['monthly', 'yearly'];

export const nowIso = () => new Date().toISOString();
export const todayUtc = () => new Date().toISOString().slice(0, 10);
export const clean = (v: unknown, n = 120) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);
export const isRealPlan = (sub: any) => !!sub?.plan && !/free/i.test(sub.plan);

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

export async function loadSettings(svc: any) {
  const rows = await svc.PaymentSettings.list('-updated_date', 1);
  return rows?.[0] || null;
}

export function addPeriod(fromDate: string, cycle: string) {
  const d = new Date(`${fromDate}T00:00:00Z`);
  if (cycle === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

// Same row selection as studentApi.findSub: a live row wins, then newest.
export async function findSub(svc: any, email: string, userId: string) {
  let rows = await svc.StudentSubscription.filter({ phone: email });
  if (!rows?.length) rows = await svc.StudentSubscription.filter({ created_by_id: userId });
  if (!rows?.length) return null;
  const rank = (s: any) => (s.status === 'active' ? 2 : 0) + (s.dodo_subscription_id ? 1 : 0);
  return [...rows].sort((a, b) =>
    rank(b) - rank(a) || String(b.updated_date || '').localeCompare(String(a.updated_date || '')),
  )[0];
}

// Approve or reject one ManualPayment. `reviewer` is a label for the record
// (the admin's email, or "telegram:<chat id>").
export async function reviewPayment(svc: any, paymentId: string, decision: string, note: string, reviewer: string) {
  if (!paymentId || !['approve', 'reject'].includes(decision)) throw new ApiError(400, 'bad_request');
  const p = await svc.ManualPayment.get(paymentId).catch(() => null);
  if (!p) throw new ApiError(404, 'not_found');
  if (p.status === 'approved' || p.status === 'rejected') throw new ApiError(409, 'already_reviewed');

  if (decision === 'reject') {
    const updated = await svc.ManualPayment.update(p.id, {
      status: 'rejected', admin_note: clean(note, 500), reviewed_at: nowIso(), reviewed_by: reviewer,
    });
    return { payment: updated, subscription: null };
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
    admin_note: clean(note, 500),
    reviewed_at: nowIso(),
    reviewed_by: reviewer,
    subscription_id: row?.id || '',
  });
  return { payment: updated, subscription: row };
}

// ------------------------------------------------------------- Telegram

export async function tg(token: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!data?.ok) throw new Error(`telegram ${method}: ${data?.description || res.status}`);
  return data.result;
}

const fmtUzs = (n: unknown) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

export function paymentCaption(p: any, status?: string) {
  const plan = `${p.plan === 'vip' ? 'VIP' : 'Learner'} · ${p.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'}`;
  const lines = [
    `🧾 <b>QR payment</b> · <code>${esc(p.payment_code)}</code>`,
    `👤 ${esc(p.user_name || '—')}`,
    `📧 ${esc(p.user_email)}`,
    `📦 ${plan}`,
    `💰 <b>${fmtUzs(p.amount_uzs)} UZS</b>`,
  ];
  if (status) lines.push('', status);
  else lines.push('', 'Check Paynet for an incoming payment of exactly this amount with this code in the comment.');
  return lines.join('\n');
}

export const reviewKeyboard = (paymentId: string) => ({
  inline_keyboard: [[
    { text: '✅ Approve', callback_data: `ap:${paymentId}` },
    { text: '❌ Reject', callback_data: `rj:${paymentId}` },
  ]],
});

// Push a freshly submitted receipt to the linked admin chat. Never throws:
// a Telegram hiccup must not fail the student's submission.
export async function notifyTelegram(base44: any, token: string | undefined, settings: any, p: any) {
  try {
    if (!token || !settings?.tg_admin_chat_id) return false;
    const chat_id = settings.tg_admin_chat_id;
    let photo = '';
    if (p.receipt_uri) {
      const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri: p.receipt_uri, expires_in: 900,
      });
      photo = signed?.signed_url || '';
    }
    const caption = paymentCaption(p);
    const reply_markup = reviewKeyboard(p.id);
    if (photo) {
      try {
        await tg(token, 'sendPhoto', { chat_id, photo, caption, parse_mode: 'HTML', reply_markup });
        return true;
      } catch (e) {
        console.error('sendPhoto failed, falling back to text:', (e as any)?.message);
      }
    }
    await tg(token, 'sendMessage', { chat_id, text: caption, parse_mode: 'HTML', reply_markup });
    return true;
  } catch (e) {
    console.error('notifyTelegram failed:', (e as any)?.message);
    return false;
  }
}

export const randomToken = (bytes = 24) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('');

export const randomDigits = (n = 6) => {
  const v = crypto.getRandomValues(new Uint32Array(1))[0] % 10 ** n;
  return String(v).padStart(n, '0');
};
