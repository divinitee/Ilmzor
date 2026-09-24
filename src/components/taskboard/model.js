// Taskboard model helpers: labels, indexes, progress, history.
// Data comes from base44/functions/taskboardApi (action "bundle").

export const STATUSES = ["raw_idea", "planned", "in_progress", "complete"];
export const STATUS_LABEL = { raw_idea: "Raw Idea", planned: "Planned", in_progress: "In Progress", complete: "Complete" };
export const STATUS_STYLE = {
  raw_idea: { dot: "bg-slate-400", text: "text-slate-300", ring: "border-slate-600/60", bar: "bg-slate-400" },
  planned: { dot: "bg-violet-400", text: "text-violet-300", ring: "border-violet-500/40", bar: "bg-violet-400" },
  in_progress: { dot: "bg-blue-400", text: "text-blue-300", ring: "border-blue-500/40", bar: "bg-blue-400" },
  complete: { dot: "bg-emerald-400", text: "text-emerald-300", ring: "border-emerald-500/40", bar: "bg-emerald-400" },
};

export const PRIORITIES = ["critical", "high", "medium", "low"];
export const PRIORITY_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
export const PRIORITY_STYLE = {
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  high: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  medium: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  low: "border-slate-600/50 bg-slate-800/40 text-slate-400",
};
export const PRIORITY_EDGE = { critical: "border-l-rose-400", high: "border-l-amber-400", medium: "border-l-sky-400/70", low: "border-l-slate-600" };
export const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

export const CATEGORIES = ["Product / Architecture", "Engineering", "Design / UX", "Planning / Strategy", "Marketing", "Pricing / Business", "Research", "General"];

export const STEP_STATUSES = ["todo", "in_progress", "done", "failed", "skipped"];
export const STEP_LABEL = { todo: "To do", in_progress: "In progress", done: "Done", failed: "Failed", skipped: "Skipped" };

export const EVIDENCE_TYPES = ["note", "screenshot", "log", "api_response", "test_output", "file", "link", "checkpoint"];
export const EVIDENCE_LABEL = {
  note: "Note", screenshot: "Screenshot", log: "Log", api_response: "API response", test_output: "Test output",
  file: "File / path", link: "Link", checkpoint: "Checkpoint / commit",
};

export const ACTOR_STYLE = {
  tee: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  claude: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  gpt: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  fable: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  base44: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  system: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  imported: "bg-slate-700/40 text-slate-400 border-slate-600/40",
};

export function taskUrl(task) {
  return "/taskboard/" + encodeURIComponent(task.task_code);
}

const byOrder = (a, b) => (a.order || 0) - (b.order || 0) || String(a.created_date).localeCompare(String(b.created_date));

export function buildIndex(data) {
  const byId = {};
  const byCode = {};
  const children = {};
  const stepsByTask = {};
  const evidenceByTask = {};
  const evidenceByStep = {};
  for (const t of data.tasks) {
    byId[t.id] = t;
    byCode[t.task_code] = t;
    (children[t.parent_id || ""] ||= []).push(t);
  }
  Object.values(children).forEach((a) => a.sort(byOrder));
  for (const s of data.steps) (stepsByTask[s.task_id] ||= []).push(s);
  Object.values(stepsByTask).forEach((a) => a.sort(byOrder));
  for (const e of data.evidence) {
    if (e.step_id) (evidenceByStep[e.step_id] ||= []).push(e);
    else (evidenceByTask[e.task_id] ||= []).push(e);
  }
  const sortEv = (a, b) => String(b.captured_at).localeCompare(String(a.captured_at));
  Object.values(evidenceByStep).forEach((a) => a.sort(sortEv));
  Object.values(evidenceByTask).forEach((a) => a.sort(sortEv));

  // Progress. A task's units are its (non-archived) child tasks plus its own
  // steps (skipped steps don't count). A child counts as its own progress
  // fraction, so a Complete child is a full unit. With no units, the task's
  // status decides: Complete = 100%, anything else = 0% ("no breakdown").
  const memo = {};
  const progress = (task) => {
    if (memo[task.id]) return memo[task.id];
    const kids = (children[task.id] || []).filter((c) => !c.archived);
    const steps = (stepsByTask[task.id] || []).filter((s) => s.status !== "skipped");
    let sum = 0;
    let kidsComplete = 0;
    for (const k of kids) {
      const p = k.status === "complete" ? 1 : progress(k).fraction;
      if (k.status === "complete") kidsComplete++;
      sum += p;
    }
    const stepsDone = steps.filter((s) => s.status === "done").length;
    sum += stepsDone;
    const units = kids.length + steps.length;
    const fraction = units ? sum / units : task.status === "complete" ? 1 : 0;
    const r = {
      fraction,
      percent: Math.round(fraction * 100),
      kids: kids.length,
      kidsComplete,
      steps: steps.length,
      stepsDone,
      hasBreakdown: units > 0,
    };
    memo[task.id] = r;
    return r;
  };

  const path = (task) => {
    const out = [];
    let t = task;
    let guard = 0;
    while (t && guard++ < 50) {
      out.unshift(t);
      t = t.parent_id ? byId[t.parent_id] : null;
    }
    return out;
  };

  const descendants = (task) => {
    const out = [];
    const walk = (id) => (children[id] || []).forEach((c) => { out.push(c); walk(c.id); });
    walk(task.id);
    return out;
  };

  return { byId, byCode, children, stepsByTask, evidenceByTask, evidenceByStep, progress, path, descendants };
}

export function inSubtree(code, rootCode) {
  return code === rootCode || (code || "").startsWith(rootCode + ".");
}

export function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v.length === 10 ? v + "T00:00:00" : v);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
export function fmtTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return "—";
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function relative(v) {
  if (!v) return "never";
  const m = Math.max(0, Math.floor((Date.now() - new Date(v)) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d < 30 ? d + "d ago" : fmtDate(v);
}
export function isOverdue(task) {
  if (!task.due_date || task.status === "complete") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.due_date + "T00:00:00") < today;
}

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Export a whole board, or one task's subtree, in the importable format.
export function buildExport(data, rootTask = null) {
  const keep = rootTask ? (code) => inSubtree(code, rootTask.task_code) : () => true;
  const tasks = data.tasks.filter((t) => keep(t.task_code));
  const ids = new Set(tasks.map((t) => t.id));
  const steps = data.steps.filter((s) => ids.has(s.task_id));
  const evidence = data.evidence.filter((e) => ids.has(e.task_id));
  const events = data.events.filter((e) => keep(e.task_code));
  return {
    format: "virora-taskboard",
    version: 1,
    exported_at: new Date().toISOString(),
    scope: rootTask ? rootTask.task_code : "all",
    counts: { tasks: tasks.length, steps: steps.length, evidence: evidence.length, events: events.length },
    tasks,
    steps,
    evidence,
    events,
  };
}
