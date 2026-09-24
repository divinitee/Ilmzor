import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowUp, ChevronRight, Plus, Pencil, Archive, RotateCcw, Trash2, Download, ShieldCheck, ShieldOff,
  FolderTree, ListChecks, Paperclip, History, AlertTriangle,
} from "lucide-react";
import { Button, StatusBadge, PriorityBadge, Tag, ProgressBar, Panel, ActorBadge } from "./ui";
import StepList, { StepCreateForm, EvidenceForm, EvidenceItem } from "./StepList";
import { STATUSES, STATUS_LABEL, STATUS_STYLE, fmtDate, fmtTime, isOverdue, taskUrl, inSubtree } from "./model";

export default function TaskPage({ task, data, idx, busy, navigate, handlers }) {
  const [addingStep, setAddingStep] = useState(false);
  const [addingEv, setAddingEv] = useState(false);
  const [showArchivedKids, setShowArchivedKids] = useState(false);
  const [historyScope, setHistoryScope] = useState("subtree");

  const path = idx.path(task);
  const parent = path.length > 1 ? path[path.length - 2] : null;
  const root = path[0];
  const p = idx.progress(task);
  const allKids = idx.children[task.id] || [];
  const kids = allKids.filter((k) => !k.archived);
  const archivedKids = allKids.filter((k) => k.archived);
  const steps = idx.stepsByTask[task.id] || [];
  const taskEvidence = idx.evidenceByTask[task.id] || [];
  const hiddenByAncestor = path.slice(0, -1).some((x) => x.archived);

  const events = useMemo(
    () => data.events.filter((e) => (historyScope === "subtree" ? inSubtree(e.task_code, task.task_code) : e.task_code === task.task_code)),
    [data.events, task.task_code, historyScope],
  );
  const stepsDone = steps.filter((s) => s.status === "done").length;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#080d16]/95 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm">
            <Link to="/taskboard" className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" /> Taskboard
            </Link>
            {path.map((t, i) => (
              <React.Fragment key={t.id}>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                {i === path.length - 1 ? (
                  <span className="rounded-md px-1.5 py-0.5 font-medium text-white" aria-current="page"><span className="font-mono text-xs text-slate-400">{t.task_code}</span> {t.title}</span>
                ) : (
                  <Link to={taskUrl(t)} className="rounded-md px-1.5 py-0.5 text-slate-300 hover:bg-slate-800 hover:text-white">
                    <span className="font-mono text-xs text-slate-500">{t.task_code}</span> {t.title}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6">
        {(task.archived || hiddenByAncestor) && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <Archive className="h-4 w-4" />
            {task.archived ? "This task is archived. It is hidden from the board but kept with its full history." : "A parent of this task is archived, so it is hidden from the board."}
            {task.archived && <Button size="sm" icon={RotateCcw} className="ml-auto" onClick={() => handlers.restore(task)} disabled={busy}>Restore</Button>}
          </div>
        )}

        {/* Title block */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-slate-400">{task.task_code}</span>
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {task.launch_blocker && <span className="rounded border border-rose-500/50 bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold uppercase text-rose-300">Launch blocker</span>}
              {task.verified_at && <span className="inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300"><ShieldCheck className="h-3 w-3" />Verified</span>}
              {parent && <span className="text-xs text-slate-500">subtask of <Link to={taskUrl(parent)} className="text-blue-300 hover:underline">{parent.task_code}</Link></span>}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{task.title}</h1>
            <p className="mt-2 max-w-3xl whitespace-pre-wrap text-[15px] leading-7 text-slate-300">{task.description || <span className="text-slate-500">No description yet. Use Edit to add the objective.</span>}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {task.category && <Tag>{task.category}</Tag>}
              {task.project && <Tag>{task.project}</Tag>}
              {(task.tags || []).map((t) => <Tag key={t} className="text-slate-400">#{t}</Tag>)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="task-status">Status</label>
            <select
              id="task-status"
              value={task.status}
              disabled={busy}
              onChange={(e) => handlers.move(task.id, e.target.value)}
              className={`rounded-lg border bg-slate-950 px-3 py-2 text-sm font-medium outline-none ${STATUS_STYLE[task.status].ring} ${STATUS_STYLE[task.status].text}`}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <Button icon={Pencil} onClick={() => handlers.edit(task)}>Edit</Button>
            {parent ? (
              <Button variant="ghost" icon={ArrowUp} onClick={() => navigate(taskUrl(parent))}>Up</Button>
            ) : (
              <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate("/taskboard")}>Board</Button>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {/* Progress */}
            <Panel title="Progress">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-semibold tabular-nums">{p.percent}%</div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                    {p.kids > 0 && <span><FolderTree className="mr-1 inline h-3.5 w-3.5" />{p.kidsComplete}/{p.kids} subtasks complete</span>}
                    {p.steps > 0 && <span><ListChecks className="mr-1 inline h-3.5 w-3.5" />{p.stepsDone}/{p.steps} steps done</span>}
                    {!p.hasBreakdown && <span>No subtasks or steps yet — progress follows status.</span>}
                  </div>
                </div>
                {task.status === "complete" && (
                  task.verified_at ? (
                    <div className="flex items-center gap-2 text-sm text-cyan-300">
                      <ShieldCheck className="h-4 w-4" /> Verified by <ActorBadge actor={task.verified_by} /> {fmtTime(task.verified_at)}
                      <Button size="sm" variant="ghost" icon={ShieldOff} onClick={() => handlers.verify(task, false)} disabled={busy}>Unverify</Button>
                    </div>
                  ) : (
                    <Button variant="secondary" icon={ShieldCheck} onClick={() => handlers.verify(task, true)} disabled={busy}>Mark verified</Button>
                  )
                )}
              </div>
              <ProgressBar percent={p.percent} className="mt-3 h-2" />
              {task.status === "complete" && p.hasBreakdown && p.percent < 100 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-300"><AlertTriangle className="h-3.5 w-3.5" />Marked Complete while {100 - p.percent}% of its breakdown is still open.</div>
              )}
            </Panel>

            {/* Subtasks */}
            <Panel
              title={`Subtasks (${kids.length})`}
              action={<Button variant="primary" icon={Plus} onClick={() => handlers.newSubtask(task)} disabled={busy}>Add subtask</Button>}
            >
              {kids.length ? (
                <div className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
                  {kids.map((k) => <ChildRow key={k.id} task={k} idx={idx} onOpen={() => navigate(taskUrl(k))} />)}
                </div>
              ) : (
                <button type="button" onClick={() => handlers.newSubtask(task)} className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-400 hover:border-blue-400/60 hover:text-blue-200">
                  <FolderTree className="h-5 w-5" />
                  No subtasks. Break this task down — each subtask gets its own page and can have its own subtasks.
                </button>
              )}
              {archivedKids.length > 0 && (
                <div className="mt-3">
                  <button type="button" onClick={() => setShowArchivedKids((v) => !v)} className="text-xs text-slate-400 hover:text-white">
                    {showArchivedKids ? "Hide" : "Show"} {archivedKids.length} archived subtask{archivedKids.length > 1 ? "s" : ""}
                  </button>
                  {showArchivedKids && (
                    <div className="mt-2 divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800 opacity-70">
                      {archivedKids.map((k) => <ChildRow key={k.id} task={k} idx={idx} onOpen={() => navigate(taskUrl(k))} archived />)}
                    </div>
                  )}
                </div>
              )}
            </Panel>

            {/* Steps */}
            <Panel
              title={`Steps (${stepsDone}/${steps.length} done)`}
              action={!addingStep && <Button variant="success" icon={Plus} onClick={() => setAddingStep(true)} disabled={busy}>Add step</Button>}
            >
              {addingStep && (
                <div className="mb-3">
                  <StepCreateForm
                    busy={busy}
                    onCancel={() => setAddingStep(false)}
                    onSubmit={async (f) => { const ok = await handlers.createStep(task.id, f); if (ok !== false) setAddingStep(false); return ok; }}
                  />
                </div>
              )}
              {steps.length ? (
                <StepList steps={steps} evidenceByStep={idx.evidenceByStep} onUpdateStep={handlers.updateStep} onAddEvidence={handlers.addEvidence} busy={busy} />
              ) : (
                !addingStep && <div className="rounded-lg border border-dashed border-slate-700 px-4 py-5 text-center text-sm text-slate-400">No steps. Steps are the concrete actions you perform and verify — each has an expected and an actual result, and can carry evidence.</div>
              )}
            </Panel>

            {/* Task-level evidence */}
            <Panel
              title={`Task evidence (${taskEvidence.length})`}
              action={!addingEv && <Button icon={Paperclip} onClick={() => setAddingEv(true)} disabled={busy}>Add evidence</Button>}
            >
              {addingEv && (
                <EvidenceForm
                  busy={busy}
                  onCancel={() => setAddingEv(false)}
                  onSubmit={async (f) => { const ok = await handlers.addEvidence({ ...f, task_id: task.id }); if (ok !== false) setAddingEv(false); }}
                />
              )}
              <div className="mt-2 space-y-2">
                {taskEvidence.map((e) => <EvidenceItem key={e.id} ev={e} />)}
                {!taskEvidence.length && !addingEv && <div className="text-sm text-slate-500">Evidence for the task as a whole — e.g. the checkpoint ID that shipped it, or a final screenshot. Step-level evidence lives on each step.</div>}
              </div>
            </Panel>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            <Panel title="Details">
              <dl className="space-y-2 text-sm">
                <Row label="Status"><StatusBadge status={task.status} /></Row>
                <Row label="Priority"><PriorityBadge priority={task.priority} /></Row>
                <Row label="Category">{task.category || "—"}</Row>
                <Row label="Project">{task.project || "—"}</Row>
                <Row label="Due">{task.due_date ? <span className={isOverdue(task) ? "text-rose-300" : ""}>{fmtDate(task.due_date)}{isOverdue(task) ? " · overdue" : ""}</span> : "—"}</Row>
                <Row label="Depends on">
                  {(task.depends_on || []).length ? (
                    <span className="flex flex-wrap justify-end gap-1">
                      {task.depends_on.map((c) => {
                        const dep = idx.byCode[c];
                        return dep ? (
                          <Link key={c} to={taskUrl(dep)} className={`font-mono text-xs hover:underline ${dep.status === "complete" ? "text-emerald-300" : "text-amber-300"}`} title={`${dep.title} — ${STATUS_LABEL[dep.status]}`}>{c}</Link>
                        ) : <span key={c} className="font-mono text-xs text-slate-400">{c}</span>;
                      })}
                    </span>
                  ) : "—"}
                </Row>
                <div className="my-2 border-t border-slate-800" />
                <Row label="Created"><span className="font-mono text-xs">{fmtTime(task.created_date)}</span></Row>
                <Row label="Updated"><span className="font-mono text-xs">{fmtTime(task.updated_date)}</span></Row>
                {task.started_at && <Row label="Started"><span className="font-mono text-xs">{fmtTime(task.started_at)}</span></Row>}
                {task.completed_at && <Row label="Completed"><span className="font-mono text-xs">{fmtTime(task.completed_at)}</span></Row>}
                {task.last_actor && <Row label="Last actor"><ActorBadge actor={task.last_actor} /></Row>}
              </dl>
            </Panel>

            <Panel title="Notes" action={<Button size="sm" variant="ghost" icon={Pencil} onClick={() => handlers.edit(task)}>Edit</Button>}>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{task.notes || <span className="text-slate-500">No notes.</span>}</p>
            </Panel>

            <Panel title="Tree">
              <TreeNode node={root} idx={idx} currentId={task.id} depth={0} />
            </Panel>

            <Panel title="Actions">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={Download} onClick={() => handlers.exportSubtree(task)}>Export this tree</Button>
                {task.archived ? (
                  <Button size="sm" icon={RotateCcw} onClick={() => handlers.restore(task)} disabled={busy}>Restore</Button>
                ) : (
                  <Button size="sm" icon={Archive} onClick={() => handlers.archive(task)} disabled={busy}>Archive</Button>
                )}
                <Button size="sm" variant="danger" icon={Trash2} onClick={() => handlers.remove(task)} disabled={busy}>Delete…</Button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Archive hides the task and its subtasks from the board; restore brings them back. Delete permanently removes the task, its subtasks, steps and evidence (history entries are kept).</p>
            </Panel>
          </aside>
        </div>

        {/* Activity */}
        <div className="mt-5">
          <Panel
            title={`Activity (${events.length})`}
            action={
              <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-xs">
                <button type="button" onClick={() => setHistoryScope("subtree")} className={`rounded-md px-2.5 py-1 ${historyScope === "subtree" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>Include subtasks</button>
                <button type="button" onClick={() => setHistoryScope("self")} className={`rounded-md px-2.5 py-1 ${historyScope === "self" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>This task only</button>
              </div>
            }
          >
            <ActivityList events={events} currentCode={task.task_code} />
          </Panel>
        </div>
      </main>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right text-slate-200">{children}</dd>
    </div>
  );
}

function ChildRow({ task, idx, onOpen, archived }) {
  const p = idx.progress(task);
  const st = STATUS_STYLE[task.status];
  return (
    <button type="button" onClick={onOpen} className="flex w-full flex-wrap items-center gap-3 bg-[#0d1421] px-3 py-3 text-left hover:bg-[#121b2b] sm:flex-nowrap">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} title={STATUS_LABEL[task.status]} />
      <span className="font-mono text-xs text-slate-400">{task.task_code}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-100">{task.title}{archived && <span className="ml-2 text-xs text-amber-300">archived</span>}</span>
        <span className="mt-0.5 block text-xs text-slate-400">
          {STATUS_LABEL[task.status]}
          {p.kids > 0 && ` · ${p.kidsComplete}/${p.kids} subtasks`}
          {p.steps > 0 && ` · ${p.stepsDone}/${p.steps} steps`}
        </span>
      </span>
      <PriorityBadge priority={task.priority} />
      <span className="flex w-28 items-center gap-2">
        <ProgressBar percent={p.percent} />
        <span className="w-9 text-right font-mono text-xs text-slate-300">{p.percent}%</span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-500" />
    </button>
  );
}

function TreeNode({ node, idx, currentId, depth }) {
  const kids = (idx.children[node.id] || []).filter((k) => !k.archived || k.id === currentId);
  const p = idx.progress(node);
  const st = STATUS_STYLE[node.status];
  const current = node.id === currentId;
  const steps = (idx.stepsByTask[node.id] || []).length;
  return (
    <div>
      <Link
        to={taskUrl(node)}
        className={`flex items-center gap-2 rounded-md py-1 pr-2 text-sm hover:bg-slate-800/70 ${current ? "bg-blue-500/15 text-white ring-1 ring-blue-400/40" : "text-slate-300"}`}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
        <span className="font-mono text-[11px] text-slate-500">{node.task_code}</span>
        <span className="min-w-0 flex-1 truncate">{node.title}</span>
        {steps > 0 && <span className="text-[10px] text-slate-500">{steps} st</span>}
        <span className="font-mono text-[11px] text-slate-400">{p.percent}%</span>
      </Link>
      {kids.length > 0 && (
        <div className="ml-[9px] border-l border-slate-800" style={{ marginLeft: 9 + depth * 14 }}>
          {kids.map((k) => <TreeNode key={k.id} node={k} idx={idx} currentId={currentId} depth={0} />)}
        </div>
      )}
    </div>
  );
}

function ActivityList({ events, currentCode }) {
  const [limit, setLimit] = useState(40);
  if (!events.length) return <div className="text-sm text-slate-500">No activity yet.</div>;
  let lastDay = "";
  return (
    <div>
      <ol className="space-y-0">
        {events.slice(0, limit).map((e) => {
          const day = new Date(e.ts).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <li key={e.id}>
              {showDay && <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 first:mt-0">{day}</div>}
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1 border-b border-slate-800/70 py-2 last:border-0">
                <span className="w-12 shrink-0 font-mono text-[11px] text-slate-500">{new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <ActorBadge actor={e.actor} />
                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">{e.action}</span>
                {e.task_code !== currentCode && <span className="font-mono text-[11px] text-blue-300">{e.task_code}</span>}
                <span className="min-w-0 flex-1 text-sm text-slate-300">{e.details || e.field}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {events.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + 100)} className="mt-3 text-sm text-blue-300 hover:text-blue-200">
          <History className="mr-1 inline h-3.5 w-3.5" />Show older ({events.length - limit} more)
        </button>
      )}
    </div>
  );
}
