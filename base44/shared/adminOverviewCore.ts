// Admin Console Overview numbers (VT-35 P1). Pure: takes rows, returns counts.
//
// subscriptionKind() comes from shared/subscriptionCore.js, the same file
// src/lib/subscription.js (and so /admin) uses.
//
// Two traps this file exists to avoid (both verified on live data 2026-10-04):
//  - A trial row reads status "active". Counting by status would call every
//    trial a paying student. Classify with subscriptionKind instead.
//  - Expiry is applied lazily (studentApi "refresh" runs when the student next
//    opens the app). A paid row past expires_at still reads "active" until
//    then, so "paying" also requires the period not to have ended.

import { subscriptionKind } from './subscriptionCore.js';
export { subscriptionKind };

const DAY_MS = 24 * 60 * 60 * 1000;
// VIRORA's business day: Uzbekistan, UTC+5, no DST.
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

const localDate = (ms: number) => new Date(ms + TZ_OFFSET_MS).toISOString().slice(0, 10);
const localMonth = (ms: number) => new Date(ms + TZ_OFFSET_MS).toISOString().slice(0, 7);
const dateOf = (v: unknown) => (v ? String(v).slice(0, 10) : '');
export const displayName = (u: any) => u?.display_name || u?.full_name || u?.email || '';

export function computeOverview(input: { users: any[]; subs: any[]; payments: any[]; now: number }) {
  const { users = [], subs = [], payments = [], now } = input;
  const today = localDate(now);
  const in2days = localDate(now + 2 * DAY_MS);
  const weekAgo = now - 7 * DAY_MS;
  const month = localMonth(now);

  const signups7d = users.filter((u) => {
    const t = Date.parse(u?.created_date || '');
    return Number.isFinite(t) && t >= weekAgo;
  }).length;

  let paying = 0;
  let lapsedUnrefreshed = 0;
  let trialsEnding48h = 0;
  for (const s of subs) {
    const kind = subscriptionKind(s, null); // raw: this loop counts un-refreshed rows itself
    const exp = dateOf(s.expires_at);
    if (kind === 'paid' || kind === 'ending') {
      if (exp && exp < today) lapsedUnrefreshed++;
      else paying++;
    }
    if (kind === 'trial' && exp && exp >= today && exp <= in2days) trialsEnding48h++;
  }

  const pendingQr = payments.filter((p) => p.status === 'pending');
  const pendingTeachers = users.filter((u) => u.teacher_status === 'pending');

  const revenueQrUzs = payments
    .filter((p) => p.status === 'approved' && p.reviewed_at && localMonth(Date.parse(p.reviewed_at)) === month)
    .reduce((sum, p) => sum + (Number(p.amount_uzs) || 0), 0);

  const needsYou = [
    ...pendingQr
      .sort((a, b) => String(a.submitted_at || '').localeCompare(String(b.submitted_at || '')))
      .map((p) => ({
        kind: 'qr_payment',
        id: p.id,
        title: `${p.user_name || p.user_email || 'Someone'} paid for ${p.plan} (${p.billing_cycle})`,
        sub: `${Number(p.amount_uzs || 0).toLocaleString('en-US')} so'm · code ${p.payment_code || '—'}`,
        since: p.submitted_at || p.created_date || null,
        link: '/admin-qr-payments',
      })),
    ...pendingTeachers.map((u) => ({
      kind: 'teacher_application',
      id: u.id,
      title: `${displayName(u)} applied to teach`,
      sub: [u.teaching_center, u.email].filter(Boolean).join(' · '),
      since: u.updated_date || u.created_date || null,
      link: '/admin',
    })),
  ];

  return {
    as_of: new Date(now).toISOString(),
    counters: {
      signups_7d: signups7d,
      trials_ending_48h: trialsEnding48h,
      pending_qr_payments: pendingQr.length,
      pending_teacher_applications: pendingTeachers.length,
      paying_students: paying,
      lapsed_not_refreshed: lapsedUnrefreshed,
      revenue_month_qr_uzs: revenueQrUzs,
      // No per-payment record for card payments yet (decision C → P3
      // CardPayment ledger). Shown as "not tracked yet", never as 0.
      revenue_month_card_usd: null,
    },
    month,
    needs_you: needsYou,
  };
}