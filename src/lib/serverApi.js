import { base44 } from "@/api/base44Client";

// Thin client for the two authority functions (Teacher Panel phase 1,
// 2026-09-23). Every write that grants access, sets teacher attribution,
// changes a roster, or records homework goes through these. The browser no
// longer has RLS permission to do any of it directly.
//
//   studentApi  base44/functions/studentApi/entry.ts
//   teacherApi  base44/functions/teacherApi/entry.ts
//
// Errors come back as an Error whose `.code` is the function's machine code
// (e.g. "code_not_found", "removed_from_class", "not_teacher").

async function call(fn, action, payload = {}) {
  try {
    const res = await base44.functions.invoke(fn, { action, ...payload });
    const data = res?.data ?? res;
    if (data && data.ok === false) {
      const err = new Error(data.error || action);
      err.code = data.code;
      throw err;
    }
    return data;
  } catch (e) {
    if (e?.code && !e.response) throw e;
    const body = e?.response?.data || e?.data;
    const err = new Error(body?.error || e?.message || "Request failed");
    err.code = body?.code || "request_failed";
    err.status = e?.response?.status || e?.status;
    throw err;
  }
}

export const studentApi = (action, payload) => call("studentApi", action, payload);
export const teacherApi = (action, payload) => call("teacherApi", action, payload);

// Human copy for the join-class errors students can actually hit.
export function joinErrorMessage(code) {
  switch (code) {
    case "code_not_found": return "No class uses that code. Check it with your teacher.";
    case "class_ended": return "That class has ended. Ask your teacher for a new code.";
    case "class_unavailable": return "That class isn't available right now.";
    case "removed_from_class": return "Your teacher removed you from this class. Ask them to add you back.";
    case "teachers_cannot_join": return "Teacher accounts can't join a class as a student.";
    case "own_class": return "That's your own class code.";
    default: return "Couldn't join the class. Try again.";
  }
}
