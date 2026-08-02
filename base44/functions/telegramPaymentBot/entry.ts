import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

async function tgCall(token, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const token = secrets.get("TELEGRAM_BOT_TOKEN");
    const adminChatId = secrets.get("TELEGRAM_ADMIN_CHAT_ID");

    if (!token) return Response.json({ error: "Bot not configured" }, { status: 500 });

    const body = await req.json();

    // --- Frontend: get bot info (public) ---
    if (body.action === "getBotInfo") {
      const r = await tgCall(token, "getMe", {});
      return Response.json({ username: r.result?.username || null });
    }

    // --- Frontend: register webhook (admin only) ---
    if (body.action === "setupWebhook") {
      const user = await base44.auth.me();
      if (!user || user.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      const r = await tgCall(token, "setWebhook", { url: body.webhookUrl });
      return Response.json({ ok: r.ok, description: r.description });
    }

    // --- Telegram webhook update ---
    const update = body;

    // Handle callback query (admin approve / reject buttons)
    if (update.callback_query) {
      const cq = update.callback_query;
      const [action, subId] = (cq.data || "").split(":");

      await tgCall(token, "answerCallbackQuery", { callback_query_id: cq.id });

      if (action !== "approve" && action !== "reject") {
        return Response.json({ ok: true });
      }

      let sub;
      try {
        sub = await base44.asServiceRole.entities.StudentSubscription.get(subId);
      } catch {
        return Response.json({ ok: true });
      }

      if (action === "approve") {
        const now = new Date();
        const expires = new Date(now);
        if (sub.billing_cycle === "yearly") {
          expires.setFullYear(expires.getFullYear() + 1);
        } else {
          expires.setMonth(expires.getMonth() + 1);
        }
        const expiresAt = expires.toISOString().split("T")[0];

        await base44.asServiceRole.entities.StudentSubscription.update(subId, {
          status: "active",
          expires_at: expiresAt
        });

        if (sub.telegram_chat_id) {
          await tgCall(token, "sendMessage", {
            chat_id: sub.telegram_chat_id,
            text: `✅ Your payment has been verified!\nYour subscription is active until ${expiresAt}.`
          });
        }

        await tgCall(token, "editMessageReplyMarkup", {
          chat_id: cq.message.chat.id,
          message_id: cq.message.message_id,
          reply_markup: { inline_keyboard: [[{ text: "✅ Approved", callback_data: "noop" }]] }
        });
      } else if (action === "reject") {
        await base44.asServiceRole.entities.StudentSubscription.update(subId, {
          status: "inactive"
        });

        if (sub.telegram_chat_id) {
          await tgCall(token, "sendMessage", {
            chat_id: sub.telegram_chat_id,
            text: "❌ Your payment could not be verified. Please check your payment and try again, or contact support."
          });
        }

        await tgCall(token, "editMessageReplyMarkup", {
          chat_id: cq.message.chat.id,
          message_id: cq.message.message_id,
          reply_markup: { inline_keyboard: [[{ text: "❌ Rejected", callback_data: "noop" }]] }
        });
      }

      return Response.json({ ok: true });
    }

    // Handle incoming message
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;

      // /start
      if (msg.text === "/start") {
        await tgCall(token, "sendMessage", {
          chat_id: chatId,
          text: "👋 Welcome! Send your email address to link your account, then send your payment screenshot for fast verification."
        });
        return Response.json({ ok: true });
      }

      // Email linking
      if (msg.text && msg.text.includes("@") && msg.text.includes(".")) {
        const email = msg.text.trim().toLowerCase();
        const subs = await base44.asServiceRole.entities.StudentSubscription.filter({ phone: email });
        if (subs.length > 0) {
          await base44.asServiceRole.entities.StudentSubscription.update(subs[0].id, {
            telegram_chat_id: String(chatId),
            status: "pending"
          });
        } else {
          await base44.asServiceRole.entities.StudentSubscription.create({
            student_name: email.split("@")[0],
            phone: email,
            status: "pending",
            telegram_chat_id: String(chatId)
          });
        }
        await tgCall(token, "sendMessage", {
          chat_id: chatId,
          text: `✅ Linked to ${email}. Now send your payment screenshot!`
        });
        return Response.json({ ok: true });
      }

      // Photo or document (payment screenshot)
      if (msg.photo || msg.document) {
        const subs = await base44.asServiceRole.entities.StudentSubscription.filter({ telegram_chat_id: String(chatId) });
        if (subs.length === 0) {
          await tgCall(token, "sendMessage", {
            chat_id: chatId,
            text: "Please send your email first to link your account."
          });
          return Response.json({ ok: true });
        }
        const sub = subs[0];

        const caption = `📋 Payment Verification\n👤 ${sub.student_name}\n📧 ${sub.phone}\n🧾 Ref: ${sub.payment_ref || "—"}\n📦 Plan: ${sub.plan || "Not set"} (${sub.billing_cycle || "monthly"})`;
        const keyboard = {
          inline_keyboard: [[
            { text: "✅ Approve", callback_data: `approve:${sub.id}` },
            { text: "❌ Reject", callback_data: `reject:${sub.id}` }
          ]]
        };

        if (msg.photo) {
          const photo = msg.photo[msg.photo.length - 1];
          await tgCall(token, "sendPhoto", {
            chat_id: adminChatId,
            photo: photo.file_id,
            caption,
            reply_markup: keyboard
          });
        } else if (msg.document) {
          await tgCall(token, "sendDocument", {
            chat_id: adminChatId,
            document: msg.document.file_id,
            caption,
            reply_markup: keyboard
          });
        }

        await tgCall(token, "sendMessage", {
          chat_id: chatId,
          text: "📤 Screenshot sent for verification! You'll be notified once it's reviewed."
        });
        return Response.json({ ok: true });
      }

      // Other text — treat as payment reference if already linked
      if (msg.text) {
        const subs = await base44.asServiceRole.entities.StudentSubscription.filter({ telegram_chat_id: String(chatId) });
        if (subs.length > 0) {
          await base44.asServiceRole.entities.StudentSubscription.update(subs[0].id, {
            payment_ref: msg.text,
            status: "pending"
          });
          await tgCall(token, "sendMessage", {
            chat_id: chatId,
            text: "🧾 Payment reference saved. Don't forget to send your screenshot too!"
          });
          return Response.json({ ok: true });
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}