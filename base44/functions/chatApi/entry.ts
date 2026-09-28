import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Chat writes go through here so sender identity comes from the session,
// never from the client, and a student can only post in their own room.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { room_id, text } = await req.json().catch(() => ({}));
    const content = String(text || '').trim().slice(0, 2000);
    const room = String(room_id || '');
    if (!content || !room.startsWith('chat:')) return Response.json({ error: 'Invalid message' }, { status: 400 });
    const studentEmail = room.slice(5);
    if (user.role !== 'admin' && studentEmail !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const msg = await base44.asServiceRole.entities.ChatMessage.create({
      room_id: room,
      student_email: studentEmail,
      sender_id: user.id,
      sender_name: user.full_name || user.email,
      sender_role: user.role === 'admin' ? 'admin' : 'user',
      text: content,
    });
    return Response.json({ message: msg });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}