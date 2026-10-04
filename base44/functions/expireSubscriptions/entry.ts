import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { expiryPatch, isPastEnd } from '../../shared/subscriptionCore.js';

// expireSubscriptions (VT-36, 2026-10-04): daily sweep. Applies the same
// expiry transition as studentApi.refresh to every active row whose end has
// passed, so students who never come back stop counting as active.
// Idempotent: a second run finds nothing due. Dodo card rows are skipped
// (webhooks own them) and only reported. Each change is audited.
// Body: { dry_run?: boolean }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let me: any = null;
    try { me = await base44.auth.me(); } catch { me = null; }
    // Scheduled runs have no user; a signed-in caller must be an admin.
    if (me && me.role !== 'admin') return Response.json({ error: 'admin_only' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const dry = body?.dry_run === true;
    const svc = base44.asServiceRole.entities;
    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);

    const due: any[] = [];
    let cursor: string | undefined;
    do {
      const page: any = await svc.StudentSubscription.filter(
        { status: 'active', expires_at: { $lte: today } },
        { sort: 'created_date', limit: 500, ...(cursor ? { cursor } : {}) },
      );
      for (const s of page.items || []) if (isPastEnd(s, now)) due.push(s);
      cursor = page.has_more ? page.next_cursor : undefined;
    } while (cursor);

    const changed: any[] = [], cardRowsPastEnd: any[] = [];
    for (const s of due) {
      if (s.provider === 'dodo') { cardRowsPastEnd.push({ id: s.id, email: s.phone, expires_at: s.expires_at }); continue; }
      const patch = expiryPatch(s, now);
      if (!patch) continue;
      changed.push({ id: s.id, email: s.phone, patch });
      if (dry) continue;
      await svc.StudentSubscription.update(s.id, patch);
      await svc.AdminAuditLog.create({
        ts: new Date().toISOString(), action: 'expire_subscription', outcome: 'ok', channel: 'system',
        target_type: 'StudentSubscription', target_id: s.id,
        before: JSON.stringify({ status: s.status, plan: s.plan, is_trial: s.is_trial, expires_at: s.expires_at }),
        after: JSON.stringify(patch),
      });
    }
    if (cardRowsPastEnd.length) console.warn('Dodo rows past end (not touched):', JSON.stringify(cardRowsPastEnd));
    return Response.json({ ok: true, dry_run: dry, checked: due.length, changed: changed.length, changes: changed, cardRowsPastEnd });
  } catch (error) {
    console.error('expireSubscriptions error:', error);
    return Response.json({ ok: false, error: (error as any)?.message || 'server error' }, { status: 500 });
  }
});