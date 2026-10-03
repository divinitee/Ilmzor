import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { secrets } from 'base44:runtime';
import { ApiError, loadSettings, reviewPayment, paymentCaption, tg } from '../../shared/qrPayCore.ts';

// telegramPayBot: Telegram webhook for the VIRORA payments bot (2026-10-02).
//
// What it does:
//  - qrPayApi pushes each new QR receipt to the linked admin chat with
//    ✅ Tasdiqlash / ❌ Rad etish buttons. Pressing one lands here and runs
//    the same shared reviewPayment() the admin page uses.
//  - "/start <code>" with the one-time code from /admin-qr-payments links the
//    admin's Telegram. Only that one chat can ever approve.
//
// Security — this URL is public, so:
//  - Every request must carry X-Telegram-Bot-Api-Secret-Token equal to the
//    random secret set by qrPayApi.tgSetup. Anything else gets 401 and
//    touches nothing.
//  - Button presses are only honoured from the linked admin chat id.
//  - Link codes are 6 digits, single-use, private chats only, 15-minute TTL.
//
// Secret: VIRORA_payment_BOT_tg (the payments bot token).

const ERR_TEXT: Record<string, string> = {
  already_reviewed: 'This payment has already been reviewed.',
  no_receipt_yet: 'No receipt has been sent yet.',
  has_active_card_subscription: 'This student already has an active card (Dodo) subscription — sort it out manually.',
  not_found: 'Payment not found.',
};

function sameSecret(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const token = secrets.get('VIRORA_payment_BOT_tg') || '';
  if (!token) return new Response('bot not configured', { status: 503 });

  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const settings = await loadSettings(svc);

    // 1. Authenticate Telegram before anything else.
    const header = req.headers.get('x-telegram-bot-api-secret-token') || '';
    if (!sameSecret(header, settings?.tg_webhook_secret || '')) {
      return new Response('unauthorized', { status: 401 });
    }

    const update = await req.json().catch(() => ({}));
    const adminChat = String(settings?.tg_admin_chat_id || '');

    // 2. Messages: linking, or a short status reply.
    if (update.message) {
      const msg = update.message;
      const chatId = String(msg.chat?.id || '');
      const text = String(msg.text || '').trim();
      const code = (text.match(/^\/(?:start|link)\s+(\d{6})$/) || text.match(/^(\d{6})$/) || [])[1];

      if (code && msg.chat?.type === 'private') {
        const valid = settings?.tg_link_code && settings.tg_link_code === code
          && settings.tg_link_expires_at && new Date(settings.tg_link_expires_at) > new Date();
        if (valid) {
          await svc.PaymentSettings.update(settings.id, {
            tg_admin_chat_id: chatId, tg_link_code: '', tg_link_expires_at: '',
          });
          await tg(token, 'sendMessage', {
            chat_id: chatId,
            text: '✅ Connected! Every new QR payment receipt will arrive here — check your bank, then tap Approve or Reject.',
          });
        } else {
          await tg(token, 'sendMessage', { chat_id: chatId, text: 'That code is wrong or expired. Get a new one on the admin page.' });
        }
        return Response.json({ ok: true });
      }

      if (chatId === adminChat) {
        await tg(token, 'sendMessage', {
          chat_id: chatId,
          text: 'Bot connected. New payments arrive here. All payments: https://virora.space/admin-qr-payments',
        });
      } else if (msg.chat?.type === 'private') {
        await tg(token, 'sendMessage', { chat_id: chatId, text: 'Bu VIRORA ichki boti. Savollar uchun: @viroraspace' });
      }
      return Response.json({ ok: true });
    }

    // 3. Button presses: approve / reject — linked admin only.
    if (update.callback_query) {
      const cq = update.callback_query;
      const fromId = String(cq.from?.id || '');
      if (!adminChat || fromId !== adminChat) {
        await tg(token, 'answerCallbackQuery', { callback_query_id: cq.id, text: "Ruxsat yo'q.", show_alert: true });
        return Response.json({ ok: true });
      }

      const [kind, paymentId] = String(cq.data || '').split(':');
      const decision = kind === 'ap' ? 'approve' : kind === 'rj' ? 'reject' : '';
      let statusLine = '';
      let current: any = null;
      try {
        const res = await reviewPayment(svc, paymentId, decision, '', `telegram:${fromId}`);
        current = res.payment;
        statusLine = decision === 'approve'
          ? `✅ <b>Approved</b> · plan active until ${res.subscription?.expires_at || ''}`
          : '❌ <b>Rejected</b>';
        await tg(token, 'answerCallbackQuery', { callback_query_id: cq.id, text: decision === 'approve' ? 'Approved ✅' : 'Rejected' });
      } catch (e) {
        const code = e instanceof ApiError ? e.code : 'server_error';
        await tg(token, 'answerCallbackQuery', {
          callback_query_id: cq.id, text: ERR_TEXT[code] || 'Xatolik. Admin sahifasidan urinib ko‘ring.', show_alert: true,
        });
        if (code !== 'already_reviewed') return Response.json({ ok: true });
        current = await svc.ManualPayment.get(paymentId).catch(() => null);
        statusLine = current?.status === 'approved' ? '✅ <b>Already approved</b>' : '❌ <b>Already rejected</b>';
      }

      // Replace the buttons with the outcome so the chat stays a clean log.
      if (current && cq.message) {
        const base = { chat_id: cq.message.chat.id, message_id: cq.message.message_id, parse_mode: 'HTML', reply_markup: { inline_keyboard: [] } };
        const caption = paymentCaption(current, statusLine);
        try {
          if (cq.message.photo) await tg(token, 'editMessageCaption', { ...base, caption });
          else await tg(token, 'editMessageText', { ...base, text: caption });
        } catch (e) {
          console.error('edit message failed:', (e as any)?.message);
        }
      }
      return Response.json({ ok: true });
    }

    return Response.json({ ok: true, ignored: true });
  } catch (error) {
    console.error('telegramPayBot error:', error);
    // 200 so Telegram doesn't retry a poison update forever; it's logged.
    return Response.json({ ok: false });
  }
});
