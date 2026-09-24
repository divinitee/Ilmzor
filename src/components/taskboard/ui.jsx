import React, { useEffect } from "react";
import { X } from "lucide-react";
import { STATUS_LABEL, STATUS_STYLE, PRIORITY_LABEL, PRIORITY_STYLE, ACTOR_STYLE, STEP_LABEL } from "./model";

const BTN = {
  primary: "bg-blue-500 text-white hover:bg-blue-400 border-blue-400/60 shadow-[0_0_0_1px_rgba(59,130,246,.25)]",
  success: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 border-emerald-400/60",
  secondary: "bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white border-slate-700 hover:border-slate-500",
  ghost: "bg-transparent text-slate-400 hover:bg-slate-800/70 hover:text-slate-100 border-transparent",
  danger: "bg-transparent text-rose-300 hover:bg-rose-500/15 border-rose-500/40 hover:border-rose-400",
};
const SIZE = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-4 py-2.5 text-sm" };

export function Button({ variant = "secondary", size = "md", className = "", icon: Icon, children, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${SIZE[size]} ${className}`}
    >
      {Icon && <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />}
      {children}
    </button>
  );
}

export function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.raw_idea;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${s.ring} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${PRIORITY_STYLE[priority] || PRIORITY_STYLE.medium}`}>
      {PRIORITY_LABEL[priority] || priority}
    </span>
  );
}

export function Tag({ children, className = "" }) {
  return <span className={`inline-flex items-center rounded-md border border-slate-700/70 bg-slate-800/50 px-2 py-0.5 text-[11px] text-slate-300 ${className}`}>{children}</span>;
}

export function ActorBadge({ actor }) {
  return <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${ACTOR_STYLE[actor] || ACTOR_STYLE.system}`}>{actor || "?"}</span>;
}

export function StepStatusIcon({ status, className = "" }) {
  const base = "inline-grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] font-bold";
  if (status === "done") return <span className={`${base} border-emerald-400 bg-emerald-400 text-slate-950 ${className}`}>✓</span>;
  if (status === "in_progress") return <span className={`${base} border-blue-400 text-blue-300 ${className}`}><span className="h-2 w-2 rounded-full bg-blue-400" /></span>;
  if (status === "failed") return <span className={`${base} border-rose-400 bg-rose-500/20 text-rose-300 ${className}`}>✕</span>;
  if (status === "skipped") return <span className={`${base} border-slate-600 text-slate-500 ${className}`}>–</span>;
  return <span className={`${base} border-slate-500 ${className}`} title={STEP_LABEL.todo} />;
}

export function ProgressBar({ percent, className = "", tone = "bg-blue-400" }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-slate-800 ${className}`}>
      <div className={`h-full rounded-full ${percent >= 100 ? "bg-emerald-400" : tone} transition-all`} style={{ width: Math.min(100, Math.max(0, percent)) + "%" }} />
    </div>
  );
}

export function Field({ label, children, className = "", hint }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-blue-400/70 focus:ring-1 focus:ring-blue-400/30";

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-3 pt-[6vh] sm:p-6 sm:pt-[8vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`flex max-h-[88vh] w-full flex-col rounded-xl border border-slate-700 bg-[#0c121c] shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-[#0b111b] ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
