import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Compute the date exactly 3 days from now (Asia/Tashkent), as YYYY-MM-DD
    const now = new Date();
    const target = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const targetDateStr = target.toISOString().split('T')[0];

    const activeSubs = await base44.asServiceRole.entities.StudentSubscription.filter({ status: 'active' });
    const expiringSoon = activeSubs.filter(s => s.expires_at && s.expires_at.startsWith(targetDateStr));

    let sent = 0;
    for (const sub of expiringSoon) {
      if (!sub.phone) continue;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: sub.phone,
        subject: "Obunangiz muddati tugashiga 3 kun qoldi",
        body: `Assalomu alaykum, ${sub.student_name || ''}!\n\nSizning "${sub.plan || 'obuna'}" rejangiz ${sub.expires_at} sanasida tugaydi. Platformadan foydalanishni davom ettirish uchun obunani yangilashni unutmang.\n\nHurmat bilan,\nVocabulary Master jamoasi`
      });
      sent++;
    }

    return Response.json({ success: true, sent, checkedDate: targetDateStr });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});