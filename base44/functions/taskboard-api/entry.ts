import { createClientFromRequest } from "npm:@base44/sdk";

const ACTORS = new Set(["tee","gpt","claude","fable","base44","system","imported"]);

function actorFrom(input) {
  return ACTORS.has(input) ? input : "tee";
}
function now() { return new Date().toISOString(); }
function compact(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
function changedFields(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const out = {};
  for (const key of keys) {
    if (["updated_date","created_date","id","created_by_id"].includes(key)) continue;
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
      out[key] = { before: before?.[key], after: after?.[key] };
    }
  }
  return out;
}
async function requireAdmin(base44) {
  const user = await base44.auth.me();
  if (!user || user.role !== "admin") throw Object.assign(new Error("Admin access required"), {status:403});
  return user;
}
async function logEvent(base44, {actor,node,action,field="",before="",after="",note=""}) {
  return base44.asServiceRole.entities.TaskEvent.create({
    ts:now(), actor:actorFrom(actor), actor_label:actorFrom(actor),
    node_id:node.id, node_code:node.task_code || node.step_code || node.id,
    action, field, before:compact(before), after:compact(after), note:note || ""
  });
}
async function taskBundle(base44) {
  const [tasks,steps,evidence,events] = await Promise.all([
    base44.asServiceRole.entities.Task.list("order",500),
    base44.asServiceRole.entities.TaskStep.list("order",1000),
    base44.asServiceRole.entities.TaskEvidence.list("-captured_at",1000),
    base44.asServiceRole.entities.TaskEvent.list("-ts",2000)
  ]);
  return {tasks:tasks || [],steps:steps || [],evidence:evidence || [],events:events || []};
}
function descendants(taskId,tasks) {
  const children = new Map();
  for (const task of tasks) {
    const key = task.parent_id || "";
    const list = children.get(key) || [];
    list.push(task);
    children.set(key,list);
  }
  const out = [];
  const walk = (id) => {
    for (const child of children.get(id) || []) {
      out.push(child);
      walk(child.id);
    }
  };
  walk(taskId);
  return out;
}
async function nextTaskCode(base44,parentId) {
  const tasks = await base44.asServiceRole.entities.Task.list("order",500);
  const siblings = (tasks || []).filter(t => (t.parent_id || "") === (parentId || ""));
  if (!parentId) {
    const nums = siblings.map(t => Number(String(t.task_code || "").replace(/^VT-/, "").split(".")[0]) || 0);
    return "VT-" + (Math.max(0,...nums) + 1);
  }
  const parent = (tasks || []).find(t => t.id === parentId);
  if (!parent) throw new Error("Parent task not found");
  const prefix = parent.task_code + ".";
  const nums = siblings.map(t => {
    const raw = String(t.task_code || "");
    return raw.startsWith(prefix) ? Number(raw.slice(prefix.length)) || 0 : 0;
  });
  return prefix + (Math.max(0,...nums) + 1);
}
async function createTask(base44,input,actor) {
  const task_code = input.task_code || await nextTaskCode(base44,input.parent_id || "");
  const record = await base44.asServiceRole.entities.Task.create({
    task_code,parent_id:input.parent_id || "",order:Number(input.order || 0),
    title:input.title,objective:input.objective || "",done_when:input.done_when || "",
    status:input.status || "backlog",priority:input.priority || "medium",
    area:input.area || "Infra",launch_blocker:!!input.launch_blocker,
    horizon:input.horizon || "later",tags:input.tags || [],depends_on:input.depends_on || [],
    notes:input.notes || "",decisions:input.decisions || "",archived:false,
    source:actorFrom(actor),last_actor:actorFrom(actor)
  });
  await logEvent(base44,{actor,node:record,action:"created",after:record});
  return record;
}
async function updateTask(base44,input,actor) {
  const before = await base44.asServiceRole.entities.Task.get(input.id);
  if (!before) throw new Error("Task not found");
  const patch = {...(input.patch || {}),last_actor:actorFrom(actor)};
  delete patch.id; delete patch.task_code; delete patch.parent_id;
  const merged = {...before,...patch};
  const changed = changedFields(before,merged);
  if (!Object.keys(changed).length) return before;
  const updated = await base44.asServiceRole.entities.Task.update(before.id,patch);
  const beforeValues = Object.fromEntries(Object.entries(changed).map(([k,v]) => [k,v.before]));
  const afterValues = Object.fromEntries(Object.entries(changed).map(([k,v]) => [k,v.after]));
  await logEvent(base44,{actor,node:updated,action:"updated",field:Object.keys(changed).join(","),before:beforeValues,after:afterValues});
  return updated;
}
async function dropTask(base44,input,actor) {
  const before = await base44.asServiceRole.entities.Task.get(input.id);
  if (!before) throw new Error("Task not found");
  const reason = String(input.reason || "").trim();
  if (!reason) throw new Error("A drop reason is required");
  const updated = await base44.asServiceRole.entities.Task.update(before.id,{status:"dropped",last_actor:actorFrom(actor)});
  await logEvent(base44,{actor,node:updated,action:"dropped",field:"status",before:before.status,after:"dropped",note:reason});
  return updated;
}
async function createStep(base44,input,actor) {
  const task = await base44.asServiceRole.entities.Task.get(input.task_id);
  if (!task) throw new Error("Task not found");
  const steps = await base44.asServiceRole.entities.TaskStep.filter({task_id:task.id},"order",1000,0);
  const order = input.order ?? ((steps || []).length);
  const step_code = input.step_code || task.task_code + "#" + (order + 1);
  const step = await base44.asServiceRole.entities.TaskStep.create({
    step_code,task_id:task.id,order,action:input.action,expected:input.expected || "",
    state:input.state || "todo",actual:input.actual || "",dropped_reason:input.dropped_reason || ""
  });
  await logEvent(base44,{actor,node:step,action:"created",after:step});
  return step;
}
async function updateStep(base44,input,actor) {
  const before = await base44.asServiceRole.entities.TaskStep.get(input.id);
  if (!before) throw new Error("Step not found");
  const patch = {...(input.patch || {})};
  delete patch.id; delete patch.task_id; delete patch.step_code;
  if (patch.state === "verified") {
    const evidence = await base44.asServiceRole.entities.TaskEvidence.filter({step_id:before.id},"-captured_at",100,0);
    const hasEvidence = (evidence || []).length > 0;
    const hasCheckpoint = !!patch.checkpoint?.ref || !!before.checkpoint?.ref;
    if (!hasEvidence && !hasCheckpoint) throw new Error("A step needs evidence or a checkpoint before it can be verified.");
    patch.verified_at = now(); patch.verified_by = actorFrom(actor);
  }
  if (patch.state && patch.state !== "todo" && !before.performed_at) {
    patch.performed_at = now(); patch.performed_by = actorFrom(actor);
  }
  if (patch.state === "skipped" && !String(patch.dropped_reason || before.dropped_reason || "").trim()) {
    throw new Error("A skipped step needs a reason.");
  }
  const merged = {...before,...patch};
  const changed = changedFields(before,merged);
  if (!Object.keys(changed).length) return before;
  const updated = await base44.asServiceRole.entities.TaskStep.update(before.id,patch);
  const beforeValues = Object.fromEntries(Object.entries(changed).map(([k,v]) => [k,v.before]));
  const afterValues = Object.fromEntries(Object.entries(changed).map(([k,v]) => [k,v.after]));
  await logEvent(base44,{actor,node:updated,action:"updated",field:Object.keys(changed).join(","),before:beforeValues,after:afterValues});
  return updated;
}
async function verifyTask(base44,input,actor) {
  const task = await base44.asServiceRole.entities.Task.get(input.id);
  if (!task) throw new Error("Task not found");
  const tasks = await base44.asServiceRole.entities.Task.list("order",500);
  const ids = [task.id,...descendants(task.id,tasks || []).map(t => t.id)];
  const allSteps = await base44.asServiceRole.entities.TaskStep.list("order",1000);
  const relevant = (allSteps || []).filter(s => ids.includes(s.task_id));
  const open = relevant.filter(s => !["verified","skipped"].includes(s.state));
  if (open.length) throw new Error("Cannot verify task: " + open.length + " step(s) are not verified or skipped.");
  const updated = await base44.asServiceRole.entities.Task.update(task.id,{status:"verified",verified_at:now(),last_actor:actorFrom(actor)});
  await logEvent(base44,{actor,node:updated,action:"verified",field:"status",before:task.status,after:"verified"});
  return updated;
}
async function addEvidence(base44,input,actor) {
  const evidence = await base44.asServiceRole.entities.TaskEvidence.create({
    task_id:input.task_id || "",step_id:input.step_id || "",type:input.type,title:input.title,
    body:input.body || "",ref:input.ref || "",captured_by:actorFrom(actor),captured_at:now()
  });
  const nodeId = input.step_id || input.task_id;
  await logEvent(base44,{actor,node:{id:nodeId,step_code:input.step_code || input.task_code || nodeId},action:"evidence_added",after:evidence});
  return evidence;
}
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await requireAdmin(base44);
    const input = await req.json();
    const actor = actorFrom(input.actor);
    let data;
    switch (input.action) {
      case "bundle": data = await taskBundle(base44); break;
      case "create_task": data = await createTask(base44,input,actor); break;
      case "update_task": data = await updateTask(base44,input,actor); break;
      case "drop_task": data = await dropTask(base44,input,actor); break;
      case "create_step": data = await createStep(base44,input,actor); break;
      case "update_step": data = await updateStep(base44,input,actor); break;
      case "verify_task": data = await verifyTask(base44,input,actor); break;
      case "add_evidence": data = await addEvidence(base44,input,actor); break;
      default: return Response.json({error:"Unknown taskboard action"},{status:400});
    }
    return Response.json({success:true,data});
  } catch (error) {
    return Response.json({error:error?.message || "Taskboard request failed"},{status:error?.status || 500});
  }
});