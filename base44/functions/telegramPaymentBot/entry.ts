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

// Telegram lets a webhook be registered with a secret_token that it echoes back
// on every update in the X-Telegram-Bot-Api-Secret-Token header. Deriving it
// from the bot token (which only we hold) means no extra secret to manage,
// and the raw token itself never leaves the server.
async function webhookSecret(token) {
  const bytes = new TextEncoder().encode("virora-tg-webhook:" + token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyScreenshot(base44, token, fileId) {
  try {
    const fileInfo = await tgCall(token, "getFile", { file_id: fileId });
    const filePath = fileInfo.result?.file_path;
    if (!filePath) return null;

    const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: "Analyze this image and determine if it is a valid payment receipt, bank transfer confirmation, or mobile wallet payment screenshot (e.g., Click, Payme, Uzum, Humo, Uzcard apps). Look for: payment amount, date, transaction ID/reference, merchant/payee name, or a banking app interface. Respond with the JSON schema provided.",
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          is_valid_payment: { type: "boolean" },
          confidence: { type: "number" },
          detected_amount: { type: "string" },
          detected_app: { type: "string" },
          notes: { type: "string" }
        }
      }
    });

    return {
      verified: llmResult.is_valid_payment === true && llmResult.confidence >= 0.7,
      confidence: llmResult.confidence || 0,
      amount: llmResult.detected_amount || "",
      app: llmResult.detected_app || "",
      notes: llmResult.notes || ""
    };
  } catch (e) {
    return null;
  }
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
      let url = body.webhookUrl;
      if (!url) {
        const info = await tgCall(token, "getWebhookInfo", {});
        url = info.result?.url;
      }
      if (!url) return Response.json({ error: "webhookUrl is required" }, { status: 400 });
      const r = await tgCall(token, "setWebhook", { url, secret_token: await webhookSecret(token) });
      return Response.json({ ok: r.ok, description: r.description });
    }

    // --- Telegram webhook update ---
    // Anyone can reach this URL, so only accept updates that carry the secret
    // Telegram was registered with. A forged POST is rejected before it can
    // touch any subscription.
    const presented = req.headers.get("x-telegram-bot-api-secret-token") || "";
    if (!presented || presented !== await webhookSecret(token)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const update = body;

    // Handle callback query (admin approve / reject buttons)
    if (update.callback_query) {
      const cq = update.callback_query;
      const [action, subId] = (cq.data || "").split(":");

      await tgCall(token, "answerCallbackQuery", { callback_query_id: cq.id });

      if (action !== "approve" && action !== "reject") {
        return Response.json({ ok: true });
      }

      // Approve/Reject buttons are only ever sent to the admin chat; a press
      // arriving from any other chat is not a real admin decision.
      if (!adminChatId || String(cq.message?.chat?.id) !== String(adminChatId)) {
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

      // Photo or document (payment screenshot) — AI verified
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

        // Get file ID
        let fileId = null;
        let photoFileId = null;
        if (msg.photo) {
          photoFileId = msg.photo[msg.photo.length - 1].file_id;
          fileId = photoFileId;
        } else if (msg.document) {
          fileId = msg.document.file_id;
        }

        // Run AI verification
        const aiResult = await verifyScreenshot(base44, token, fileId);
        const isVerified = aiResult?.verified || false;

        // Update subscription with verification result
        const updateData = {
          status: "pending",
          screenshot_verified: isVerified
        };
        if (aiResult?.notes) {
          updateData.description = `${aiResult.notes}${aiResult.amount ? ` | Amount: ${aiResult.amount}` : ""}${aiResult.app ? ` | App: ${aiResult.app}` : ""}`;
        }
        await base44.asServiceRole.entities.StudentSubscription.update(sub.id, updateData);

        // Build caption with AI assessment
        let caption = `📋 Payment Verification\n👤 ${sub.student_name}\n📧 ${sub.phone}\n🧾 Ref: ${sub.payment_ref || "—"}\n📦 Plan: ${sub.plan || "Not set"} (${sub.billing_cycle || "monthly"})`;
        if (aiResult) {
          if (isVerified) {
            caption += `\n🤖 AI: ✅ Valid payment (${Math.round(aiResult.confidence * 100)}%)`;
            if (aiResult.amount) caption += `\n💰 Amount: ${aiResult.amount}`;
            if (aiResult.app) caption += `\n📱 App: ${aiResult.app}`;
          } else {
            caption += `\n🤖 AI: ⚠️ ${aiResult.notes || "Could not verify"} (${Math.round(aiResult.confidence * 100)}%)`;
          }
        } else {
          caption += `\n🤖 AI: ⚠️ Verification unavailable`;
        }

        const keyboard = {
          inline_keyboard: [[
            { text: "✅ Approve", callback_data: `approve:${sub.id}` },
            { text: "❌ Reject", callback_data: `reject:${sub.id}` }
          ]]
        };

        // Forward to admin
        if (msg.photo) {
          await tgCall(token, "sendPhoto", {
            chat_id: adminChatId,
            photo: photoFileId,
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

        // Notify student
        await tgCall(token, "sendMessage", {
          chat_id: chatId,
          text: isVerified
            ? "✅ Screenshot verified by AI! Your payment is being reviewed. You'll be notified once it's approved."
            : "📤 Screenshot sent for verification! You'll be notified once it's reviewed."
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