import React, { useState } from "react";
import { ChevronDown, ChevronRight, Paperclip, Plus, Check, Play, RotateCcw, Pencil, ExternalLink } from "lucide-react";
import { Button, StepStatusIcon, Field, inputCls, ActorBadge } from "./ui";
import { STEP_STATUSES, STEP_LABEL, EVIDENCE_TYPES, EVIDENCE_LABEL, fmtTime } from "./model";

export function StepCreateForm({ onSubmit, onCancel, busy }) {
  const [f, setF] = useState({ title: "", description: "", expected_result: "" });
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e?.preventDefault?.();
    if (!f.title.trim()) { setErr("Describe the action."); return; }
    const ok = await onSubmit({ ...f, title: f.title.trim() });
    if (ok !== false) setF({ title: "", description: "", expected_result: "" });
  };
  return (
    <form onSubmit={submit} className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Step (action)" className="sm:col-span-2">
          <input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} placeholder="e.g. Attempt cross-owner read as T2" />
        </Field>
        <Field label="Instructions">
          <textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputCls} placeholder="Exactly what to do" />
        </Field>
        <Field label="Expected result">
          <textarea rows={2} value={f.expected_result} onChange={(e) => setF({ ...f, expected_result: e.target.value })} className={inputCls} placeholder="What should happen if it works" />
        </Field>
      </div>
      {err && <div className="mt-2 text-sm text-rose-300">{err}</div>}
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="success" size="sm" icon={Plus} onClick={submit} disabled={busy}>Add step</Button>
      </div>
      <button type="submit" className="hidden" />
    </form>
  );
}

export function EvidenceForm({ onSubmit, onCancel, busy }) {
  const [f, setF] = useState({ type: "note", title: "", reference: "", description: "" });
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e?.preventDefault?.();
    if (!f.title.trim()) { setErr("Give the evidence a title."); return; }
    await onSubmit({ ...f, title: f.title.trim() });
  };
  return (
    <form onSubmit={submit} className="mt-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Type">
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={inputCls}>
            {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{EVIDENCE_LABEL[t]}</option>)}
          </select>
        </Field>
        <Field label="Title" className="sm:col-span-2">
          <input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} placeholder="e.g. T2 read returned 403" />
        </Field>
        <Field label="Reference" hint="URL, file path, commit / checkpoint ID, or pasted output" className="sm:col-span-3">
          <textarea rows={2} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} className={inputCls + " font-mono text-xs"} placeholder="https://…  or  Desktop/VIRORA/Issues Fixed SS/…  or  6ab4d9ad…" />
        </Field>
        <Field label="What does this prove?" className="sm:col-span-3">
          <textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputCls} />
        </Field>
      </div>
      {err && <div className="mt-2 text-sm text-rose-300">{err}</div>}
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" icon={Paperclip} onClick={submit} disabled={busy}>Attach evidence</Button>
      </div>
      <button type="submit" className="hidden" />
    </form>
  );
}

export function EvidenceItem({ ev }) {
  const ref = ev.reference || "";
  const isUrl = /^https?:\/\//i.test(ref.trim());
  return (
    <div className="rounded-lg border border-slate-700/70 bg-slate-950/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-300">{EVIDENCE_LABEL[ev.type] || ev.type}</span>
        <span className="text-sm font-medium text-slate-100">{ev.title}</span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-500"><ActorBadge actor={ev.captured_by} />{fmtTime(ev.captured_at)}</span>
      </div>
      {ref && (isUrl ? (
        <a href={ref.trim()} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 break-all font-mono text-xs text-blue-300 hover:text-blue-200">{ref}<ExternalLink className="h-3 w-3 shrink-0" /></a>
      ) : (
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-black/40 p-2 font-mono text-xs text-slate-300">{ref}</pre>
      ))}
      {ev.description && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-400">{ev.description}</p>}
    </div>
  );
}

export default function StepList({ steps, evidenceByStep, onUpdateStep, onAddEvidence, busy }) {
  const [open, setOpen] = useState({});
  return (
    <div className="divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800">
      {steps.map((s, i) => (
        <StepRow
          key={s.id}
          step={s}
          n={i + 1}
          evidence={evidenceByStep[s.id] || []}
          expanded={!!open[s.id]}
          toggle={() => setOpen((o) => ({ ...o, [s.id]: !o[s.id] }))}
          onUpdateStep={onUpdateStep}
          onAddEvidence={onAddEvidence}
          busy={busy}
        />
      ))}
    </div>
  );
}

function StepRow({ step, n, evidence, expanded, toggle, onUpdateStep, onAddEvidence, busy }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [actual, setActual] = useState(step.actual_result || "");
  const [addingEv, setAddingEv] = useState(false);
  const done = step.status === "done";
  const setStatus = (status) => onUpdateStep(step.id, { status });
  const actualDirty = actual !== (step.actual_result || "");

  return (
    <div className={done ? "bg-emerald-500/[0.03]" : "bg-[#0b111b]"}>
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap">
        <button type="button" onClick={toggle} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label={expanded ? "Collapse step" : "Expand step"}>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <StepStatusIcon status={step.status} />
        <button type="button" onClick={toggle} className="min-w-0 flex-1 text-left">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] text-slate-500">{step.step_code || "#" + n}</span>
            <span className={`text-sm ${done ? "text-slate-400 line-through decoration-slate-600" : step.status === "failed" ? "text-rose-200" : "text-slate-100"}`}>{step.title}</span>
          </div>
          {!expanded && step.expected_result && <div className="mt-0.5 truncate text-xs text-slate-500">Expect: {step.expected_result}</div>}
        </button>
        {evidence.length > 0 && <span className="inline-flex items-center gap-1 text-xs text-blue-300"><Paperclip className="h-3.5 w-3.5" />{evidence.length}</span>}
        <div className="flex shrink-0 items-center gap-1.5">
          {step.status === "todo" && <Button size="sm" variant="ghost" icon={Play} onClick={() => setStatus("in_progress")} disabled={busy}>Start</Button>}
          {!done && <Button size="sm" variant="success" icon={Check} onClick={() => setStatus("done")} disabled={busy}>Mark done</Button>}
          {done && <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => setStatus("todo")} disabled={busy}>Reopen</Button>}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-800 bg-[#080d16] px-4 py-4 sm:pl-14">
          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Step (action)" className="sm:col-span-2"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} /></Field>
              <Field label="Instructions"><textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={inputCls} /></Field>
              <Field label="Expected result"><textarea rows={3} value={draft.expected_result} onChange={(e) => setDraft({ ...draft, expected_result: e.target.value })} className={inputCls} /></Field>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" variant="primary" disabled={busy || !draft.title.trim()} onClick={async () => { await onUpdateStep(step.id, draft); setEditing(false); }}>Save step</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Instructions" value={step.description} />
              <Info label="Expected result" value={step.expected_result} />
            </div>
          )}

          <div className="mt-4">
            <Field label="Actual result — what really happened">
              <textarea rows={2} value={actual} onChange={(e) => setActual(e.target.value)} className={inputCls} placeholder="Record the outcome, error, response…" />
            </Field>
            {actualDirty && (
              <div className="mt-2 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setActual(step.actual_result || "")}>Discard</Button>
                <Button size="sm" variant="primary" disabled={busy} onClick={() => onUpdateStep(step.id, { actual_result: actual })}>Save result</Button>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <label className="flex items-center gap-2">
              Status
              <select value={step.status} disabled={busy} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200">
                {STEP_STATUSES.map((s) => <option key={s} value={s}>{STEP_LABEL[s]}</option>)}
              </select>
            </label>
            {step.completed_at && <span>· {STEP_LABEL[step.status]} {fmtTime(step.completed_at)} by <ActorBadge actor={step.completed_by} /></span>}
            {!step.completed_at && step.started_at && <span>· started {fmtTime(step.started_at)}</span>}
            {!editing && (
              <Button size="sm" variant="ghost" icon={Pencil} className="ml-auto" onClick={() => { setDraft({ title: step.title, description: step.description || "", expected_result: step.expected_result || "" }); setEditing(true); }}>Edit step</Button>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Evidence ({evidence.length})</span>
              {!addingEv && <Button size="sm" icon={Plus} onClick={() => setAddingEv(true)}>Add evidence</Button>}
            </div>
            {addingEv && (
              <EvidenceForm
                busy={busy}
                onCancel={() => setAddingEv(false)}
                onSubmit={async (f) => { const ok = await onAddEvidence({ ...f, step_id: step.id }); if (ok !== false) setAddingEv(false); }}
              />
            )}
            <div className="mt-2 space-y-2">
              {evidence.map((e) => <EvidenceItem key={e.id} ev={e} />)}
              {!evidence.length && !addingEv && <div className="text-xs text-slate-500">No evidence yet. Attach a screenshot path, log, API response, or checkpoint ID once the step is performed.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">{value || <span className="text-slate-500">—</span>}</p>
    </div>
  );
}
