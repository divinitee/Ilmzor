import React, { useMemo, useState } from "react";
import {
  ArrowDown, ArrowUp, Check, ChevronRight, Crosshair, Flag, LayoutGrid, Plus, Search, Sparkles, Trophy, X, Zap,
} from "lucide-react";
import { Button, PriorityBadge, ProgressBar, Modal, inputCls } from "./ui";
import { PRIORITY_RANK, STATUS_LABEL, relative, dependencyState, WORK_MODE_LABEL, calibratedEstimate } from "./model";

// Focus: the Taskboard's front page (Tee, 2026-10-03 — "I'm getting
// overwhelmed by tasks"). Shows ONE task being worked on now, its own
// step-by-step roadmap, and a short "up next" queue. Everything else lives in
// the backlog (the full board), one click away but out of sight.

export const ROADMAP_MAX = 6;

// Tasks on the roadmap, in order. Complete / archived ones (or ones under an
// archived parent) are skipped, so finishing a task never leaves a ghost.
export function roadmapOf(data, idx) {
  return data.tasks
    .filter((t) => (Number(t.focus_rank) || 0) > 0 && !t.archived && t.status !== "complete")
    .filter((t) => !idx.path(t).slice(0, -1).some((a) => a.archived))
    .filter((t) => !dependencyState(t, idx.byCode).blocked)
    .sort((a, b) => a.focus_rank - b.focus_rank);
}

// The "Now" task's own path: its steps, then its open subtasks, in order.
function pathOf(task, idx) {
  const steps = (idx.stepsByTask[task.id] || [])
    .filter((s) => s.status !== "skipped")
    .map((s) => ({ kind: "step", id: s.id, code: s.step_code, title: s.title, done: s.status === "done", active: s.status === "in_progress", raw: s }));
  const kids = (idx.children[task.id] || [])
    .filter((k) => !k.archived)
    .map((k) => ({ kind: "task", id: k.id, code: k.task_code, title: k.title, done: k.status === "complete", active: k.status === "in_progress", raw: k, pct: idx.progress(k).percent }));
  return [...steps, ...kids];
}

export default function Focus({ data, idx, busy, onOpen, onBacklog, onNew, handlers }) {
  const [picker, setPicker] = useState(null); // null | "next" | "now"
  const [showDone, setShowDone] = useState(false);

  const roadmap = useMemo(() => roadmapOf(data, idx), [data, idx]);
  const now = roadmap[0] || null;
  const next = roadmap.slice(1);
  const ids = roadmap.map((t) => t.id);

  const visible = data.tasks.filter((t) => !t.archived && !idx.path(t).slice(0, -1).some((a) => a.archived));
  const backlogCount = visible.filter((t) => t.status !== "complete" && !ids.includes(t.id)).length;
  const weekAgo = Date.now() - 7 * 864e5;
  const wins = visible
    .filter((t) => t.status === "complete" && t.completed_at && new Date(t.completed_at).getTime() > weekAgo)
    .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)));

  const path = now ? pathOf(now, idx) : [];
  const done = path.filter((p) => p.done);
  const open = path.filter((p) => !p.done);
  const current = open.find((p) => p.active) || open[0] || null;
  const upcoming = open.filter((p) => p !== current);
  const pct = now ? idx.progress(now).percent : 0;

  const save = (list, msg) => handlers.setRoadmap(list.map((t) => t.id), msg);
  const move = (i, dir) => {
    const list = [...roadmap];
    const j = i + dir;
    if (j < 1 || j >= list.length) return; // "Now" only changes via "Do now"
    [list[i], list[j]] = [list[j], list[i]];
    save(list, "Roadmap reordered");
  };
  const doNow = (t) => save([t, ...roadmap.filter((x) => x.id !== t.id)], `${t.task_code} is now your focus`);
  const drop = (t) => save(roadmap.filter((x) => x.id !== t.id), `${t.task_code} moved back to the backlog`);
  const finishNow = async () => {
    const ok = await handlers.move(now.id, "complete");
    if (ok !== false) await save(next, next[0] ? `Nice. ${now.task_code} done — ${next[0].task_code} is up` : `Nice. ${now.task_code} done`);
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100">
      <header className="border-b border-slate-800 bg-[#080d16]">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-end justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[.2em] text-blue-400">VIRORA · Taskboard</div>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight"><Crosshair className="h-5 w-5 text-blue-300" /> Focus</h1>
            <p className="mt-1 text-sm text-slate-400">One thing now. A short road after it. Everything else can wait in the backlog.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={LayoutGrid} onClick={onBacklog}>Backlog · {backlogCount}</Button>
            <Button variant="primary" icon={Plus} onClick={onNew}>New task</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1100px] gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_340px]">
        {/* ───────── NOW ───────── */}
        <section className="rounded-[14px] border border-blue-500/40 bg-gradient-to-b from-blue-500/[0.08] to-[#0b111b] p-5 shadow-[0_0_60px_rgba(59,130,246,0.10)] sm:p-6">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-blue-300">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-400" /></span>
            Now
          </div>

          {!now ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <Sparkles className="h-8 w-8 text-blue-300" />
              <h2 className="text-xl font-semibold">Nothing in focus</h2>
              <p className="max-w-sm text-sm text-slate-400">Pick the one task that matters most right now. Just one.</p>
              <Button variant="primary" size="lg" icon={Crosshair} onClick={() => setPicker("now")}>Pick my focus</Button>
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-slate-400">{now.task_code}</span>
                <PriorityBadge priority={now.priority} />
                <span className="rounded border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[11px] text-slate-300">{WORK_MODE_LABEL[now.work_mode || "hands_on"]} · {calibratedEstimate(now, data.workLogs || []).minutes}m</span>
                {now.ai_minutes > 0 && <span className="rounded border border-orange-500/20 bg-orange-500/5 px-2 py-0.5 text-[11px] text-orange-300">AI {now.ai_minutes}m</span>}
                {now.launch_blocker && <span className="rounded border border-rose-500/50 bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold uppercase text-rose-300">Launch blocker</span>}
              </div>
              <button type="button" onClick={() => onOpen(now)} className="mt-1.5 text-left text-2xl font-semibold tracking-tight hover:text-blue-200 sm:text-[28px]">
                {now.title}
              </button>
              {now.description && <p className="mt-2 line-clamp-3 max-w-2xl whitespace-pre-wrap text-[15px] leading-7 text-slate-300">{now.description}</p>}
              <div className="mt-4 flex items-center gap-3">
                <ProgressBar percent={pct} className="h-2 flex-1" />
                <span className="w-10 text-right text-sm font-semibold text-slate-300">{pct}%</span>
              </div>

              {/* the task's own roadmap */}
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Roadmap</h3>
                  {done.length > 0 && (
                    <button type="button" onClick={() => setShowDone((v) => !v)} className="text-xs text-emerald-300 hover:underline">
                      {showDone ? "Hide" : "Show"} {done.length} done ✓
                    </button>
                  )}
                </div>

                {path.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
                    No steps yet. Break it into small steps so you always know the very next move.
                    <div className="mt-3"><Button size="sm" icon={Plus} onClick={() => onOpen(now)}>Add steps</Button></div>
                  </div>
                ) : (
                  <ol className="relative ml-3 border-l-2 border-slate-800">
                    {showDone && done.map((p) => (
                      <li key={p.id} className="relative pb-3 pl-6">
                        <span className="absolute -left-[11px] top-0.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-400 text-[11px] font-bold text-slate-950">✓</span>
                        <span className="text-sm text-slate-500 line-through">{p.title}</span>
                      </li>
                    ))}
                    {current && (
                      <li className="relative pb-5 pl-6">
                        <span className="absolute -left-[13px] top-0 grid h-6 w-6 place-items-center rounded-full border-2 border-blue-400 bg-[#0b111b]"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-400" /></span>
                        <div className="rounded-[10px] border border-blue-500/40 bg-blue-500/[0.07] p-3.5">
                          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-300">Do this next</div>
                          <div className="mt-1 text-[15px] font-semibold text-white">{current.title}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {current.kind === "step" ? (
                              <Button size="sm" variant="success" icon={Check} disabled={busy} onClick={() => handlers.updateStep(current.id, { status: "done" })}>Mark done</Button>
                            ) : (
                              <Button size="sm" variant="primary" icon={ChevronRight} onClick={() => onOpen(current.raw)}>Open {current.code} · {current.pct}%</Button>
                            )}
                          </div>
                        </div>
                      </li>
                    )}
                    {upcoming.slice(0, 4).map((p) => (
                      <li key={p.id} className="relative pb-3 pl-6">
                        <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-slate-600 bg-[#0b111b]" />
                        <span className="text-sm text-slate-300">{p.title}</span>
                        {p.kind === "task" && <span className="ml-2 font-mono text-[11px] text-slate-500">{p.code}</span>}
                      </li>
                    ))}
                    {upcoming.length > 4 && (
                      <li className="relative pl-6 text-xs text-slate-500">
                        <button type="button" onClick={() => onOpen(now)} className="hover:text-slate-300 hover:underline">+{upcoming.length - 4} more steps</button>
                      </li>
                    )}
                    {!current && (
                      <li className="relative pl-6 text-sm text-emerald-300">Every step is done. Finish it below.</li>
                    )}
                  </ol>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">
                <Button variant="success" icon={Flag} disabled={busy} onClick={finishNow}>
                  Finish {now.task_code}{next[0] ? ` → start ${next[0].task_code}` : ""}
                </Button>
                <Button icon={ChevronRight} onClick={() => onOpen(now)}>Open task</Button>
                <Button variant="ghost" icon={X} disabled={busy} onClick={() => drop(now)}>Not now</Button>
              </div>
            </>
          )}
        </section>

        {/* ───────── UP NEXT + WINS ───────── */}
        <aside className="flex flex-col gap-5">
          <section className="rounded-[14px] border border-slate-800 bg-[#0b111b] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Up next</h2>
              <span className="text-[11px] text-slate-500">{roadmap.length}/{ROADMAP_MAX}</span>
            </div>
            {next.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing queued. That's fine — finish the one in front of you.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {next.map((t, i) => {
                  const pos = i + 1; // index in roadmap
                  return (
                    <li key={t.id} className="group rounded-[10px] border border-slate-800 bg-slate-900/40 p-3">
                      <div className="flex items-start gap-3">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-slate-600 text-xs font-bold text-slate-300">{pos}</span>
                        <button type="button" onClick={() => onOpen(t)} className="min-w-0 flex-1 text-left">
                          <div className="font-mono text-[11px] text-slate-500">{t.task_code} · {STATUS_LABEL[t.status]}</div>
                          <div className="truncate text-sm font-medium text-slate-100 group-hover:text-blue-200">{t.title}</div>
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-1 pl-9">
                        <button type="button" aria-label="Move up" disabled={busy || pos === 1} onClick={() => move(pos, -1)} className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-white disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label="Move down" disabled={busy || pos === roadmap.length - 1} onClick={() => move(pos, 1)} className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-white disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                        <button type="button" disabled={busy} onClick={() => doNow(t)} className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/10"><Zap className="h-3 w-3" />Do now</button>
                        <button type="button" aria-label="Back to backlog" title="Back to backlog" disabled={busy} onClick={() => drop(t)} className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-300"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            <button
              type="button"
              disabled={busy || roadmap.length >= ROADMAP_MAX}
              onClick={() => setPicker(now ? "next" : "now")}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-slate-700 py-2.5 text-sm text-slate-400 hover:border-blue-400/60 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> {roadmap.length >= ROADMAP_MAX ? "Roadmap full — finish something first" : "Pull from backlog"}
            </button>
          </section>

          <section className="rounded-[14px] border border-slate-800 bg-[#0b111b] p-4">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300"><Trophy className="h-3.5 w-3.5 text-amber-300" /> Done this week · {wins.length}</h2>
            {wins.length === 0 ? (
              <p className="text-sm text-slate-500">Your finished tasks show up here.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {wins.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => onOpen(t)} className="flex w-full items-center gap-2 text-left text-sm text-slate-300 hover:text-white">
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-400 text-[9px] font-bold text-slate-950">✓</span>
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                      <span className="shrink-0 text-[11px] text-slate-500">{relative(t.completed_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </main>

      {picker && (
        <Picker
          mode={picker}
          data={data}
          idx={idx}
          exclude={ids}
          onClose={() => setPicker(null)}
          onPick={async (t) => {
            const list = picker === "now" ? [t, ...roadmap] : [...roadmap, t];
            const ok = await save(list.slice(0, ROADMAP_MAX), picker === "now" ? `${t.task_code} is now your focus` : `${t.task_code} added to Up next`);
            if (ok !== false) setPicker(null);
          }}
        />
      )}
    </div>
  );
}

function Picker({ mode, data, idx, exclude, onClose, onPick }) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.tasks
      .filter((t) => !t.archived && t.status !== "complete" && !exclude.includes(t.id))
      .filter((t) => !idx.path(t).slice(0, -1).some((a) => a.archived))
      .filter((t) => !needle || `${t.task_code} ${t.title}`.toLowerCase().includes(needle))
      .sort((a, b) =>
        (b.status === "in_progress") - (a.status === "in_progress") ||
        (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2) ||
        String(a.task_code).localeCompare(String(b.task_code), undefined, { numeric: true }))
      .slice(0, 60);
  }, [data.tasks, idx, exclude, q]);

  return (
    <Modal title={mode === "now" ? "What are you working on now?" : "Add to Up next"} onClose={onClose} wide>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className={inputCls + " pl-9"} />
      </label>
      <ul className="mt-3 flex flex-col gap-1.5">
        {rows.length === 0 && <li className="py-6 text-center text-sm text-slate-500">No open tasks match.</li>}
        {rows.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => onPick(t)} className="flex w-full items-center gap-3 rounded-[8px] border border-slate-800 px-3 py-2.5 text-left hover:border-blue-400/50 hover:bg-blue-500/[0.06]">
              <span className="w-20 shrink-0 font-mono text-xs text-slate-500">{t.task_code}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{t.title}</span>
              <span className="hidden text-[11px] text-slate-500 sm:inline">{STATUS_LABEL[t.status]}</span>
              <PriorityBadge priority={t.priority} />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
