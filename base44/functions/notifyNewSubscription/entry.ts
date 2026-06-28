import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const sub = payload.data;
    if (!sub) return Response.json({ ok: true, skipped: "no data" });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: "ilmzor.uz@gmail.com",
      subject: `Yangi to'lov: ${sub.student_name} — tasdiqlash kutilmoqda`,
      body: `Salom!\n\nYangi o'quvchi to'lov yubordi:\n\n👤 Ism: ${sub.student_name}\n📧 Email: ${sub.phone}\n🧾 To'lov cheki: ${sub.payment_ref || "—"}\n\nO'quvchi obunasini tasdiqlash uchun o'qituvchi paneliga kiring:\nhttps://vocabulary-a2-b1-b2.base44.app/teacher\n\nHurmat bilan,\nVocabulary A2·B1·B2 tizimi`
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});