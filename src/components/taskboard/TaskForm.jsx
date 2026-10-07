import React, { useState } from "react";
import { Modal, Button, Field, inputCls } from "./ui";
import { STATUSES, STATUS_LABEL, PRIORITIES, PRIORITY_LABEL, CATEGORIES, WORK_MODES, WORK_MODE_LABEL, ENERGY_LEVELS, ENERGY_LABEL, PLACES, PLACE_LABEL } from "./model";

// Create or edit a task. With `parent`, creates a subtask of that task.
export default function TaskForm({ task, parent, onSubmit, onClose, busy }) {
  const editing = !!task;
  const [f, setF] = useState(() => ({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || (parent ? "planned" : "raw_idea"),
    priority: task?.priority || parent?.priority || "medium",
    category: task?.category || parent?.category || "General",
    project: task?.project ?? parent?.project ?? "",
    tags: (task?.tags || []).join(", "),
    due_date: task?.due_date || "",
    depends_on: (task?.depends_on || []).join(", "),
    notes: task?.notes || "",
    launch_blocker: !!task?.launch_blocker,
    work_mode: task?.work_mode || "hands_on",
    estimate_minutes: task?.estimate_minutes || 15,
    ai_minutes: task?.ai_minutes || 0,
    energy: task?.energy || "med",
    place: task?.place || "anywhere",
  }));
  const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!f.title.trim()) { setErr("Give the task a title."); return; }
    setErr("");
    await onSubmit({
      ...f,
      title: f.title.trim(),
      tags: f.tags.split(",").map((x) => x.trim()).filter(Boolean),
      depends_on: f.depends_on.split(",").map((x) => x.trim()).filter(Boolean),
      due_date: f.due_date || null,
    });
  };

  const heading = editing ? `Edit ${task.task_code}` : parent ? `New subtask of ${parent.task_code}` : "New big task";
  const cats = CATEGORIES.includes(f.category) || !f.category ? CATEGORIES : [...CATEGORIES, f.category];

  return (
    <Modal
      title={heading}
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : parent ? "Create subtask" : "Create task"}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {parent && !editing && (
          <div className="rounded-[8px] border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 sm:col-span-2">
            Parent: <span className="font-mono text-slate-300">{parent.task_code}</span> {parent.title}
          </div>
        )}
        <Field label="Title" className="sm:col-span-2">
          <input autoFocus value={f.title} onChange={(e) => set("title", e.target.value)} className={inputCls} placeholder="What outcome is this task about?" />
        </Field>
        <Field label="Description / objective" className="sm:col-span-2">
          <textarea rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} className={inputCls} placeholder="What does done look like? Context, scope." />
        </Field>
        <Field label="Status">
          <select value={f.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select value={f.priority} onChange={(e) => set("priority", e.target.value)} className={inputCls}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select value={f.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Project / area">
          <input value={f.project} onChange={(e) => set("project", e.target.value)} className={inputCls} placeholder="e.g. Teacher System" />
        </Field>
        <Field label="Tags" hint="Comma separated">
          <input value={f.tags} onChange={(e) => set("tags", e.target.value)} className={inputCls} placeholder="security, launch" />
        </Field>
        <Field label="Due date">
          <input type="date" value={f.due_date || ""} onChange={(e) => set("due_date", e.target.value)} className={inputCls + " [color-scheme:dark]"} />
        </Field>
        <Field label="Dependencies" hint="Task codes this waits on, comma separated (e.g. VT-2, VT-4.1)" className="sm:col-span-2">
          <input value={f.depends_on} onChange={(e) => set("depends_on", e.target.value)} className={inputCls} placeholder="VT-2" />
        </Field>
        <div className="sm:col-span-2 rounded-[10px] border border-blue-500/20 bg-blue-500/[0.04] p-3">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[.18em] text-blue-300">Execution</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Work mode" hint="Who does the substantive work">
              <select value={f.work_mode} onChange={(e) => set("work_mode", e.target.value)} className={inputCls}>
                {WORK_MODES.map((m) => <option key={m} value={m}>{WORK_MODE_LABEL[m]}</option>)}
              </select>
            </Field>
            <Field label="Your minutes" hint="Kickoff + review / hands-on">
              <input type="number" min="1" max="1440" step="5" value={f.estimate_minutes} onChange={(e) => set("estimate_minutes", e.target.value)} className={inputCls} />
            </Field>
            <Field label="AI minutes" hint="Unattended runtime">
              <input type="number" min="0" max="1440" step="5" value={f.ai_minutes} onChange={(e) => set("ai_minutes", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Energy">
              <select value={f.energy} onChange={(e) => set("energy", e.target.value)} className={inputCls}>
                {ENERGY_LEVELS.map((e) => <option key={e} value={e}>{ENERGY_LABEL[e]}</option>)}
              </select>
            </Field>
            <Field label="Place">
              <select value={f.place} onChange={(e) => set("place", e.target.value)} className={inputCls}>
                {PLACES.map((p) => <option key={p} value={p}>{PLACE_LABEL[p]}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <Field label="Notes" className="sm:col-span-2">
          <textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} placeholder="Working notes, decisions, references…" />
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 sm:col-span-2">
          <input type="checkbox" checked={f.launch_blocker} onChange={(e) => set("launch_blocker", e.target.checked)} className="h-4 w-4 accent-rose-500" />
          Launch blocker
        </label>
        {err && <div className="text-sm text-rose-300 sm:col-span-2">{err}</div>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
