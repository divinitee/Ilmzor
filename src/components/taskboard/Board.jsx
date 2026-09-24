import React, { useMemo, useRef, useState } from "react";
import { Plus, Search, Upload, Download, Pencil, Archive, RotateCcw, Trash2, ArrowUpRight, ShieldCheck, CalendarDays, FolderTree, ListChecks } from "lucide-react";
import { Button, PriorityBadge, StatusBadge, Tag, ProgressBar, inputCls } from "./ui";
import {
  STATUSES, STATUS_LABEL, STATUS_STYLE, PRIORITIES, PRIORITY_LABEL, PRIORITY_RANK, PRIORITY_EDGE, CATEGORIES,
  fmtDate, isOverdue, relative,
} from "./model";

export default function Board({ data, idx, busy, onOpen, onNew, onEdit, onMove, onArchive, onRestore, onDelete, onExport, onImport }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("priority");
  const [view, setView] = useState("active");
  const [allLevels, setAllLevels] = useState(false);
  const [dragOver, setDragOver] = useState(null);
  const fileRef = useRef(null);

  const archivedCount = data.tasks.filter((t) => t.archived).length;
  const liveRoots = data.tasks.filter((t) => !t.parent_id && !t.archived);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Hide anything whose ancestor is archived too.
    const hiddenByAncestor = (t) => idx.path(t).some((p) => p.archived);
    let arr = data.tasks.filter((t) => (view === "archived" ? t.archived : !hiddenByAncestor(t)));
    if (view === "active" && !q && !allLevels) arr = arr.filter((t) => !t.parent_id);
    if (q) {
      arr = arr.filter((t) => {
        const steps = (idx.stepsByTask[t.id] || []).map((s) => s.title);
        return [t.task_code, t.title, t.description, t.project, t.category, t.notes, ...(t.tags || []), ...steps].join(" ").toLowerCase().includes(q);
      });
    }
    if (category) arr = arr.filter((t) => (t.category || "General") === category);
    if (priority) arr = arr.filter((t) => t.priority === priority);
    if (status) arr = arr.filter((t) => t.status === status);
    const cmp = {
      priority: (a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) || String(b.updated_date).localeCompare(String(a.updated_date)),
      updated: (a, b) => String(b.updated_date).localeCompare(String(a.updated_date)),
      created: (a, b) => String(b.created_date).localeCompare(String(a.created_date)),
      due: (a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"),
      code: (a, b) => a.task_code.localeCompare(b.task_code, undefined, { numeric: true }),
    }[sort];
    return [...arr].sort(cmp);
  }, [data.tasks, idx, query, category, priority, status, sort, view, allLevels]);

  const cats = useMemo(() => {
    const extra = [...new Set(data.tasks.map((t) => t.category).filter((c) => c && !CATEGORIES.includes(c)))];
    return [...CATEGORIES, ...extra];
  }, [data.tasks]);

  const counts = {
    total: liveRoots.length,
    progress: liveRoots.filter((t) => t.status === "in_progress").length,
    blockers: data.tasks.filter((t) => !t.archived && t.launch_blocker && t.status !== "complete").length,
    complete: liveRoots.filter((t) => t.status === "complete").length,
  };
  const columns = status ? [status] : STATUSES;
  const filtersOn = query || category || priority || status || allLevels;

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    onImport(text, file.name);
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100">
      <header className="border-b border-slate-800 bg-[#080d16]">
        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.2em] text-blue-400">VIRORA · Build receipt</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Taskboard</h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                <span><b className="text-slate-100">{counts.total}</b> big tasks</span>
                <span><b className="text-blue-300">{counts.progress}</b> in progress</span>
                <span><b className="text-rose-300">{counts.blockers}</b> open launch blockers</span>
                <span><b className="text-emerald-300">{counts.complete}</b> complete</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={pickFile} />
              <Button icon={Upload} onClick={() => fileRef.current?.click()} disabled={busy}>Import</Button>
              <Button icon={Download} onClick={onExport}>Export</Button>
              <Button variant="primary" size="lg" icon={Plus} onClick={onNew}>Big Task</Button>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
            <div className="relative sm:col-span-2 lg:min-w-[260px] lg:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all tasks, subtasks, steps, tags…" className={inputCls + " pl-9"} aria-label="Search tasks" />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls + " lg:w-auto"} aria-label="Category filter">
              <option value="">All categories</option>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls + " lg:w-auto"} aria-label="Priority filter">
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls + " lg:w-auto"} aria-label="Status filter">
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputCls + " lg:w-auto"} aria-label="Sort">
              <option value="priority">Sort: priority</option>
              <option value="updated">Sort: recently updated</option>
              <option value="created">Sort: newest</option>
              <option value="due">Sort: due date</option>
              <option value="code">Sort: task code</option>
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-[8px] border border-slate-700 bg-slate-950 p-0.5 text-sm">
              <button type="button" onClick={() => setView("active")} className={`rounded-[6px] px-3 py-1.5 ${view === "active" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>Board</button>
              <button type="button" onClick={() => setView("archived")} className={`rounded-[6px] px-3 py-1.5 ${view === "archived" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>Archived ({archivedCount})</button>
            </div>
            {view === "active" && (
              <label className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500">
                <input type="checkbox" checked={allLevels} onChange={(e) => setAllLevels(e.target.checked)} className="h-4 w-4 accent-blue-500" />
                Show subtasks on board
              </label>
            )}
            {filtersOn && (
              <button type="button" onClick={() => { setQuery(""); setCategory(""); setPriority(""); setStatus(""); setAllLevels(false); }} className="text-sm text-blue-300 hover:text-blue-200">
                Clear filters
              </button>
            )}
            <span className="ml-auto text-xs text-slate-500">{visible.length} shown{query && view === "active" ? " · search covers every level" : ""}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6">
        {view === "archived" ? (
          <ArchivedList tasks={visible} idx={idx} onOpen={onOpen} onRestore={onRestore} onDelete={onDelete} busy={busy} />
        ) : data.tasks.length === 0 ? (
          <div className="mx-auto mt-10 max-w-md rounded-[10px] border border-dashed border-slate-700 p-10 text-center">
            <FolderTree className="mx-auto h-8 w-8 text-slate-500" />
            <h2 className="mt-3 text-lg font-semibold">No tasks yet</h2>
            <p className="mt-1 text-sm text-slate-400">Create a big task, then open it to break it down into subtasks and steps.</p>
            <Button variant="primary" size="lg" icon={Plus} className="mt-5" onClick={onNew}>Big Task</Button>
          </div>
        ) : (
          <div className={`grid gap-4 ${columns.length === 1 ? "" : "md:grid-cols-2 xl:grid-cols-4"}`}>
            {columns.map((col) => {
              const list = visible.filter((t) => t.status === col);
              const st = STATUS_STYLE[col];
              return (
                <section
                  key={col}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(col); }}
                  onDragLeave={() => setDragOver((d) => (d === col ? null : d))}
                  onDrop={(e) => { e.preventDefault(); setDragOver(null); const id = e.dataTransfer.getData("text/task-id"); if (id) onMove(id, col); }}
                  className={`flex min-h-[200px] flex-col rounded-[10px] border bg-[#0a0f18] transition-colors ${dragOver === col ? "border-blue-400/70 bg-blue-500/5" : "border-slate-800"}`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">{STATUS_LABEL[col]}</h2>
                    </div>
                    <span className="rounded-[6px] bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{list.length}</span>
                  </div>
                  <div className="flex-1 space-y-2.5 p-2.5">
                    {list.map((t) => (
                      <TaskCard key={t.id} task={t} idx={idx} onOpen={onOpen} onEdit={onEdit} onMove={onMove} onArchive={onArchive} busy={busy} />
                    ))}
                    {!list.length && <div className="rounded-[8px] border border-dashed border-slate-800 px-3 py-6 text-center text-xs text-slate-500">{filtersOn ? "No matches" : "Drop a task here"}</div>}
                    {col === "raw_idea" && !filtersOn && (
                      <button type="button" onClick={onNew} className="flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-slate-700 py-2.5 text-sm text-slate-400 hover:border-blue-400/60 hover:text-blue-200">
                        <Plus className="h-4 w-4" /> Add big task
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function TaskCard({ task, idx, onOpen, onEdit, onMove, onArchive, busy }) {
  const p = idx.progress(task);
  const path = idx.path(task);
  const parentPath = path.slice(0, -1);
  const overdue = isOverdue(task);
  return (
    <article
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/task-id", task.id); e.dataTransfer.effectAllowed = "move"; }}
      onClick={() => onOpen(task)}
      className={`group cursor-pointer rounded-[8px] border border-l-[3px] border-slate-700/70 bg-[#0f1624] p-3 transition-colors hover:border-slate-500 hover:bg-[#121b2b] ${PRIORITY_EDGE[task.priority] || ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-slate-400">{task.task_code}</span>
        <div className="flex items-center gap-1.5">
          {task.launch_blocker && <span className="rounded border border-rose-500/50 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-300">Blocker</span>}
          <PriorityBadge priority={task.priority} />
        </div>
      </div>
      {parentPath.length > 0 && (
        <div className="mt-1.5 truncate text-[11px] text-slate-500">in {parentPath.map((x) => x.title).join(" › ")}</div>
      )}
      <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-slate-100 group-hover:text-white">{task.title}</h3>
      {task.description && <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-400">{task.description}</p>}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {task.category && <Tag>{task.category}</Tag>}
        {task.project && <Tag className="text-slate-400">{task.project}</Tag>}
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-2">
            {p.kids > 0 && <span className="inline-flex items-center gap-1"><FolderTree className="h-3 w-3" />{p.kidsComplete}/{p.kids} subtasks</span>}
            {p.steps > 0 && <span className="inline-flex items-center gap-1"><ListChecks className="h-3 w-3" />{p.stepsDone}/{p.steps} steps</span>}
            {!p.hasBreakdown && <span className="text-slate-500">No breakdown yet</span>}
          </span>
          <span className="font-mono text-slate-300">{p.percent}%</span>
        </div>
        <ProgressBar percent={p.percent} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        {task.due_date && (
          <span className={`inline-flex items-center gap-1 ${overdue ? "text-rose-300" : "text-slate-400"}`}><CalendarDays className="h-3 w-3" />{overdue ? "Overdue · " : ""}{fmtDate(task.due_date)}</span>
        )}
        {task.verified_at && <span className="inline-flex items-center gap-1 text-cyan-300"><ShieldCheck className="h-3 w-3" />Verified</span>}
        {task.updated_date && <span className="text-slate-500">updated {relative(task.updated_date)}</span>}
      </div>
      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-800 pt-2.5" onClick={(e) => e.stopPropagation()}>
        <select
          value={task.status}
          disabled={busy}
          onChange={(e) => onMove(task.id, e.target.value)}
          className="min-w-0 flex-1 rounded-[6px] border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none hover:border-slate-500"
          aria-label={`Move ${task.task_code}`}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <Button size="sm" icon={Pencil} onClick={() => onEdit(task)} aria-label={`Edit ${task.task_code}`}>Edit</Button>
        <Button size="sm" variant="ghost" icon={Archive} onClick={() => onArchive(task)} aria-label={`Archive ${task.task_code}`} title="Archive" />
        <Button size="sm" variant="ghost" icon={ArrowUpRight} onClick={() => onOpen(task)} aria-label={`Open ${task.task_code}`} title="Open" />
      </div>
    </article>
  );
}

function ArchivedList({ tasks, idx, onOpen, onRestore, onDelete, busy }) {
  if (!tasks.length) return <div className="rounded-[10px] border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">Archive is empty.</div>;
  return (
    <div className="overflow-hidden rounded-[10px] border border-slate-800 divide-y divide-slate-800">
      {tasks.map((t) => {
        const parents = idx.path(t).slice(0, -1);
        return (
          <div key={t.id} className="flex flex-wrap items-center gap-3 bg-[#0b111b] px-4 py-3">
            <span className="font-mono text-xs text-slate-400">{t.task_code}</span>
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => onOpen(t)} className="block truncate text-left text-sm font-medium text-slate-200 hover:text-white">{t.title}</button>
              <div className="text-[11px] text-slate-500">{parents.length ? "in " + parents.map((x) => x.title).join(" › ") + " · " : ""}archived {relative(t.archived_at)}</div>
            </div>
            <StatusBadge status={t.status} />
            <Button size="sm" icon={RotateCcw} onClick={() => onRestore(t)} disabled={busy}>Restore</Button>
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => onDelete(t)} disabled={busy}>Delete…</Button>
          </div>
        );
      })}
    </div>
  );
}
