import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Invoked by the StudentSubscription entity workflow (admin identity) or
    // an admin — never directly by an anonymous caller.
    const caller = await base44.auth.me();
    if (!caller || caller.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const payload = await req.json();

    const incoming = payload.data;
    if (!incoming?.id) return Response.json({ ok: true, skipped: "no data" });
    // Use the stored record, not the caller's copy of it.
    const sub = await base44.asServiceRole.entities.StudentSubscription.get(incoming.id);
    if (!sub || sub.status !== "pending") return Response.json({ ok: true, skipped: "not pending" });
    const clean = (v) => String(v ?? "").replace(/[\r\n]+/g, " ").slice(0, 120);

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: "ilmzor.uz@gmail.com",
      subject: `Yangi to'lov: ${clean(sub.student_name)} — tasdiqlash kutilmoqda`,
      body: `Salom!\n\nYangi o'quvchi to'lov yubordi:\n\n👤 Ism: ${clean(sub.student_name)}\n📧 Email: ${clean(sub.phone)}\n🧾 To'lov cheki: ${clean(sub.payment_ref) || "—"}\n\nO'quvchi obunasini tasdiqlash uchun o'qituvchi paneliga kiring:\nhttps://virora.online/teacher\n\nHurmat bilan,\nVIRORA tizimi`
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});