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

// A function rejects with 401 before it touches any data, so one retry is
// always safe. Seen in preview testing (2026-09-23): an occasional one-off
// 401 from auth.me() inside the function with a perfectly valid session.
// Without the retry that flake would silently drop a homework result.
async function call(fn, action, payload = {}, retried = false) {
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
    const body = e?.response?.data || e?.data;
    const status = e?.response?.status || e?.status;
    if (status === 401 && !retried) {
      await new Promise((r) => setTimeout(r, 700));
      return call(fn, action, payload, true);
    }
    // Base44Error already carries the function's machine code.
    if (e?.code && !e.response) throw e;
    const err = new Error(body?.error || e?.message || "Request failed");
    err.code = body?.code || "request_failed";
    err.status = status;
    throw err;
  }
}

export const studentApi = (action, payload) => call("studentApi", action, payload);
export const teacherApi = (action, payload) => call("teacherApi", action, payload);

// Internal Taskboard (admin only). base44/functions/taskboardApi/entry.ts
export const taskboardApi = async (action, payload = {}, actor = "tee") => {
  const response = await call("taskboardApi", action, { ...payload, actor });
  return response?.data ?? response;
};

// Human copy for the join-class errors students can actually hit.
const JOIN_ERRORS = {
  code_not_found: {
    en: "No class uses that code. Check it with your teacher.",
    uz: "Bunday kodli sinf topilmadi. Kodni o'qituvchingizdan tekshiring.",
    ru: "Класса с таким кодом нет. Уточните код у учителя.",
  },
  class_ended: {
    en: "That class has ended. Ask your teacher for a new code.",
    uz: "Bu sinf yakunlangan. O'qituvchingizdan yangi kod so'rang.",
    ru: "Этот класс завершён. Попросите у учителя новый код.",
  },
  class_unavailable: {
    en: "That class isn't available right now.",
    uz: "Bu sinf hozircha mavjud emas.",
    ru: "Этот класс сейчас недоступен.",
  },
  removed_from_class: {
    en: "Your teacher removed you from this class. Ask them to add you back.",
    uz: "O'qituvchingiz sizni bu sinfdan chiqargan. Qayta qo'shishini so'rang.",
    ru: "Учитель удалил вас из этого класса. Попросите добавить вас снова.",
  },
  teachers_cannot_join: {
    en: "Teacher accounts can't join a class as a student.",
    uz: "O'qituvchi hisobi sinfga o'quvchi sifatida qo'shila olmaydi.",
    ru: "Аккаунт учителя не может вступить в класс как ученик.",
  },
  own_class: {
    en: "That's your own class code.",
    uz: "Bu sizning sinfingiz kodi.",
    ru: "Это код вашего собственного класса.",
  },
  default: {
    en: "Couldn't join the class. Try again.",
    uz: "Sinfga qo'shilib bo'lmadi. Qaytadan urinib ko'ring.",
    ru: "Не удалось вступить в класс. Попробуйте ещё раз.",
  },
};

export function joinErrorMessage(code, lang = "en") {
  const entry = JOIN_ERRORS[code] || JOIN_ERRORS.default;
  return entry[lang] || entry.en;
}
