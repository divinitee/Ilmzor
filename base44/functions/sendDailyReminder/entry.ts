import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all users (service role) — these are the people who installed/registered
    const users = await base44.asServiceRole.entities.User.list();

    let sent = 0;
    for (const u of users) {
      if (!u.email) continue;
      // Skip users who disabled notifications
      if (u.notifications_enabled === false) continue;
      const name = u.full_name || u.email.split('@')[0];
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: u.email,
        subject: "📚 Bugun so'z o'rganishni unutmang!",
        body: `Assalomu alaykum, ${name}!\n\nBugungi kun uchun 10-15 daqiqa vaqt ajratib yangi so'zlarni o'rganing va test topshiring. Har kuni muntazam mashq — eng samarali usul! 🎯\n\nSo'zlar ro'yxati va o'yinlar sizni kutmoqda.\n\nHurmat bilan,\nVocabulary Master jamoasi`
      });
      sent++;
    }

    return Response.json({ success: true, sent, total: users.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});