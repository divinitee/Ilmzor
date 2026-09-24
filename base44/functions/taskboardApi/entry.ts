import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// taskboardApi: the only read/write path for the internal VIRORA Taskboard
// (/taskboard). Admin only. Every write leaves an append-only TaskEvent, so the
// board doubles as a build receipt.
//
// Entities: Task (recursive via parent_id), TaskStep, TaskEvidence, TaskEvent.
// Codes are hierarchical and never reused: VT-3, VT-3.1, VT-3.1.2, step VT-3.1#4.
// A subtree's history is every TaskEvent whose task_code is X or starts "X.".
//
// Agents (Claude/GPT/Fable) call this with { actor: "claude" | ... } so the log
// shows who did what. The browser UI always sends actor "tee".

const ACTORS = new Set(['tee', 'gpt', 'claude', 'fable', 'base44', 'system', 'imported']);
const STATUSES = ['raw_idea', 'planned', 'in_progress', 'complete'];
const STATUS_LABEL: Record<string, string> = { raw_idea: 'Raw Idea', planned: 'Planned', in_progress: 'In Progress', complete: 'Complete' };
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const STEP_STATUSES = ['todo', 'in_progress', 'done', 'failed', 'skipped'];
const STEP_LABEL: Record<string, string> = { todo: 'To do', in_progress: 'In progress', done: 'Done', failed: 'Failed', skipped: 'Skipped' };
const EVIDENCE_TYPES = ['note', 'screenshot', 'log', 'api_response', 'test_output', 'file', 'link', 'checkpoint'];
const TASK_FIELDS = ['title', 'description', 'status', 'priority', 'category', 'project', 'tags', 'due_date', 'depends_on', 'notes', 'launch_blocker', 'order'];
const STEP_FIELDS = ['title', 'description', 'status', 'expected_result', 'actual_result', 'order'];
const CATEGORIES = ['Product / Architecture', 'Engineering', 'Design / UX', 'Planning / Strategy', 'Marketing', 'Pricing / Business', 'Research', 'General'];

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
const bad = (m: string) => new ApiError(400, m);

const now = () => new Date().toISOString();
const str = (v: unknown, max = 20000) => (v === undefined || v === null ? '' : String(v)).slice(0, max);
const clip = (v: unknown) => {
  if (v === undefined || v === null) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 2000 ? s.slice(0, 2000) + '…' : s;
};
const actorOf = (a: unknown) => (ACTORS.has(String(a)) ? String(a) : 'tee');
const list = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => str(x, 200).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
};
const iso = (v: unknown) => {
  if (!v) return null;
  const d = new Date(typeof v === 'number' ? v : String(v));
  return isNaN(d.getTime()) ? null : d.toISOString();
};
const dateOnly = (v: unknown) => {
  const s = str(v, 40).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = iso(s);
  return d ? d.slice(0, 10) : null;
};
function normStatus(v: unknown, fallback = 'raw_idea') {
  const s = str(v, 40).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (STATUSES.includes(s)) return s;
  if (s === 'planned_idea' || s === 'next' || s === 'backlog') return s === 'backlog' ? 'raw_idea' : 'planned';
  if (s === 'active' || s === 'doing' || s === 'blocked') return 'in_progress';
  if (s === 'done' || s === 'completed' || s === 'verified') return 'complete';
  if (s === 'idea') return 'raw_idea';
  return fallback;
}
function normPriority(v: unknown, fallback = 'medium') {
  const s = str(v, 20).trim().toLowerCase();
  return PRIORITIES.includes(s) ? s : fallback;
}
function normCategory(v: unknown) {
  const s = str(v, 80).trim();
  if (!s) return 'General';
  const hit = CATEGORIES.find((c) => c.toLowerCase() === s.toLowerCase());
  if (hit) return hit;
  if (/^general/i.test(s)) return 'General';
  return s;
}

// ---------- data access ----------
async function listAll(entity: any, sort = 'created_date') {
  const out: any[] = [];
  const page = 500;
  for (let skip = 0; skip < 50000; skip += page) {
    const rows = await entity.list(sort, page, skip);
    out.push(...(rows || []));
    if (!rows || rows.length < page) break;
  }
  return out;
}
async function bulk(entity: any, rows: any[]) {
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const created = await entity.bulkCreate(rows.slice(i, i + 100));
    out.push(...(created || []));
  }
  return out;
}

function eventRow(actor: string, task: any, e: { node_type?: string; node_code?: string; action: string; details?: string; field?: string; before?: unknown; after?: unknown; ts?: string }) {
  return {
    ts: e.ts || now(),
    actor,
    task_id: task?.id || '',
    task_code: task?.task_code || 'VT-?',
    node_type: e.node_type || 'task',
    node_code: e.node_code || task?.task_code || '',
    action: e.action,
    details: str(e.details, 4000),
    field: e.field || '',
    before: clip(e.before),
    after: clip(e.after),
  };
}
async function log(db: any, actor: string, task: any, e: any) {
  return db.TaskEvent.create(eventRow(actor, task, e));
}

// Codes are never reused: look at live tasks AND history.
function rootNumber(code: string) {
  const m = /^VT-(\d+)/.exec(code || '');
  return m ? Number(m[1]) : 0;
}
async function nextTaskCode(db: any, parent: any | null) {
  const [tasks, events] = await Promise.all([listAll(db.Task), listAll(db.TaskEvent)]);
  const codes = [...tasks.map((t: any) => t.task_code), ...events.map((e: any) => e.task_code)].filter(Boolean);
  if (!parent) return 'VT-' + (Math.max(0, ...codes.map(rootNumber)) + 1);
  const prefix = parent.task_code + '.';
  const nums = codes
    .filter((c: string) => c.startsWith(prefix))
    .map((c: string) => Number(c.slice(prefix.length).split('.')[0]) || 0);
  return prefix + (Math.max(0, ...nums) + 1);
}
async function nextStepCode(db: any, task: any) {
  const [steps, events] = await Promise.all([
    db.TaskStep.filter({ task_id: task.id }, 'created_date', 1000, 0),
    db.TaskEvent.filter({ task_code: task.task_code }, 'created_date', 5000, 0),
  ]);
  const prefix = task.task_code + '#';
  const codes = [...(steps || []).map((s: any) => s.step_code), ...(events || []).map((e: any) => e.node_code)].filter((c: string) => c && c.startsWith(prefix));
  const n = Math.max(0, ...codes.map((c: string) => Number(c.slice(prefix.length)) || 0)) + 1;
  return { code: prefix + n, order: (steps || []).length };
}

async function getTask(db: any, id: unknown) {
  if (!id) throw bad('Task id required');
  const t = await db.Task.get(String(id)).catch(() => null);
  if (!t) throw new ApiError(404, 'Task not found');
  return t;
}
async function getStep(db: any, id: unknown) {
  if (!id) throw bad('Step id required');
  const s = await db.TaskStep.get(String(id)).catch(() => null);
  if (!s) throw new ApiError(404, 'Step not found');
  return s;
}

function cleanTaskPatch(patch: any) {
  const out: any = {};
  for (const k of TASK_FIELDS) {
    if (!(k in (patch || {}))) continue;
    const v = patch[k];
    if (k === 'title') { const t = str(v, 300).trim(); if (!t) throw bad('Title cannot be empty'); out.title = t; }
    else if (k === 'status') out.status = normStatus(v);
    else if (k === 'priority') out.priority = normPriority(v);
    else if (k === 'category') out.category = normCategory(v);
    else if (k === 'tags' || k === 'depends_on') out[k] = list(v);
    else if (k === 'due_date') out.due_date = dateOnly(v);
    else if (k === 'launch_blocker') out.launch_blocker = !!v;
    else if (k === 'order') out.order = Number(v) || 0;
    else out[k] = str(v);
  }
  return out;
}
function statusStamps(before: any, nextStatus: string) {
  const stamps: any = {};
  if (nextStatus === 'in_progress' && !before?.started_at) stamps.started_at = now();
  if (nextStatus === 'complete') { stamps.completed_at = now(); if (!before?.started_at) stamps.started_at = before?.started_at || now(); }
  if (before && before.status === 'complete' && nextStatus !== 'complete') { stamps.completed_at = null; stamps.verified_at = null; stamps.verified_by = null; }
  return stamps;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

// ---------- actions ----------
async function bundle(db: any) {
  const [tasks, steps, evidence, events] = await Promise.all([
    listAll(db.Task), listAll(db.TaskStep), listAll(db.TaskEvidence), listAll(db.TaskEvent),
  ]);
  events.sort((a: any, b: any) => String(b.ts).localeCompare(String(a.ts)));
  return { tasks, steps, evidence, events };
}

async function createTask(db: any, actor: string, input: any) {
  const title = str(input.title, 300).trim();
  if (!title) throw bad('Title is required');
  const parent = input.parent_id ? await getTask(db, input.parent_id) : null;
  const task_code = await nextTaskCode(db, parent);
  const siblings = await db.Task.filter({ parent_id: parent ? parent.id : '' }, 'created_date', 1000, 0);
  const fields = cleanTaskPatch({ ...input, title });
  const status = fields.status || 'raw_idea';
  const record = await db.Task.create({
    category: parent?.category || 'General', priority: 'medium', tags: [], depends_on: [], description: '', project: parent?.project || '', notes: '', launch_blocker: false,
    ...fields,
    status,
    ...statusStamps(null, status),
    task_code,
    parent_id: parent ? parent.id : '',
    order: (siblings || []).length,
    archived: false,
    source: actor,
    last_actor: actor,
  });
  await log(db, actor, record, { action: 'created', details: `${task_code} “${title}” created as ${STATUS_LABEL[status]}${parent ? ` under ${parent.task_code}` : ''}` });
  if (parent) {
    await log(db, actor, parent, { action: 'subtask_added', node_code: task_code, details: `Subtask ${task_code} “${title}” added` });
  }
  return record;
}

async function updateTask(db: any, actor: string, input: any) {
  const before = await getTask(db, input.id);
  const patch = cleanTaskPatch(input.patch || {});
  const changed = Object.keys(patch).filter((k) => !same(before[k], patch[k]));
  if (!changed.length) return before;
  const write: any = {};
  for (const k of changed) write[k] = patch[k];
  if (write.status) Object.assign(write, statusStamps(before, write.status));
  write.last_actor = actor;
  const updated = await db.Task.update(before.id, write);
  const task = { ...before, ...write, id: before.id };
  const events: any[] = [];
  for (const k of changed) {
    if (k === 'order') continue;
    if (k === 'status') events.push(eventRow(actor, task, { action: 'status_changed', field: k, before: before.status, after: write.status, details: `Status: ${STATUS_LABEL[before.status] || before.status} → ${STATUS_LABEL[write.status]}` }));
    else if (k === 'priority') events.push(eventRow(actor, task, { action: 'priority_changed', field: k, before: before.priority, after: write.priority, details: `Priority: ${before.priority || '—'} → ${write.priority}` }));
    else if (k === 'title') events.push(eventRow(actor, task, { action: 'renamed', field: k, before: before.title, after: write.title, details: `Renamed “${before.title}” → “${write.title}”` }));
    else if (['description', 'notes'].includes(k)) events.push(eventRow(actor, task, { action: 'edited', field: k, before: before[k], after: write[k], details: `${k === 'notes' ? 'Notes' : 'Description'} edited` }));
    else events.push(eventRow(actor, task, { action: 'edited', field: k, before: before[k], after: write[k], details: `${k.replace('_', ' ')}: ${clip(before[k]) || '—'} → ${clip(write[k]) || '—'}` }));
  }
  if (events.length) await bulk(db.TaskEvent, events);
  return updated || task;
}

async function verifyTask(db: any, actor: string, input: any) {
  const task = await getTask(db, input.id);
  const verified = input.verified !== false;
  if (verified && task.status !== 'complete') throw bad('Only a Complete task can be marked verified.');
  if (verified === !!task.verified_at) return task;
  const write = verified ? { verified_at: now(), verified_by: actor, last_actor: actor } : { verified_at: null, verified_by: null, last_actor: actor };
  const updated = await db.Task.update(task.id, write);
  await log(db, actor, task, { action: verified ? 'verified' : 'unverified', details: verified ? `Verified by ${actor}` : 'Verification removed' + (input.reason ? `: ${str(input.reason, 500)}` : '') });
  return updated;
}

async function setArchived(db: any, actor: string, input: any) {
  const task = await getTask(db, input.id);
  const archived = input.archived !== false;
  if (!!task.archived === archived) return task;
  const updated = await db.Task.update(task.id, { archived, archived_at: archived ? now() : null, last_actor: actor });
  await log(db, actor, task, { action: archived ? 'archived' : 'restored', details: archived ? `${task.task_code} archived` : `${task.task_code} restored from archive` });
  return updated;
}

async function deleteTask(db: any, actor: string, input: any) {
  const task = await getTask(db, input.id);
  if (str(input.confirm).trim() !== task.task_code) throw bad(`Type ${task.task_code} to confirm deletion.`);
  const [tasks, steps, evidence] = await Promise.all([listAll(db.Task), listAll(db.TaskStep), listAll(db.TaskEvidence)]);
  const kids = new Map<string, any[]>();
  for (const t of tasks) { const k = t.parent_id || ''; if (!kids.has(k)) kids.set(k, []); kids.get(k)!.push(t); }
  const subtree: any[] = [task];
  const walk = (id: string) => { for (const c of kids.get(id) || []) { subtree.push(c); walk(c.id); } };
  walk(task.id);
  const taskIds = new Set(subtree.map((t) => t.id));
  const stepRows = steps.filter((s: any) => taskIds.has(s.task_id));
  const stepIds = new Set(stepRows.map((s: any) => s.id));
  const evRows = evidence.filter((e: any) => taskIds.has(e.task_id) || stepIds.has(e.step_id));
  for (const e of evRows) await db.TaskEvidence.delete(e.id);
  for (const s of stepRows) await db.TaskStep.delete(s.id);
  for (const t of subtree.reverse()) await db.Task.delete(t.id);
  const details = `Deleted ${task.task_code} “${task.title}” with ${subtree.length - 1} subtask(s), ${stepRows.length} step(s), ${evRows.length} evidence record(s). History kept.`;
  await log(db, actor, task, { action: 'deleted', details });
  if (task.parent_id) {
    const parent = await db.Task.get(task.parent_id).catch(() => null);
    if (parent) await log(db, actor, parent, { action: 'subtask_deleted', node_code: task.task_code, details: `Subtask ${task.task_code} “${task.title}” deleted` });
  }
  return { deleted: { tasks: subtree.length, steps: stepRows.length, evidence: evRows.length } };
}

async function createStep(db: any, actor: string, input: any) {
  const task = await getTask(db, input.task_id);
  const title = str(input.title, 500).trim();
  if (!title) throw bad('Step title is required');
  const { code, order } = await nextStepCode(db, task);
  const status = STEP_STATUSES.includes(input.status) ? input.status : 'todo';
  const step = await db.TaskStep.create({
    step_code: code, task_id: task.id, order, title,
    description: str(input.description), expected_result: str(input.expected_result),
    actual_result: str(input.actual_result), status, last_actor: actor,
  });
  await log(db, actor, task, { node_type: 'step', node_code: code, action: 'step_added', details: `Step ${code} “${title}” added` });
  await db.Task.update(task.id, { last_actor: actor });
  return step;
}

async function updateStep(db: any, actor: string, input: any) {
  const before = await getStep(db, input.id);
  const task = await getTask(db, before.task_id);
  const patch: any = {};
  for (const k of STEP_FIELDS) {
    if (!(k in (input.patch || {}))) continue;
    const v = input.patch[k];
    if (k === 'title') { const t = str(v, 500).trim(); if (!t) throw bad('Step title cannot be empty'); patch.title = t; }
    else if (k === 'status') { if (!STEP_STATUSES.includes(v)) throw bad('Unknown step status'); patch.status = v; }
    else if (k === 'order') patch.order = Number(v) || 0;
    else patch[k] = str(v);
  }
  const changed = Object.keys(patch).filter((k) => !same(before[k], patch[k]));
  if (!changed.length) return before;
  const write: any = {};
  for (const k of changed) write[k] = patch[k];
  if (write.status === 'in_progress' && !before.started_at) write.started_at = now();
  if (['done', 'failed', 'skipped'].includes(write.status)) { write.completed_at = now(); write.completed_by = actor; }
  if (write.status === 'todo' || write.status === 'in_progress') { write.completed_at = null; write.completed_by = null; }
  write.last_actor = actor;
  const updated = await db.TaskStep.update(before.id, write);
  const events: any[] = [];
  for (const k of changed) {
    if (k === 'order') continue;
    if (k === 'status') {
      const action = write.status === 'done' ? 'step_completed' : write.status === 'failed' ? 'step_failed' : write.status === 'skipped' ? 'step_skipped' : write.status === 'todo' ? 'step_reopened' : 'step_started';
      events.push(eventRow(actor, task, { node_type: 'step', node_code: before.step_code, action, field: 'status', before: before.status, after: write.status, details: `Step ${before.step_code} “${write.title || before.title}”: ${STEP_LABEL[before.status]} → ${STEP_LABEL[write.status]}` }));
    } else if (k === 'actual_result') {
      events.push(eventRow(actor, task, { node_type: 'step', node_code: before.step_code, action: 'result_recorded', field: k, before: before[k], after: write[k], details: `Actual result recorded for ${before.step_code}` }));
    } else {
      events.push(eventRow(actor, task, { node_type: 'step', node_code: before.step_code, action: 'step_edited', field: k, before: before[k], after: write[k], details: `Step ${before.step_code} ${k.replace('_', ' ')} edited` }));
    }
  }
  if (events.length) await bulk(db.TaskEvent, events);
  await db.Task.update(task.id, { last_actor: actor });
  return updated;
}

async function addEvidence(db: any, actor: string, input: any) {
  const title = str(input.title, 300).trim();
  if (!title) throw bad('Evidence title is required');
  const type = EVIDENCE_TYPES.includes(input.type) ? input.type : 'note';
  let step: any = null;
  let task: any = null;
  if (input.step_id) { step = await getStep(db, input.step_id); task = await getTask(db, step.task_id); }
  else task = await getTask(db, input.task_id);
  const ev = await db.TaskEvidence.create({
    task_id: task.id, step_id: step ? step.id : '', owner_code: step ? step.step_code : task.task_code,
    type, title, description: str(input.description), reference: str(input.reference, 50000),
    captured_by: actor, captured_at: now(),
  });
  await log(db, actor, task, { node_type: 'evidence', node_code: step ? step.step_code : task.task_code, action: 'evidence_added', details: `Evidence (${type}) “${title}” added to ${step ? step.step_code : task.task_code}` });
  return ev;
}

// ---------- import ----------
function depth(code: string) { return (code.match(/\./g) || []).length; }

async function importNative(db: any, actor: string, data: any) {
  const [tasks, steps, evidence, events] = await Promise.all([listAll(db.Task), listAll(db.TaskStep), listAll(db.TaskEvidence), listAll(db.TaskEvent)]);
  const codeToId = new Map<string, string>(tasks.map((t: any) => [t.task_code, t.id]));
  const fileTasks: any[] = (data.tasks || []).filter((t: any) => t && t.task_code && t.title);
  const oldTaskCode = new Map<string, string>(fileTasks.map((t: any) => [t.id, t.task_code]));
  const created = { tasks: 0, steps: 0, evidence: 0, events: 0 };
  const skipped = { tasks: 0, steps: 0, evidence: 0, events: 0 };
  const createdRoots: any[] = [];

  const levels = new Map<number, any[]>();
  for (const t of fileTasks) { const d = depth(t.task_code); if (!levels.has(d)) levels.set(d, []); levels.get(d)!.push(t); }
  for (const d of [...levels.keys()].sort((a, b) => a - b)) {
    const rows: any[] = [];
    for (const t of levels.get(d)!) {
      if (codeToId.has(t.task_code)) { skipped.tasks++; continue; }
      let parentCode = t.parent_id ? oldTaskCode.get(t.parent_id) : '';
      if (!parentCode && d > 0) parentCode = t.task_code.slice(0, t.task_code.lastIndexOf('.'));
      const parentId = parentCode ? codeToId.get(parentCode) || '' : '';
      rows.push({
        task_code: t.task_code, parent_id: parentId, order: Number(t.order) || 0, title: str(t.title, 300),
        description: str(t.description), status: normStatus(t.status), priority: normPriority(t.priority),
        category: normCategory(t.category), project: str(t.project, 200), tags: list(t.tags), due_date: dateOnly(t.due_date),
        depends_on: list(t.depends_on), notes: str(t.notes), launch_blocker: !!t.launch_blocker,
        archived: !!t.archived, archived_at: iso(t.archived_at), started_at: iso(t.started_at), completed_at: iso(t.completed_at),
        verified_at: iso(t.verified_at), verified_by: t.verified_by || null, source: t.source || 'imported', last_actor: actor,
      });
    }
    const made = await bulk(db.Task, rows);
    made.forEach((m: any) => { codeToId.set(m.task_code, m.id); if (!m.parent_id) createdRoots.push(m); });
    created.tasks += made.length;
  }

  const stepCodes = new Map<string, string>(steps.map((s: any) => [s.step_code, s.id]));
  const oldStepCode = new Map<string, string>((data.steps || []).map((s: any) => [s.id, s.step_code]));
  const stepRows: any[] = [];
  for (const s of data.steps || []) {
    if (!s || !s.step_code || !s.title) continue;
    if (stepCodes.has(s.step_code)) { skipped.steps++; continue; }
    const taskCode = oldTaskCode.get(s.task_id) || s.step_code.split('#')[0];
    const taskId = codeToId.get(taskCode);
    if (!taskId) { skipped.steps++; continue; }
    stepRows.push({
      step_code: s.step_code, task_id: taskId, order: Number(s.order) || 0, title: str(s.title, 500), description: str(s.description),
      status: STEP_STATUSES.includes(s.status) ? s.status : 'todo', expected_result: str(s.expected_result), actual_result: str(s.actual_result),
      started_at: iso(s.started_at), completed_at: iso(s.completed_at), completed_by: s.completed_by || null, last_actor: actor,
    });
  }
  const madeSteps = await bulk(db.TaskStep, stepRows);
  madeSteps.forEach((m: any) => stepCodes.set(m.step_code, m.id));
  created.steps = madeSteps.length;

  const evKey = (e: any) => `${e.owner_code}|${e.title}|${iso(e.captured_at) || ''}`;
  const evSeen = new Set(evidence.map(evKey));
  const evRows: any[] = [];
  for (const e of data.evidence || []) {
    if (!e || !e.title) continue;
    const owner = e.owner_code || (e.step_id ? oldStepCode.get(e.step_id) : oldTaskCode.get(e.task_id)) || '';
    const row = { owner_code: owner, title: str(e.title, 300), captured_at: iso(e.captured_at) || now() };
    if (evSeen.has(evKey(row))) { skipped.evidence++; continue; }
    const isStep = owner.includes('#');
    const stepId = isStep ? stepCodes.get(owner) || '' : '';
    const taskId = codeToId.get(isStep ? owner.split('#')[0] : owner) || '';
    if (!taskId) { skipped.evidence++; continue; }
    evRows.push({
      ...row, task_id: taskId, step_id: stepId, type: EVIDENCE_TYPES.includes(e.type) ? e.type : 'note',
      description: str(e.description), reference: str(e.reference, 50000), captured_by: actorOf(e.captured_by),
    });
    evSeen.add(evKey(row));
  }
  created.evidence = (await bulk(db.TaskEvidence, evRows)).length;

  const eKey = (e: any) => `${iso(e.ts) || ''}|${e.action}|${e.node_code || e.task_code}`;
  const eSeen = new Set(events.map(eKey));
  const eRows: any[] = [];
  for (const e of data.events || []) {
    if (!e || !e.task_code || !e.action || !e.ts) continue;
    if (eSeen.has(eKey(e))) { skipped.events++; continue; }
    eRows.push({
      ts: iso(e.ts) || now(), actor: actorOf(e.actor), task_id: codeToId.get(e.task_code) || '', task_code: e.task_code,
      node_type: ['task', 'step', 'evidence'].includes(e.node_type) ? e.node_type : 'task', node_code: str(e.node_code, 100),
      action: str(e.action, 60), details: str(e.details, 4000), field: str(e.field, 100), before: clip(e.before), after: clip(e.after),
    });
    eSeen.add(eKey(e));
  }
  created.events = (await bulk(db.TaskEvent, eRows)).length;

  for (const r of createdRoots) await log(db, actor, r, { action: 'imported', details: `${r.task_code} restored from JSON import` });
  return { format: 'virora-taskboard', created, skipped };
}

// Standalone boards: v2 file = array of tasks with flat subtasks; v1 file = {version:3, notes}.
async function importLegacy(db: any, actor: string, items: any[], format: string) {
  const tasks = await listAll(db.Task);
  const events = await listAll(db.TaskEvent);
  const existingTitles = new Set(tasks.filter((t: any) => !t.parent_id).map((t: any) => String(t.title).trim().toLowerCase()));
  let next = Math.max(0, ...[...tasks.map((t: any) => t.task_code), ...events.map((e: any) => e.task_code)].map(rootNumber)) + 1;
  const created = { tasks: 0, steps: 0, evidence: 0, events: 0 };
  const skipped = { tasks: 0, steps: 0, evidence: 0, events: 0 };
  for (const it of items) {
    const title = str(it.title, 300).trim();
    if (!title) continue;
    if (existingTitles.has(title.toLowerCase())) { skipped.tasks++; continue; }
    const rawCat = str(it.category || it.color, 80);
    const launch = /launch blocker/i.test(rawCat);
    const legacyVerified = /verified/i.test(rawCat);
    const status = normStatus(it.status || it.stage);
    const deps = str(it.dependencies).trim();
    const notes = [str(it.notes), deps ? `Dependencies: ${deps}` : ''].filter(Boolean).join('\n\n');
    const created_ts = iso(it.created) || now();
    const code = 'VT-' + next++;
    const task = await db.Task.create({
      task_code: code, parent_id: '', order: created.tasks, title, description: str(it.description ?? it.body),
      status, priority: normPriority(it.priority), category: launch || legacyVerified ? 'General' : normCategory(rawCat),
      project: str(it.project, 200), tags: [...list(it.tags), ...(legacyVerified ? ['legacy: verified/done'] : [])],
      due_date: dateOnly(it.due), depends_on: [], notes, launch_blocker: launch, archived: !!it.archived,
      archived_at: it.archived ? now() : null, completed_at: status === 'complete' ? (iso(it.updated) || now()) : null,
      source: 'imported', last_actor: actor,
    });
    created.tasks++;
    existingTitles.add(title.toLowerCase());
    const evs: any[] = [eventRow('imported', task, { ts: created_ts, action: 'created', details: `${code} “${title}” imported from standalone board (${format})` })];
    const subs = Array.isArray(it.subtasks) ? it.subtasks : [];
    const stepRows = subs.filter((s: any) => str(s?.text).trim()).map((s: any, i: number) => ({
      step_code: `${code}#${i + 1}`, task_id: task.id, order: i, title: str(s.text, 500).trim(),
      status: s.done ? 'done' : 'todo', completed_at: s.done ? (iso(it.updated) || now()) : null, last_actor: 'imported',
      description: '', expected_result: '', actual_result: '',
    }));
    created.steps += (await bulk(db.TaskStep, stepRows)).length;
    for (const a of Array.isArray(it.activity) ? it.activity : []) {
      if (!a?.event) continue;
      evs.push(eventRow('imported', task, { ts: iso(a.timestamp) || created_ts, action: 'legacy', details: str(a.event, 1000) }));
    }
    created.events += (await bulk(db.TaskEvent, evs)).length;
  }
  return { format, created, skipped };
}

async function importData(db: any, actor: string, input: any) {
  let data = input.data;
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch { throw bad('File is not valid JSON.'); } }
  if (data && data.format === 'virora-taskboard' && Array.isArray(data.tasks)) return importNative(db, actor, data);
  if (Array.isArray(data)) return importLegacy(db, actor, data, 'standalone v2');
  if (data && Array.isArray(data.notes)) return importLegacy(db, actor, data.notes, 'roadmap board v1');
  throw bad('Unrecognised file. Expected a VIRORA taskboard export, a standalone board export (array), or a roadmap board backup ({notes}).');
}

const ACTIONS: Record<string, (db: any, actor: string, input: any) => Promise<any>> = {
  bundle: (db) => bundle(db),
  create_task: createTask,
  update_task: updateTask,
  verify_task: verifyTask,
  set_archived: setArchived,
  delete_task: deleteTask,
  create_step: createStep,
  update_step: updateStep,
  add_evidence: addEvidence,
  import: importData,
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ ok: false, error: 'POST only' }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    let me: any = null;
    try { me = await base44.auth.me(); } catch { me = null; }
    if (!me?.id) return Response.json({ ok: false, error: 'Not authenticated', code: 'unauthenticated' }, { status: 401 });
    if (me.role !== 'admin') return Response.json({ ok: false, error: 'Admin access required', code: 'forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const fn = ACTIONS[String(body.action || '')];
    if (!fn) return Response.json({ ok: false, error: 'Unknown taskboard action', code: 'unknown_action' }, { status: 400 });
    const data = await fn(base44.asServiceRole.entities, actorOf(body.actor), body);
    return Response.json({ ok: true, data });
  } catch (error: any) {
    if (error instanceof ApiError) return Response.json({ ok: false, error: error.message, code: 'bad_request' }, { status: error.status });
    console.error('taskboardApi error:', error);
    return Response.json({ ok: false, error: error?.message || 'Taskboard request failed', code: 'server_error' }, { status: 500 });
  }
});
