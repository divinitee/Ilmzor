import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Loader2, ShieldAlert, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { taskboardApi } from "@/lib/serverApi";
import Board from "@/components/taskboard/Board";
import TaskPage from "@/components/taskboard/TaskPage";
import TaskForm from "@/components/taskboard/TaskForm";
import { Modal, Button, inputCls } from "@/components/taskboard/ui";
import { buildIndex, buildExport, downloadJson, taskUrl, STATUS_LABEL } from "@/components/taskboard/model";

// Internal VIRORA Taskboard / build receipt. Admin only.
// Board at /taskboard, recursive task workspace at /taskboard/:taskCode.
// All reads/writes go through base44/functions/taskboardApi.

const EMPTY = { tasks: [], steps: [], evidence: [], events: [] };

export default function Taskboard() {
  const { user } = useAuth();
  const { taskCode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState(null); // {task} edit | {parent} new subtask | {} new big task
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toastTimer = useRef(null);

  const isAdmin = user?.role === "admin";

  const notify = useCallback((msg, kind = "ok", action = null) => {
    setToast({ msg, kind, action });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), kind === "error" ? 8000 : 5000);
  }, []);

  const load = useCallback(async () => {
    try {
      const b = await taskboardApi("bundle");
      setData({ tasks: b?.tasks || [], steps: b?.steps || [], evidence: b?.evidence || [], events: b?.events || [] });
      setLoadError("");
    } catch (e) {
      setLoadError(e.message || "Taskboard unavailable");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);
  useEffect(() => { window.scrollTo(0, 0); }, [taskCode]);

  const idx = useMemo(() => buildIndex(data), [data]);
  const current = taskCode ? idx.byCode[decodeURIComponent(taskCode)] : null;

  // Run a server action, then refresh. Returns the result, or false on failure.
  const run = useCallback(async (action, payload, okMsg, toastAction) => {
    setBusy(true);
    try {
      const r = await taskboardApi(action, payload, "tee");
      await load();
      if (okMsg) notify(typeof okMsg === "function" ? okMsg(r) : okMsg, "ok", toastAction ? toastAction(r) : null);
      return r ?? true;
    } catch (e) {
      notify(e.message || "Request failed", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }, [load, notify]);

  const handlers = useMemo(() => ({
    newTask: () => setForm({}),
    newSubtask: (parent) => setForm({ parent }),
    edit: (task) => setForm({ task }),
    move: (id, status) => {
      const t = idx.byId[id];
      if (!t || t.status === status) return;
      return run("update_task", { id, patch: { status } }, `${t.task_code} → ${STATUS_LABEL[status]}`);
    },
    archive: (task) => run("set_archived", { id: task.id, archived: true }, `${task.task_code} archived`, () => ({
      label: "Undo", fn: () => run("set_archived", { id: task.id, archived: false }, `${task.task_code} restored`),
    })),
    restore: (task) => run("set_archived", { id: task.id, archived: false }, `${task.task_code} restored`),
    remove: (task) => setConfirmDelete(task),
    verify: (task, verified) => run("verify_task", { id: task.id, verified }, verified ? `${task.task_code} verified` : `${task.task_code} unverified`),
    createStep: (taskId, f) => run("create_step", { task_id: taskId, ...f }, (s) => `Step ${s?.step_code || ""} added`),
    updateStep: (id, patch) => run("update_step", { id, patch }, patch.status ? `Step marked ${patch.status.replace("_", " ")}` : "Step saved"),
    addEvidence: (payload) => run("add_evidence", payload, "Evidence attached"),
    exportSubtree: (task) => {
      const out = buildExport(data, task);
      downloadJson(out, `virora-taskboard-${task.task_code}-${new Date().toISOString().slice(0, 10)}.json`);
      notify(`Exported ${task.task_code}: ${out.counts.tasks} tasks, ${out.counts.steps} steps, ${out.counts.evidence} evidence, ${out.counts.events} events`);
    },
  }), [idx, run, data, notify]);

  const exportAll = () => {
    const out = buildExport(data);
    downloadJson(out, `virora-taskboard-${new Date().toISOString().slice(0, 10)}.json`);
    notify(`Exported ${out.counts.tasks} tasks, ${out.counts.steps} steps, ${out.counts.evidence} evidence, ${out.counts.events} events`);
  };

  const importFile = async (text, name) => {
    let parsed;
    try { parsed = JSON.parse(text); } catch { notify(`${name} is not valid JSON`, "error"); return; }
    await run("import", { data: parsed }, (r) => {
      const c = r?.created || {};
      const s = r?.skipped || {};
      return `Imported (${r?.format}): ${c.tasks || 0} tasks, ${c.steps || 0} steps, ${c.evidence || 0} evidence, ${c.events || 0} events created · ${s.tasks || 0} tasks already present`;
    });
  };

  const submitForm = async (fields) => {
    if (form?.task) {
      const r = await run("update_task", { id: form.task.id, patch: fields }, `${form.task.task_code} saved`);
      if (r !== false) setForm(null);
      return;
    }
    const r = await run("create_task", { ...fields, parent_id: form?.parent?.id || "" }, (t) => `${t?.task_code} created`);
    if (r !== false) setForm(null);
  };

  if (!user) return <Center><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></Center>;
  if (!isAdmin) {
    return (
      <Center>
        <ShieldAlert className="mx-auto h-8 w-8 text-rose-400" />
        <h1 className="mt-3 text-lg font-semibold">Access denied</h1>
        <p className="mt-1 text-sm text-slate-400">The Taskboard is internal VIRORA infrastructure.</p>
      </Center>
    );
  }
  if (!loaded) return <Center><Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" /><p className="mt-3 text-sm text-slate-400">Loading taskboard…</p></Center>;
  if (loadError && !data.tasks.length) {
    return (
      <Center>
        <h1 className="text-lg font-semibold">Taskboard unavailable</h1>
        <p className="mt-2 text-sm text-slate-400">{loadError}</p>
        <Button className="mt-4" onClick={() => { setLoaded(false); load(); }}>Retry</Button>
      </Center>
    );
  }

  let body;
  if (taskCode && !current) {
    body = (
      <Center>
        <h1 className="text-lg font-semibold">Task {decodeURIComponent(taskCode)} not found</h1>
        <p className="mt-2 text-sm text-slate-400">It may have been deleted. Its history is kept in the parent’s activity log.</p>
        <Link to="/taskboard" className="mt-4 inline-block text-sm text-blue-300 hover:underline">Back to the board</Link>
      </Center>
    );
  } else if (current) {
    body = <TaskPage key={current.id} task={current} data={data} idx={idx} busy={busy} navigate={navigate} handlers={handlers} />;
  } else {
    body = (
      <Board
        data={data}
        idx={idx}
        busy={busy}
        onOpen={(t) => navigate(taskUrl(t))}
        onNew={handlers.newTask}
        onEdit={handlers.edit}
        onMove={handlers.move}
        onArchive={handlers.archive}
        onRestore={handlers.restore}
        onDelete={handlers.remove}
        onExport={exportAll}
        onImport={importFile}
      />
    );
  }

  return (
    <>
      {body}
      {form && <TaskForm task={form.task} parent={form.parent} busy={busy} onClose={() => setForm(null)} onSubmit={submitForm} />}
      {confirmDelete && (
        <DeleteDialog
          task={confirmDelete}
          idx={idx}
          data={data}
          busy={busy}
          onClose={() => setConfirmDelete(null)}
          onConfirm={async (code) => {
            const t = confirmDelete;
            const parent = t.parent_id ? idx.byId[t.parent_id] : null;
            const onPage = current && (current.id === t.id || idx.path(current).some((x) => x.id === t.id));
            const r = await run("delete_task", { id: t.id, confirm: code }, `${t.task_code} deleted`);
            if (r !== false) {
              setConfirmDelete(null);
              if (onPage) navigate(parent ? taskUrl(parent) : "/taskboard");
            }
          }}
        />
      )}
      {busy && <div className="fixed left-0 right-0 top-0 z-[60] h-0.5 animate-pulse bg-blue-400" />}
      {toast && (
        <div role="status" className={`fixed bottom-4 left-1/2 z-[70] flex w-[min(92vw,560px)] -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-2xl ${toast.kind === "error" ? "border-rose-500/50 bg-[#2a0f16] text-rose-100" : "border-slate-600 bg-[#111a2a] text-slate-100"}`}>
          <span className="min-w-0 flex-1">{toast.msg}</span>
          {toast.action && (
            <button type="button" className="font-semibold text-blue-300 hover:text-blue-200" onClick={() => { const a = toast.action; setToast(null); a.fn(); }}>{toast.action.label}</button>
          )}
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-white" aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      )}
    </>
  );
}

function Center({ children }) {
  return <div className="grid min-h-screen place-items-center bg-[#070b12] p-6 text-center text-slate-100"><div>{children}</div></div>;
}

function DeleteDialog({ task, idx, data, busy, onClose, onConfirm }) {
  const [code, setCode] = useState("");
  const desc = idx.descendants(task);
  const ids = new Set([task.id, ...desc.map((d) => d.id)]);
  const steps = data.steps.filter((s) => ids.has(s.task_id)).length;
  const ev = data.evidence.filter((e) => ids.has(e.task_id)).length;
  return (
    <Modal
      title={`Delete ${task.task_code} permanently?`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" icon={Trash2} disabled={busy || code.trim() !== task.task_code} onClick={() => onConfirm(code.trim())}>Delete permanently</Button>
        </>
      }
    >
      <p className="text-sm text-slate-300">
        This removes <b>{task.title}</b> together with <b>{desc.length}</b> subtask(s), <b>{steps}</b> step(s) and <b>{ev}</b> evidence record(s). The activity log keeps a record that it existed.
      </p>
      <p className="mt-2 text-sm text-slate-400">If you only want it off the board, use <b>Archive</b> instead — it can be restored.</p>
      <label className="mt-4 block text-sm text-slate-300">
        Type <span className="font-mono font-semibold text-rose-300">{task.task_code}</span> to confirm
        <input autoFocus value={code} onChange={(e) => setCode(e.target.value)} className={inputCls + " font-mono"} placeholder={task.task_code} />
      </label>
    </Modal>
  );
}
