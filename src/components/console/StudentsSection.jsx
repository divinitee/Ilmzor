import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, CreditCard, X, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PlanDot } from "@/components/payments/MemberCard";
import { planKey } from "@/lib/planTheme";
import { consoleApi, errorText } from "@/lib/consoleApi";

// Students (VT-35 P2a). Read through adminApi `studentsList` / `studentDetail`,
// every change through `studentAction` (audited server-side). Nothing here
// touches the entity SDK.

const KIND = {
  paid: { label: "Paid", cls: "bg-emerald-500/15 text-emerald-300" },
  ending: { label: "Ending", cls: "bg-orange-500/15 text-orange-300" },
  trial: { label: "Trial", cls: "bg-sky-500/15 text-sky-300" },
  free: { label: "Free", cls: "bg-white/10 text-white/60" },
  pending: { label: "Pending", cls: "bg-amber-500/15 text-amber-300" },
  paused: { label: "Paused", cls: "bg-amber-500/15 text-amber-300" },
  cancelled: { label: "Cancelled", cls: "bg-white/10 text-white/40 line-through" },
  unpaid: { label: "Lapsed", cls: "bg-rose-500/15 text-rose-300" },
  none: { label: "No plan", cls: "bg-white/5 text-white/40" },
};
const FILTERS = [
  ["all", "All"], ["paying", "Paying"], ["trial", "Trial"], ["free", "Free"], ["pending", "Pending"],
  ["paused", "Paused"], ["ending", "Ending"], ["cancelled", "Cancelled"], ["unpaid", "Lapsed"], ["none", "No plan"],
];
const METHOD = { card: "Card", qr: "QR", grant: "Granted", manual: "Manual" };
const ACTION_ERRORS = {
  card_managed_by_dodo: "This is a live card subscription. Change or cancel it in Dodo; edits here would be overwritten and wouldn't stop the card being charged.",
  wrong_state: "That action doesn't fit this subscription's current state. Refresh and check.",
  no_subscription: "This account has no subscription yet. Use Grant plan.",
  no_plan_to_approve: "There's no paid plan on this row to approve. Use Grant plan.",
  nothing_to_run_out: "There's no paid period to run out. Cancel now instead.",
  is_teacher: "Teachers can't be put in a group as a student.",
  own_group: "Someone can't join their own group.",
  group_not_found: "No group uses that code.",
  group_ended: "That group has ended.",
  group_unavailable: "That group's teacher isn't approved.",
  already_in_group: "They're already in that group.",
  not_in_group: "They aren't in a group.",
  invalid_input: "Check the values and try again.",
};
const actionError = (e) => ACTION_ERRORS[e?.code] || errorText(e);

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => (d ? new Date(String(d).length === 10 ? d + "T00:00:00" : d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
const ago = (iso) => {
  if (!iso) return "never";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 60) return `${Math.max(m, 1)} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};
const daysLeft = (d) => (d ? Math.ceil((Date.parse(d + "T23:59:59") - Date.now()) / 86400000) : null);
const kindOf = (sub) => (sub ? sub.kind : "none");

function KindBadge({ kind }) {
  const k = KIND[kind] || KIND.none;
  return <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${k.cls}`}>{k.label}</span>;
}
const dotPlan = (sub) => planKey(sub?.plan, { isTrial: sub?.is_trial });

// ------------------------------------------------------------ drawer

const input = "h-10 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none focus:border-violet-400";
const primary = "h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500 select-none disabled:opacity-40";
const ghost = "h-9 rounded-xl border border-white/15 px-3 text-sm text-white/80 hover:bg-white/5 select-none disabled:opacity-40";

function ActionPanel({ title, children, onSubmit, busy, error, submitLabel = "Confirm", danger = false, onCancel }) {
  return (
    <div className="mt-3 rounded-xl border border-violet-400/30 bg-black/20 p-4">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <div className="space-y-3">{children}</div>
      {error && <p className="mt-3 text-sm text-rose-300">{actionError(error)}</p>}
      <div className="mt-4 flex gap-2">
        <button className={`${primary} ${danger ? "bg-rose-600 hover:bg-rose-500" : ""}`} disabled={busy} onClick={onSubmit}>
          {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : submitLabel}
        </button>
        <button className={ghost} onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block text-xs text-white/60">
      {label}
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-white/40">{hint}</p>}
    </label>
  );
}

function Actions({ detail, onDone, onSessionLost }) {
  const sub = detail.subscription;
  const kind = kindOf(sub);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [f, setF] = useState({ plan: "learner", cycle: "monthly", until: "", days: 30, immediate: true, code: "", note: "" });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));

  const openPanel = (k) => { setOpen(k); setError(null); setDone(null); setF((p) => ({ ...p, note: "", code: sub?.referral_code || "" })); };
  const run = async (op, payload) => {
    setBusy(true); setError(null);
    try {
      await consoleApi("studentAction", { user_id: detail.profile.user_id, op, note: f.note, ...payload });
      setOpen(null);
      setDone(op);
      onDone();
    } catch (e) {
      if (e.isSessionError) onSessionLost(e); else setError(e);
    } finally { setBusy(false); }
  };

  const live = sub?.live_card;
  const isTeacher = ["approved", "pending"].includes(detail.profile.teacher_status);
  const buttons = [
    !live && ["grant", "Grant plan"],
    !live && sub?.status === "active" && sub?.expires_at && ["extend", "Extend"],
    !live && sub && ["pending", "cancelled", "inactive"].includes(sub.status) && /learner|vip/i.test(sub.plan) && ["approve", "Approve"],
    !live && sub?.status === "active" && ["pause", "Pause"],
    !live && sub?.status === "paused" && ["resume", "Resume"],
    !live && sub && ["active", "paused"].includes(sub.status) && ["cancel", "Cancel"],
    !live && ["cancelled", "ending"].includes(kind) && ["reactivate", "Reactivate"],
    !isTeacher && ["move", sub?.referral_code ? "Change group" : "Add to group"],
  ].filter(Boolean);

  const note = (
    <Field label="Note (optional, saved on the row and in the audit log)">
      <input className={input} value={f.note} onChange={set("note")} maxLength={500} placeholder="e.g. paid cash on 4 Oct" />
    </Field>
  );

  return (
    <div>
      {live && (
        <p className="mb-3 flex gap-2 rounded-xl bg-sky-500/10 p-3 text-xs text-sky-200">
          <CreditCard className="h-4 w-4 shrink-0" /> Live card subscription (Dodo). Plan changes happen in Dodo, not here. You can still change their group.
        </p>
      )}
      {done && <p className="mb-3 flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Done. Saved and logged.</p>}
      <div className="flex flex-wrap gap-2">
        {buttons.map(([k, label]) => (
          <button key={k} className={`${ghost} ${open === k ? "border-violet-400 bg-violet-600/20" : ""} ${k === "cancel" ? "text-rose-200" : ""}`} onClick={() => openPanel(k)}>{label}</button>
        ))}
      </div>

      {open === "grant" && (
        <ActionPanel title="Grant a plan" busy={busy} error={error} onCancel={() => setOpen(null)}
          onSubmit={() => run("grant", { plan: f.plan, cycle: f.cycle, until: f.until || undefined })}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan"><select className={input} value={f.plan} onChange={set("plan")}><option value="learner">Learner</option><option value="vip">VIP</option></select></Field>
            <Field label="Cycle"><select className={input} value={f.cycle} onChange={set("cycle")}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></Field>
          </div>
          <Field label="Until (optional)" hint="Leave empty for one normal period from today. Replaces any current plan.">
            <input type="date" className={input} value={f.until} min={today()} onChange={set("until")} />
          </Field>
          {note}
        </ActionPanel>
      )}
      {open === "extend" && (
        <ActionPanel title={`Extend (currently ends ${fmtDate(sub.expires_at)})`} busy={busy} error={error} onCancel={() => setOpen(null)}
          onSubmit={() => run("extend", { days: Number(f.days) })}>
          <div className="flex gap-2">
            {[3, 7, 30].map((d) => <button key={d} className={`${ghost} ${Number(f.days) === d ? "border-violet-400" : ""}`} onClick={() => set("days")(d)}>+{d} days</button>)}
            <input type="number" min={1} max={366} className={`${input} w-24`} value={f.days} onChange={set("days")} />
          </div>
          {note}
        </ActionPanel>
      )}
      {open === "approve" && (
        <ActionPanel title={`Approve ${sub.plan} for one ${sub.billing_cycle || "monthly"} period`} busy={busy} error={error} onCancel={() => setOpen(null)} onSubmit={() => run("approve")}>
          <p className="text-xs text-white/60">Only approve after the money has actually arrived.</p>
          {note}
        </ActionPanel>
      )}
      {open === "pause" && (
        <ActionPanel title="Pause access" busy={busy} error={error} onCancel={() => setOpen(null)} onSubmit={() => run("pause")}>
          <p className="text-xs text-white/60">Access stops now. The {daysLeft(sub.expires_at) ?? 0} days they have left are saved and given back when you resume.</p>
          {note}
        </ActionPanel>
      )}
      {open === "resume" && (
        <ActionPanel title="Resume access" busy={busy} error={error} onCancel={() => setOpen(null)} onSubmit={() => run("resume")}>
          <p className="text-xs text-white/60">{typeof sub.paused_days_remaining === "number" ? `They get their ${sub.paused_days_remaining} saved days back from today.` : "Comes back with no end date (free plan)."}</p>
          {note}
        </ActionPanel>
      )}
      {open === "cancel" && (
        <ActionPanel title="Cancel subscription" danger submitLabel="Cancel subscription" busy={busy} error={error} onCancel={() => setOpen(null)}
          onSubmit={() => run("cancel", { immediate: f.immediate })}>
          <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2"><input type="radio" checked={f.immediate} onChange={() => set("immediate")(true)} className="mt-1 accent-rose-500" /> Cut access now</label>
            {sub.status === "active" && sub.expires_at && (
              <label className="flex items-start gap-2"><input type="radio" checked={!f.immediate} onChange={() => set("immediate")(false)} className="mt-1 accent-violet-500" /> Let them keep it until {fmtDate(sub.expires_at)}, then end</label>
            )}
          </div>
          {note}
        </ActionPanel>
      )}
      {open === "reactivate" && (
        <ActionPanel title={kind === "ending" ? "Undo the scheduled cancellation" : "Reactivate with a fresh period"} busy={busy} error={error} onCancel={() => setOpen(null)} onSubmit={() => run("reactivate")}>
          {note}
        </ActionPanel>
      )}
      {open === "move" && (
        <ActionPanel title="Group" busy={busy} error={error} onCancel={() => setOpen(null)} submitLabel={f.code ? "Move" : "Remove from group"}
          onSubmit={() => run("move", { code: f.code })}>
          <Field label="Group" hint="Commission follows the student: renewals from now on go to the new teacher. Past payments stay with the old one.">
            <select className={input} value={f.code} onChange={set("code")}>
              <option value="">No group</option>
              {detail.groups.map((g) => <option key={g.code} value={g.code}>{g.label} · {g.teacher_name}{g.level ? ` · ${g.level}` : ""}</option>)}
            </select>
          </Field>
          {note}
        </ActionPanel>
      )}
    </div>
  );
}

function Drawer({ userId, onClose, onChanged, onSessionLost }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try { setD(await consoleApi("studentDetail", { user_id: userId })); setError(null); }
    catch (e) { if (e.isSessionError) onSessionLost(e); else setError(e); }
  }, [userId, onSessionLost]);

  useEffect(() => { setD(null); load(); }, [load]);

  const sub = d?.subscription;
  return (
    <Sheet open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto border-white/10 bg-[#0E0F26] p-0 text-white sm:max-w-xl">
        {!d ? (
          <div className="flex h-64 items-center justify-center">
            {error ? <p className="text-sm text-rose-300">{errorText(error)}</p> : <Loader2 className="h-6 w-6 animate-spin text-violet-300" />}
          </div>
        ) : (
          <div className="space-y-5 p-5">
            <div className="flex items-start gap-3 pr-8">
              <PlanDot plan={dotPlan(sub)} size={14} className="mt-1.5" />
              <div className="min-w-0">
                <SheetTitle className="truncate text-lg font-bold text-white">{d.profile.name}</SheetTitle>
                <SheetDescription className="truncate text-sm text-white/50">{d.profile.email}</SheetDescription>
              </div>
            </div>

            <section className="rounded-2xl border border-white/10 bg-[#11122A] p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{sub?.plan || "No plan"}</p>
                <KindBadge kind={kindOf(sub)} />
              </div>
              {sub && (
                <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-white/50">Ends</dt><dd>{sub.expires_at ? `${fmtDate(sub.expires_at)}${daysLeft(sub.expires_at) !== null ? ` (${Math.max(daysLeft(sub.expires_at), 0)} d)` : ""}` : "No end date"}</dd>
                  <dt className="text-white/50">Cycle</dt><dd>{sub.billing_cycle || "—"}</dd>
                  <dt className="text-white/50">Paid since</dt><dd>{fmtDate(sub.paid_since)}</dd>
                  <dt className="text-white/50">Group</dt><dd>{sub.referral_code ? `${sub.referral_code} · ${sub.teacher_name || "?"}` : "None"}</dd>
                  {sub.admin_note && <><dt className="text-white/50">Note</dt><dd className="text-white/80">{sub.admin_note}</dd></>}
                </dl>
              )}
              {d.other_subscriptions.length > 0 && (
                <p className="mt-3 flex gap-2 text-xs text-amber-200/80"><AlertTriangle className="h-4 w-4 shrink-0" /> {d.other_subscriptions.length} older subscription row(s) also exist for this account. The one shown is the one the app uses.</p>
              )}
              <div className="mt-4"><Actions detail={d} onDone={() => { load(); onChanged(); }} onSessionLost={onSessionLost} /></div>
            </section>

            <section className="grid grid-cols-3 gap-2 text-center">
              {[["Last active", ago(d.activity.last_active_at)], ["Minutes (7 d)", d.activity.minutes_7d], ["Minutes (30 d)", d.activity.minutes_30d]].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-white/10 bg-[#11122A] p-3"><p className="text-[11px] text-white/50">{l}</p><p className="mt-1 font-semibold">{v}</p></div>
              ))}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#11122A] p-4 text-sm">
              <p className="mb-2 font-semibold">Profile</p>
              <dl className="grid grid-cols-2 gap-y-1.5">
                <dt className="text-white/50">Level</dt><dd>{d.profile.level || "—"}{d.profile.level_source ? ` (${d.profile.level_source})` : ""}</dd>
                <dt className="text-white/50">Joined</dt><dd>{fmtDate(d.profile.joined_at)}</dd>
                <dt className="text-white/50">Trial used</dt><dd>{d.profile.trial_used_at ? fmtDate(d.profile.trial_used_at) : "No"}</dd>
                <dt className="text-white/50">Found us via</dt><dd>{d.profile.heard_about_us || "—"}</dd>
                {d.profile.teacher_status && <><dt className="text-white/50">Teacher</dt><dd>{d.profile.teacher_status}</dd></>}
              </dl>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#11122A] p-4 text-sm">
              <p className="mb-2 font-semibold">QR payments</p>
              {d.payments.length === 0 ? <p className="text-white/40">None. Card payments aren't recorded one by one yet (Payments phase).</p> : (
                <ul className="space-y-2">
                  {d.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span>{p.plan} · {p.billing_cycle} · {Number(p.amount_uzs || 0).toLocaleString("en-US")} so'm <span className="text-white/40">({p.payment_code})</span></span>
                      <span className="text-xs text-white/50">{p.status} · {fmtDate(p.reviewed_at || p.submitted_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#11122A] p-4 text-sm">
              <p className="mb-2 font-semibold">History</p>
              {d.history.filter((h) => h.action !== "student_view").length === 0 ? <p className="text-white/40">No console changes yet.</p> : (
                <ul className="space-y-2">
                  {d.history.filter((h) => h.action !== "student_view").map((h, i) => (
                    <li key={i}><span className="text-white/50">{fmtDate(h.ts)}</span> · <span className="font-mono text-xs">{h.action.replace("student_", "")}</span> · {h.details}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ------------------------------------------------------------ list

export default function StudentsSection({ onSessionLost }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [group, setGroup] = useState("all");
  const [endingSoon, setEndingSoon] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [showOrphans, setShowOrphans] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await consoleApi("studentsList")); setError(null); }
    catch (e) { if (e.isSessionError) onSessionLost(e); else setError(e); }
    finally { setLoading(false); }
  }, [onSessionLost]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.rows
      .filter((r) => showStaff || (r.role !== "admin" && !["approved", "pending"].includes(r.teacher_status)))
      .filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.email.toLowerCase().includes(needle))
      .filter((r) => {
        const k = kindOf(r.sub);
        if (kind === "all") return true;
        if (kind === "paying") return k === "paid" || k === "ending";
        return k === kind;
      })
      .filter((r) => group === "all" || (group === "none" ? !r.group : r.group?.code === group))
      .filter((r) => {
        if (!endingSoon) return true;
        const dl = daysLeft(r.sub?.expires_at);
        return r.sub?.kind === "trial" && dl !== null && dl >= 0 && dl <= 2;
      })
      .sort((a, b) => String(b.last_active_at || "").localeCompare(String(a.last_active_at || "")));
  }, [data, q, kind, group, endingSoon, showStaff]);

  if (!data) {
    return <div className="flex h-64 items-center justify-center">{error ? <p className="text-sm text-rose-300">{errorText(error)}</p> : <Loader2 className="h-6 w-6 animate-spin text-violet-300" />}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Students</h2>
          <p className="text-xs text-white/50">{rows.length} shown of {data.rows.length} accounts</p>
        </div>
        <button onClick={load} disabled={loading} className="flex h-9 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm hover:bg-white/5 select-none disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-[#11122A] p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="h-10 w-full rounded-xl border border-white/10 bg-black/30 pl-9 pr-9 text-sm text-white outline-none focus:border-violet-400" />
          {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" aria-label="Clear"><X className="h-4 w-4" /></button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded-lg px-2.5 py-1 text-xs select-none ${kind === k ? "bg-violet-600 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>{l}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="h-8 rounded-lg border border-white/10 bg-black/30 px-2 text-xs text-white">
            <option value="all">All groups</option>
            <option value="none">No group</option>
            {data.groups.map((g) => <option key={g.code} value={g.code}>{g.label} · {g.teacher_name}</option>)}
          </select>
          <label className="flex items-center gap-1.5 select-none"><input type="checkbox" checked={endingSoon} onChange={(e) => setEndingSoon(e.target.checked)} className="accent-violet-500" /> Trial ends ≤ 48 h</label>
          <label className="flex items-center gap-1.5 select-none"><input type="checkbox" checked={showStaff} onChange={(e) => setShowStaff(e.target.checked)} className="accent-violet-500" /> Include teachers & admins</label>
        </div>
      </div>

      {/* desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-[#11122A] md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-white/40">
            <tr><th className="px-4 py-2">Student</th><th className="px-2 py-2">Plan</th><th className="px-2 py-2">Ends</th><th className="px-2 py-2">Group</th><th className="px-2 py-2">Level</th><th className="px-2 py-2">Active</th><th className="px-2 py-2">Paid by</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id} onClick={() => setOpenId(r.user_id)} className="cursor-pointer border-t border-white/5 hover:bg-white/5">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <PlanDot plan={dotPlan(r.sub)} />
                    <div className="min-w-0"><p className="truncate font-medium">{r.name}</p><p className="truncate text-xs text-white/40">{r.email}</p></div>
                  </div>
                </td>
                <td className="px-2 py-2.5"><div className="flex items-center gap-1.5"><span className="text-white/80">{r.sub?.plan?.replace(" Plan", "") || "—"}</span><KindBadge kind={kindOf(r.sub)} /></div></td>
                <td className="whitespace-nowrap px-2 py-2.5 text-white/70">{r.sub?.expires_at ? fmtDate(r.sub.expires_at) : "—"}</td>
                <td className="max-w-[160px] truncate px-2 py-2.5 text-white/70">{r.group ? r.group.label : "—"}</td>
                <td className="px-2 py-2.5 text-white/70">{r.level || "—"}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-white/50">{ago(r.last_active_at)}</td>
                <td className="px-2 py-2.5 text-white/50">{METHOD[r.method] || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-white/40">No one matches.</p>}
      </div>

      {/* mobile cards */}
      <ul className="space-y-2 md:hidden">
        {rows.map((r) => (
          <li key={r.user_id}>
            <button onClick={() => setOpenId(r.user_id)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#11122A] p-3 text-left select-none">
              <PlanDot plan={dotPlan(r.sub)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="truncate text-xs text-white/40">{r.group ? r.group.label : "No group"} · {ago(r.last_active_at)}</p>
              </div>
              <KindBadge kind={kindOf(r.sub)} />
            </button>
          </li>
        ))}
        {rows.length === 0 && <p className="py-8 text-center text-sm text-white/40">No one matches.</p>}
      </ul>

      {data.orphans.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#11122A]">
          <button onClick={() => setShowOrphans(!showOrphans)} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-white/70 select-none">
            {showOrphans ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {data.orphans.length} subscription row(s) with no matching account
          </button>
          {showOrphans && (
            <ul className="border-t border-white/10 px-4 py-2 text-sm">
              {data.orphans.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-1.5"><span>{o.name || o.email || "(no email)"} <span className="text-white/40">{o.email}</span></span><span className="flex items-center gap-2 text-xs text-white/50">{o.plan} <KindBadge kind={o.kind} /></span></li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Drawer userId={openId} onClose={() => setOpenId(null)} onChanged={load} onSessionLost={onSessionLost} />
    </div>
  );
}
