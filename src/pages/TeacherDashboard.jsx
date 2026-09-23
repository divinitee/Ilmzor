import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen, LogOut, Users, RefreshCw, Plus, Copy, ChevronDown, UserMinus, AlertTriangle,
  Sparkles, Activity, ClipboardList, CheckCircle2, Clock, FileText, LayoutDashboard, Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { resolveUserNameOrEmail } from "@/lib/profileName";
import { SUB_KIND_META } from "@/lib/subscription";
import { teacherApi } from "@/lib/serverApi";
import BetaBadge from "@/components/BetaBadge";
import ActivityReport from "@/components/ActivityReport";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Teacher Panel (rebuilt 2026-09-23, phase 1).
//
// Everything on this page reads and writes through teacherApi
// (base44/functions/teacherApi), which scopes every query to the calling
// teacher server-side. Nothing here talks to StudentSubscription /
// TeacherReferral / HomeworkAssignment directly any more.
//
// Removed on purpose (see claude/virora-teacher-panel-audit.md):
//   Approvals: dead manual-payment flow that let a teacher grant paid access
//   Chat: students had no chat UI, messages went nowhere
//   Results: legacy unit quizzes the teacher could never read
//   AI Co-Plan: its agent was never configured; returns when it's real

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LEVEL_OPTIONS = ["Starter", "A1", "A2", "B1", "B2", "C1"];
const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "classes", label: "Classes", icon: Users },
  { id: "students", label: "Students", icon: Users },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "materials", label: "Materials", icon: FileText },
];

const ACTIVITY_STYLES = {
  active: { label: "Active", cls: "bg-emerald-500/10 text-emerald-600" },
  new: { label: "New", cls: "bg-muted text-muted-foreground" },
  inactive: { label: "Inactive 14d+", cls: "bg-amber-500/10 text-amber-600" },
};
const HW_STYLES = {
  completed: { label: "Completed", cls: "bg-emerald-500/10 text-emerald-600" },
  overdue: { label: "Overdue", cls: "bg-amber-500/10 text-amber-600" },
  assigned: { label: "Assigned", cls: "bg-muted text-muted-foreground" },
};
const GROUP_STATUS_STYLES = {
  running: "bg-emerald-500/10 text-emerald-600",
  paused: "bg-amber-500/10 text-amber-600",
  ended: "bg-muted text-muted-foreground",
};

function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
const formatDayPattern = (days) => (days?.length ? days.map((d) => d.slice(0, 2)).join(" ") : "");
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function timeAgo(iso) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function Pill({ cls, children }) {
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{children}</span>;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === searchParams.get("tab")) ? searchParams.get("tab") : "overview";
  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === "overview") next.delete("tab"); else next.set("tab", id);
    setSearchParams(next, { replace: true });
  };

  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [access, setAccess] = useState("loading"); // loading | approved | pending | rejected | none | error
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [activityStudent, setActivityStudent] = useState(null);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 2500); };

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      const res = await teacherApi("overview");
      if (res?.access !== "approved") {
        setAccess(res?.access || "none");
        if (!["pending", "rejected"].includes(res?.access) && me.role !== "admin") navigate("/");
        return;
      }
      setData(res);
      setAccess("approved");
    } catch (e) {
      console.error("teacher overview failed", e);
      setAccess((prev) => (prev === "approved" ? prev : "error"));
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Per-student homework tallies, derived from the assignment recipients.
  const hwByStudent = useMemo(() => {
    const map = {};
    for (const a of data?.assignments || []) {
      if (a.status !== "active") continue;
      for (const r of a.recipients) {
        const m = (map[r.email] ||= { total: 0, completed: 0, overdue: 0 });
        m.total += 1;
        if (r.status === "completed") m.completed += 1;
        if (r.status === "overdue") m.overdue += 1;
      }
    }
    return map;
  }, [data]);

  if (access === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const header = (
    <header className="bg-background border-b border-border px-4 pb-3 flex items-center justify-between safe-header sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary select-none" />
        <span className="font-bold text-foreground">Teacher Panel</span>
        <BetaBadge className="ml-1" />
      </div>
      <div className="flex items-center gap-1">
        {access === "approved" && (
          <button onClick={() => load(true)} className="text-muted-foreground hover:text-foreground transition-colors p-1.5" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        )}
        <button onClick={() => base44.auth.logout("/login")} className="text-muted-foreground hover:text-foreground transition-colors p-1.5" aria-label="Log out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );

  if (access !== "approved") {
    const copy = {
      pending: ["Your teacher application is being reviewed", "We'll switch on your Teacher Panel as soon as it's approved. Nothing to do until then."],
      rejected: ["Your teacher application wasn't approved", user?.teacher_status_note || "Contact us if you think this is a mistake."],
      error: ["Couldn't load your Teacher Panel", "Check your connection and try again."],
    }[access] || ["Teacher access required", ""];
    return (
      <div className="min-h-screen bg-muted/40 flex flex-col">
        {header}
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
          <h1 className="text-xl font-bold text-foreground">{copy[0]}</h1>
          <p className="text-sm text-muted-foreground">{copy[1]}</p>
          {access === "error" && <Button onClick={() => load()} className="mt-2">Try again</Button>}
        </div>
      </div>
    );
  }

  const groups = data.groups || [];
  const students = data.students || [];
  const activeStudents = students.filter((s) => s.roster_status === "active");
  const activeAssignments = (data.assignments || []).filter((a) => a.status === "active");
  const attention = activeStudents
    .map((s) => ({ ...s, overdue: hwByStudent[s.email]?.overdue || 0 }))
    .filter((s) => s.overdue > 0 || s.activity === "inactive");

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col">
      {header}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          {/* Tabs */}
          <nav className="grid grid-cols-5 gap-1 bg-muted p-1 rounded-xl" aria-label="Teacher Panel sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={`py-2 rounded-lg text-[11px] font-semibold transition-all select-none px-1 ${tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {notice && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-700 dark:text-emerald-400 font-medium">{notice}</div>
          )}

          {tab === "overview" && (
            <OverviewTab
              user={user}
              groups={groups}
              activeStudents={activeStudents}
              activeAssignments={activeAssignments}
              attention={attention}
              recent={data.recent_completions || []}
              onNavigate={setTab}
              onAssign={() => navigate("/teacher/skill-hub")}
            />
          )}
          {tab === "classes" && (
            <ClassesTab groups={groups} students={students} onChanged={() => load(true)} flash={flash} onActivity={setActivityStudent} />
          )}
          {tab === "students" && (
            <StudentsTab groups={groups} students={students} hwByStudent={hwByStudent} onActivity={setActivityStudent} />
          )}
          {tab === "assignments" && (
            <AssignmentsTab assignments={data.assignments || []} onAssign={() => navigate("/teacher/skill-hub")} onChanged={() => load(true)} flash={flash} />
          )}
          {tab === "materials" && <MaterialsTab onOpen={() => navigate("/teacher/materials")} />}
        </div>
      </div>

      <StudentActivityDialog student={activityStudent} onClose={() => setActivityStudent(null)} />
    </div>
  );
}

/* ------------------------------------------------------------ Overview */

function OverviewTab({ user, groups, activeStudents, activeAssignments, attention, recent, onNavigate, onAssign }) {
  const runningGroups = groups.filter((g) => g.group_status === "running").length;
  const stats = [
    { label: "Classes", value: runningGroups, icon: Users, tab: "classes" },
    { label: "Students", value: activeStudents.length, icon: Users, tab: "students" },
    { label: "Active homework", value: activeAssignments.length, icon: ClipboardList, tab: "assignments" },
    { label: "Need attention", value: attention.length, icon: AlertTriangle, tab: "students", warn: attention.length > 0 },
  ];
  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent rounded-2xl border border-primary/20 p-5">
        <p className="text-xs text-muted-foreground">{greetingWord()},</p>
        <h1 className="text-xl font-bold text-foreground">{resolveUserNameOrEmail(user)?.split(" ")[0] || "Teacher"}</h1>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Button onClick={onAssign} className="h-11 gap-2" disabled={groups.length === 0}>
            <Sparkles className="w-4 h-4" /> Assign homework
          </Button>
          <Button onClick={() => onNavigate("classes")} variant="outline" className="h-11 gap-2">
            <Plus className="w-4 h-4" /> New class
          </Button>
        </div>
        {groups.length === 0 && (
          <p className="text-xs text-muted-foreground mt-3">Start by creating a class. Each class gets a code your students enter to join.</p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map((s) => (
          <button key={s.label} onClick={() => onNavigate(s.tab)} className="bg-background rounded-xl p-3 border border-border text-left hover:border-primary/40 transition-colors">
            <s.icon className={`w-4 h-4 mb-1 ${s.warn ? "text-amber-500" : "text-primary"}`} />
            <p className={`text-lg font-bold ${s.warn ? "text-amber-600" : "text-foreground"}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      <Section title="Needs attention" empty={attention.length === 0 ? "Nobody is behind. Overdue homework and students inactive for 14+ days show up here." : null}>
        {attention.slice(0, 8).map((s) => (
          <Row key={s.email} title={s.name} sub={s.group_label || s.group_code}>
            {s.overdue > 0 && <Pill cls={HW_STYLES.overdue.cls}>{s.overdue} overdue</Pill>}
            {s.activity === "inactive" && <Pill cls={ACTIVITY_STYLES.inactive.cls}>Inactive 14d+</Pill>}
          </Row>
        ))}
      </Section>

      <Section title="Recently completed" empty={recent.length === 0 ? "Completed homework will appear here as students finish it." : null}>
        {recent.slice(0, 8).map((r) => (
          <Row key={`${r.assignment_id}-${r.student_email}`} title={r.student_name} sub={`${r.assignment_title} · ${timeAgo(r.completed_at)}`}>
            {r.best_score_pct != null && <span className="text-sm font-bold text-emerald-600 tabular-nums">{r.best_score_pct}%</span>}
            {r.completed_late && <Pill cls={HW_STYLES.overdue.cls}>late</Pill>}
          </Row>
        ))}
      </Section>

      <Section title="Active homework" empty={activeAssignments.length === 0 ? "No homework out right now." : null}>
        {activeAssignments.slice(0, 5).map((a) => (
          <Row key={a.id} title={a.title} sub={`${a.group_label || a.group_code}${a.due_date ? ` · due ${formatDate(a.due_date)}` : ""}`}>
            <span className="text-xs text-muted-foreground tabular-nums">{a.counts.completed}/{a.counts.total} done</span>
            {a.counts.overdue > 0 && <Pill cls={HW_STYLES.overdue.cls}>{a.counts.overdue} overdue</Pill>}
          </Row>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, empty, children, action }) {
  return (
    <section className="bg-background rounded-2xl border border-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        {action}
      </div>
      {empty ? <p className="px-5 py-6 text-sm text-muted-foreground text-center">{empty}</p> : children}
    </section>
  );
}

function Row({ title, sub, children, onClick }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={`w-full flex items-center justify-between gap-3 px-5 py-3 border-b border-border last:border-0 text-left ${onClick ? "hover:bg-muted/30 transition-colors" : ""}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">{children}</div>
    </Comp>
  );
}

/* ------------------------------------------------------------ Classes */

function ClassesTab({ groups, students, onChanged, flash, onActivity }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (fields, groupId) => {
    setSaving(true);
    setError("");
    try {
      if (groupId) await teacherApi("updateGroup", { group_id: groupId, ...fields });
      else await teacherApi("createGroup", fields);
      setCreating(false);
      setEditingId(null);
      flash(groupId ? "Class updated." : "Class created. Share its code with your students.");
      await onChanged();
    } catch (e) {
      setError(e?.message || "Couldn't save the class.");
    } finally {
      setSaving(false);
    }
  };

  const setRoster = async (student, removed) => {
    try {
      await teacherApi("setRoster", { subscription_id: student.subscription_id, removed });
      flash(removed ? `${student.name} removed from the class.` : `${student.name} restored.`);
      await onChanged();
    } catch (e) {
      flash(e?.message || "Couldn't update the roster.");
    }
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    flash(`Code copied: ${code}`);
  };

  return (
    <div className="space-y-4">
      {!creating ? (
        <Button onClick={() => setCreating(true)} variant="outline" className="w-full h-11 gap-1.5">
          <Plus className="w-4 h-4" /> New class
        </Button>
      ) : (
        <GroupForm onSubmit={(f) => save(f)} onCancel={() => setCreating(false)} submitLabel="Create class" submitting={saving} />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {groups.length === 0 && !creating && (
        <p className="text-center text-sm text-muted-foreground py-6">No classes yet. Create one to get a join code.</p>
      )}
      {groups.map((g) => {
        const members = students.filter((s) => s.group_code === g.code);
        if (editingId === g.id) {
          return (
            <GroupForm key={g.id} initial={g} onSubmit={(f) => save(f, g.id)} onCancel={() => setEditingId(null)} submitLabel="Save changes" submitting={saving} />
          );
        }
        return (
          <GroupCard
            key={g.id}
            group={g}
            members={members}
            expanded={expanded === g.id}
            onToggle={() => setExpanded(expanded === g.id ? null : g.id)}
            onCopy={() => copyCode(g.code)}
            onEdit={() => setEditingId(g.id)}
            onRoster={setRoster}
            onActivity={onActivity}
          />
        );
      })}
    </div>
  );
}

function GroupForm({ initial, onSubmit, onCancel, submitLabel, submitting }) {
  const [label, setLabel] = useState(initial?.label || "");
  const [level, setLevel] = useState(initial?.level || "");
  const [days, setDays] = useState(initial?.days || []);
  const [startTime, setStartTime] = useState(initial?.start_time || "");
  const [endTime, setEndTime] = useState(initial?.end_time || "");
  const [groupStatus, setGroupStatus] = useState(initial?.group_status || "running");
  const toggleDay = (d) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const submit = () => {
    const fields = { label: label.trim(), level: level || null, days, start_time: startTime || null, end_time: endTime || null };
    if (initial) fields.group_status = groupStatus;
    onSubmit(fields);
  };
  return (
    <div className="bg-background rounded-2xl border border-border p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{initial ? "Edit class" : "New class"}</h3>
      <input type="text" placeholder="Class name, e.g. B2 Evening" value={label} onChange={(e) => setLabel(e.target.value)}
        className="w-full h-10 px-3 border border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors" />
      <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full h-10 px-3 border border-input rounded-xl text-sm bg-background text-foreground">
        <option value="">Level (optional)</option>
        {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Days</p>
        <div className="flex flex-wrap gap-1.5">
          {DAY_OPTIONS.map((d) => (
            <button key={d} type="button" onClick={() => toggleDay(d)}
              className={`w-10 h-9 rounded-lg text-xs font-bold select-none transition-colors ${days.includes(d) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
              {d.slice(0, 2)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} aria-label="Start time"
          className="flex-1 h-10 px-3 border border-input rounded-xl text-sm bg-background text-foreground" />
        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label="End time"
          className="flex-1 h-10 px-3 border border-input rounded-xl text-sm bg-background text-foreground" />
      </div>
      {initial && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Status</p>
          <div className="grid grid-cols-3 gap-1.5">
            {["running", "paused", "ended"].map((st) => (
              <button key={st} type="button" onClick={() => setGroupStatus(st)}
                className={`h-9 rounded-lg text-xs font-semibold select-none capitalize transition-colors ${groupStatus === st ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
                {st}
              </button>
            ))}
          </div>
          {groupStatus === "ended" && <p className="text-[11px] text-muted-foreground mt-1.5">Ended classes stop accepting new students and new homework.</p>}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button onClick={submit} disabled={submitting} className="flex-1 h-10">{submitting ? "Saving..." : submitLabel}</Button>
        {onCancel && <Button variant="outline" onClick={onCancel} className="h-10">Cancel</Button>}
      </div>
    </div>
  );
}

function GroupCard({ group, members, expanded, onToggle, onCopy, onEdit, onRoster, onActivity }) {
  const active = members.filter((s) => s.roster_status === "active");
  const removed = members.filter((s) => s.roster_status === "removed");
  const [showRemoved, setShowRemoved] = useState(false);
  const inactive = active.filter((s) => s.activity === "inactive").length;
  return (
    <div className="bg-background rounded-2xl border border-border overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Users className="w-5 h-5 text-primary" /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-foreground truncate">{group.label || "Untitled class"}</p>
              {group.level && <Pill cls="text-primary bg-primary/10">{group.level}</Pill>}
              <Pill cls={`capitalize ${GROUP_STATUS_STYLES[group.group_status] || ""}`}>{group.group_status}</Pill>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {group.days?.length ? formatDayPattern(group.days) : "No schedule set"}
              {group.start_time && ` · ${group.start_time}${group.end_time ? `–${group.end_time}` : ""}`}
              {` · ${active.length} student${active.length !== 1 ? "s" : ""}`}
              {inactive > 0 && <span className="text-amber-600 font-semibold">{` · ${inactive} inactive`}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden sm:inline font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">{group.code}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-border px-5 py-2.5 flex items-center justify-between gap-2 bg-muted/20">
              <button onClick={onCopy} className="text-xs font-mono font-bold text-primary flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5" /> Join code {group.code}
              </button>
              <button onClick={onEdit} className="text-xs font-medium text-muted-foreground hover:text-foreground">Edit class</button>
            </div>
            {active.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">No students yet. They join by entering <span className="font-mono font-bold">{group.code}</span> at sign-up or in their profile.</p>
            ) : active.map((s) => (
              <div key={s.subscription_id} className="flex items-center justify-between px-5 py-3 border-t border-border gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Pill cls={ACTIVITY_STYLES[s.activity]?.cls}>{ACTIVITY_STYLES[s.activity]?.label}</Pill>
                  <Button variant="outline" size="sm" onClick={() => onActivity({ email: s.email, name: s.name })} className="h-7 gap-1 text-xs">
                    <Activity className="w-3.5 h-3.5" /> Activity
                  </Button>
                  <button onClick={() => onRoster(s, true)} title="Remove from class" aria-label={`Remove ${s.name} from class`}
                    className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {removed.length > 0 && (
              <div className="border-t border-border px-5 py-2.5">
                <button onClick={() => setShowRemoved((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground">
                  {showRemoved ? "Hide" : "Show"} {removed.length} removed
                </button>
                {showRemoved && removed.map((s) => (
                  <div key={s.subscription_id} className="flex items-center justify-between py-2">
                    <p className="text-xs text-muted-foreground">{s.name}</p>
                    <button onClick={() => onRoster(s, false)} className="text-xs text-primary font-medium">Restore</button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------ Students */

function StudentsTab({ groups, students, hwByStudent, onActivity }) {
  const [groupFilter, setGroupFilter] = useState("all");
  const rows = students
    .filter((s) => s.roster_status === "active")
    .filter((s) => groupFilter === "all" || s.group_code === groupFilter);
  return (
    <div className="space-y-3">
      {groups.length > 1 && (
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}
          className="w-full h-10 px-3 border border-input rounded-xl text-sm bg-background text-foreground">
          <option value="all">All classes</option>
          {groups.map((g) => <option key={g.id} value={g.code}>{g.label || g.code}</option>)}
        </select>
      )}
      <Section title={`Students (${rows.length})`} empty={rows.length === 0 ? "No students yet. Share a class code to get started." : null}>
        {rows.map((s) => {
          const hw = hwByStudent[s.email] || { total: 0, completed: 0, overdue: 0 };
          const kind = SUB_KIND_META[s.plan_kind];
          return (
            <div key={s.subscription_id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0 gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.group_label || s.group_code}
                  {` · homework ${hw.completed}/${hw.total}`}
                  {s.week_minutes > 0 && ` · ${s.week_minutes} min this week`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {hw.overdue > 0 && <Pill cls={HW_STYLES.overdue.cls}>{hw.overdue} overdue</Pill>}
                <Pill cls={ACTIVITY_STYLES[s.activity]?.cls}>{ACTIVITY_STYLES[s.activity]?.label}</Pill>
                {kind && <Pill cls={kind.cls}>{kind.label}</Pill>}
                <Button variant="outline" size="sm" onClick={() => onActivity({ email: s.email, name: s.name })} className="h-7 gap-1 text-xs">
                  <Activity className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------ Assignments */

function AssignmentsTab({ assignments, onAssign, onChanged, flash }) {
  const [expanded, setExpanded] = useState(null);
  const [showClosed, setShowClosed] = useState(false);
  const active = assignments.filter((a) => a.status === "active");
  const closed = assignments.filter((a) => a.status !== "active");

  const toggleClosed = async (a) => {
    try {
      await teacherApi("closeAssignment", { assignment_id: a.id, reopen: a.status !== "active" });
      flash(a.status === "active" ? "Homework closed. Students no longer see it." : "Homework reopened.");
      await onChanged();
    } catch (e) {
      flash(e?.message || "Couldn't update the homework.");
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={onAssign} className="w-full h-11 gap-2"><Sparkles className="w-4 h-4" /> Assign homework</Button>
      {active.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No active homework.</p>}
      {active.map((a) => (
        <AssignmentCard key={a.id} a={a} expanded={expanded === a.id} onToggle={() => setExpanded(expanded === a.id ? null : a.id)} onClose={() => toggleClosed(a)} />
      ))}
      {closed.length > 0 && (
        <div>
          <button onClick={() => setShowClosed((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground">
            {showClosed ? "Hide" : "Show"} {closed.length} closed
          </button>
          {showClosed && (
            <div className="space-y-3 mt-3">
              {closed.map((a) => (
                <AssignmentCard key={a.id} a={a} expanded={expanded === a.id} onToggle={() => setExpanded(expanded === a.id ? null : a.id)} onClose={() => toggleClosed(a)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ a, expanded, onToggle, onClose }) {
  const pct = a.counts.total ? Math.round((a.counts.completed / a.counts.total) * 100) : 0;
  return (
    <div className={`bg-background rounded-2xl border border-border overflow-hidden ${a.status !== "active" ? "opacity-70" : ""}`}>
      <button onClick={onToggle} className="w-full px-5 py-4 text-left hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {a.group_label || a.group_code}
              {a.target === "students" ? " · selected students" : ""}
              {a.skill_label ? ` · ${a.skill_label}` : ""}
              {a.due_date ? ` · due ${formatDate(a.due_date)}` : " · no due date"}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 mt-0.5 ${expanded ? "rotate-180" : ""}`} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{a.counts.completed}/{a.counts.total}</span>
          {a.counts.overdue > 0 && <span className="text-xs text-amber-600 tabular-nums flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{a.counts.overdue}</span>}
          {a.counts.assigned > 0 && <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{a.counts.assigned}</span>}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-border">
            {a.recipients.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">No students in this class yet.</p>
            ) : a.recipients.map((r) => (
              <div key={r.email} className="flex items-center justify-between px-5 py-2.5 border-b border-border last:border-0 gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{r.name}{!r.still_member && <span className="text-xs text-muted-foreground"> (left class)</span>}</p>
                  {r.completed_at && <p className="text-[11px] text-muted-foreground">{formatDate(r.completed_at)}{r.attempts > 1 ? ` · ${r.attempts} attempts` : ""}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {r.best_score_pct != null && <span className="text-sm font-bold text-emerald-600 tabular-nums">{r.best_score_pct}%</span>}
                  {r.completed_late && <Pill cls={HW_STYLES.overdue.cls}>late</Pill>}
                  <Pill cls={HW_STYLES[r.status].cls}>{HW_STYLES[r.status].label}</Pill>
                </div>
              </div>
            ))}
            <div className="px-5 py-2.5 bg-muted/20 flex justify-end">
              <button onClick={onClose} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                {a.status === "active" ? "Close homework" : "Reopen homework"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------ Materials */

function MaterialsTab({ onOpen }) {
  return (
    <div className="bg-background rounded-2xl border border-border p-5 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Material Library</h3>
        <BetaBadge />
      </div>
      <p className="text-sm text-muted-foreground">
        Upload or paste your own teaching material. VIRORA stores it and writes a short summary. You can't turn materials into homework or share them with students yet.
      </p>
      <Button onClick={onOpen} variant="outline" className="gap-2"><Check className="w-4 h-4" /> Open Material Library</Button>
    </div>
  );
}

/* ------------------------------------------------------------ Activity dialog */

function StudentActivityDialog({ student, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!student) return;
    let active = true;
    setLoading(true);
    teacherApi("studentActivity", { email: student.email })
      .then((res) => { if (active) setSessions(res?.sessions || []); })
      .catch((error) => { console.error("Student activity load failed:", error); if (active) setSessions([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [student?.email]);
  return (
    <Dialog open={!!student} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>{student?.name || "Student"} · Activity</DialogTitle>
          <DialogDescription>Visible, active learning time recorded in VIRORA.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-primary" /></div>
        ) : (
          <ActivityReport sessions={sessions} compact />
        )}
      </DialogContent>
    </Dialog>
  );
}
