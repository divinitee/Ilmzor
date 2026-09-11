import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen, LogOut, CheckCircle, Clock, Users, ChevronLeft, RefreshCw, Plus,
  Copy, ChevronDown, MessageCircle, UserMinus, AlertTriangle, Sparkles,
} from "lucide-react";
import ChatWindow from "@/components/ChatWindow";
import { motion, AnimatePresence } from "framer-motion";
import { resolveUserNameOrEmail } from "@/lib/profileName";
import TeacherCoPlanChat from "@/components/teacher/TeacherCoPlanChat";

const pageVariants = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { x: "-100%", opacity: 0, transition: { duration: 0.2 } },
};

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LEVEL_OPTIONS = ["Starter", "A1", "A2", "B1", "B2", "C1"];
const INACTIVITY_DAYS = 14;

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function formatDayPattern(days) {
  if (!days?.length) return "";
  return days.map((d) => d[0]).join("/");
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// StudentSubscription.status only has 3 values (inactive/pending/active) and
// "active" alone doesn't mean "paid" — the self-serve onboarding trial
// (chooseFreePlan() in lib/subscription.js) sets status:"active" the instant
// someone taps "Start Free", with no teacher/admin step at all, and a lapsed
// trial quietly rolls onto a permanent free plan that's also status:"active".
// Both used to render as "✅ Paid" here, which is exactly what looked like an
// approval nobody performed. Only a real Learner/VIP plan that isn't a trial
// actually came from someone paying (or a teacher/admin approving a payment).
function subscriptionKind(sub) {
  if (sub.status === "pending") return "pending";
  if (sub.status !== "active") return "unpaid";
  if (sub.is_trial) return "trial";
  if (!sub.plan || /free/i.test(sub.plan)) return "free";
  return "paid";
}

// "active" = played within the window · "new" = never played yet but joined
// recently (not flagged) · "inactive" = the thing the teacher actually needs
// to see — stopped showing up in Skill Hub for 14+ days, or joined 14+ days
// ago and never played at all. `removed` students are excluded before this
// ever runs (see GroupCard).
function getActivityStatus(sub, lastActiveMs) {
  if (!lastActiveMs) {
    return daysSince(sub.created_date) >= INACTIVITY_DAYS ? "inactive" : "new";
  }
  return daysSince(new Date(lastActiveMs).toISOString()) >= INACTIVITY_DAYS ? "inactive" : "active";
}

const ACTIVITY_STYLES = {
  active: { label: "Active", cls: "bg-emerald-500/10 text-emerald-600" },
  new: { label: "New", cls: "bg-muted text-muted-foreground" },
  inactive: { label: "⚠ Inactive 14d+", cls: "bg-amber-500/10 text-amber-600" },
};

const GROUP_STATUS_STYLES = {
  running: "bg-emerald-500/10 text-emerald-600",
  paused: "bg-amber-500/10 text-amber-600",
  ended: "bg-muted text-muted-foreground",
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [results, setResults] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [skillRows, setSkillRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("groups"); // "groups" | "approvals" | "coplan" | "results"
  const [savingGroup, setSavingGroup] = useState(false);
  const [creatingGroupOpen, setCreatingGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [expandedReferral, setExpandedReferral] = useState(null);
  const [showRemovedGroups, setShowRemovedGroups] = useState(new Set());
  const [chatStudent, setChatStudent] = useState(null); // { email, name }
  const pullStartY = useRef(0);
  const scrollRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      // Real (non-admin) teachers only get here once an admin has approved
      // their application (see User.teacher_status). Admins keep unrestricted
      // access, same as before. StudentSubscription's RLS now also lets an
      // approved teacher read/update rows where data.teacher_id === their own
      // id, so .list() below naturally comes back scoped to just their own
      // referred students for a non-admin teacher — no separate client-side
      // filtering needed to keep one teacher from seeing another's.
      const isApprovedTeacher = me.teacher_status === "approved";
      if (me.role !== "admin" && !isApprovedTeacher) { navigate("/"); return; }
      const [subs, res, refs, skills] = await Promise.all([
        base44.entities.StudentSubscription.list("-created_date", 200),
        base44.entities.QuizResult.list("-created_date", 100).catch(() => []),
        base44.entities.TeacherReferral.filter({ teacher_id: me.id }, "-created_date"),
        // SkillHubProgress's RLS was widened to let any approved teacher read
        // it (there's no per-row teacher_id to scope against — see
        // SkillHubProgress.jsonc), so this technically comes back with every
        // student's rows, not just this teacher's own. Only used below to
        // compute a last-active timestamp per email for THIS teacher's own
        // roster, so nothing beyond that ever reaches the UI.
        base44.entities.SkillHubProgress.list("-updated_date", 1000).catch(() => []),
      ]);
      setSubscriptions(subs);
      setResults(res);
      setReferrals(refs);
      setSkillRows(skills);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTouchStart = (e) => { pullStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = e.changedTouches[0].clientY - pullStartY.current;
    if (delta > 80 && el.scrollTop === 0 && !refreshing) {
      setRefreshing(true);
      loadData(true);
    }
  };

  const handleAccept = async (sub) => {
    const expiresAt = new Date();
    if (sub.billing_cycle === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }
    await base44.entities.StudentSubscription.update(sub.id, { status: "active", expires_at: expiresAt.toISOString().split("T")[0] });
    setNotification(`"${sub.student_name}" subscription approved!`);
    setTimeout(() => setNotification(""), 3000);
    loadData(true);
  };

  const handleApproveAllVerified = async () => {
    const verifiedPending = subscriptions.filter(s => s.status === "pending" && s.screenshot_verified);
    if (verifiedPending.length === 0) return;
    for (const sub of verifiedPending) {
      const expiresAt = new Date();
      if (sub.billing_cycle === "yearly") {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }
      await base44.entities.StudentSubscription.update(sub.id, {
        status: "active",
        expires_at: expiresAt.toISOString().split("T")[0],
      });
    }
    setNotification(`${verifiedPending.length} AI-verified subscriptions approved!`);
    setTimeout(() => setNotification(""), 3000);
    loadData(true);
  };

  const handleCreateGroup = async (fields) => {
    if (!user) return;
    setSavingGroup(true);
    try {
      const code = generateCode();
      await base44.entities.TeacherReferral.create({
        teacher_id: user.id,
        teacher_name: resolveUserNameOrEmail(user),
        teacher_email: user.email,
        code,
        label: fields.label || `Group ${referrals.length + 1}`,
        uses: 0,
        level: fields.level || undefined,
        days: fields.days,
        start_time: fields.start_time || undefined,
        end_time: fields.end_time || undefined,
        group_status: fields.group_status || "running",
      });
      setCreatingGroupOpen(false);
      setNotification("Group created!");
      setTimeout(() => setNotification(""), 2000);
      loadData(true);
    } finally {
      setSavingGroup(false);
    }
  };

  const handleUpdateGroup = async (fields) => {
    if (!editingGroup) return;
    setSavingGroup(true);
    try {
      await base44.entities.TeacherReferral.update(editingGroup.id, {
        label: fields.label || editingGroup.label,
        level: fields.level || null,
        days: fields.days,
        start_time: fields.start_time || null,
        end_time: fields.end_time || null,
        group_status: fields.group_status || "running",
      });
      setEditingGroup(null);
      loadData(true);
    } finally {
      setSavingGroup(false);
    }
  };

  // "Both" — a teacher can manually pull a student off their roster once
  // they've stopped attending live lessons, on top of the automatic 14-day
  // inactivity flag computed below. Either way this never touches `status`
  // (payment/access) — the student keeps their app account and subscription
  // exactly as before, they just stop showing up on this teacher's roster.
  const handleRemoveStudent = async (sub, restore = false) => {
    const roster_status = restore ? "active" : "removed";
    await base44.entities.StudentSubscription.update(sub.id, { roster_status });
    setSubscriptions((prev) => prev.map((s) => (s.id === sub.id ? { ...s, roster_status } : s)));
  };

  const toggleShowRemoved = (groupId) => {
    setShowRemovedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setNotification(`Code copied: ${code}`);
    setTimeout(() => setNotification(""), 2000);
  };

  // Latest SkillHubProgress activity per student email, across all 5 skills.
  const lastActiveMap = useMemo(() => {
    const map = {};
    skillRows.forEach((r) => {
      const t = r.updated_date ? new Date(r.updated_date).getTime() : 0;
      if (!t) return;
      if (!map[r.user_email] || t > map[r.user_email]) map[r.user_email] = t;
    });
    return map;
  }, [skillRows]);

  const openChat = (sub) => setChatStudent({ email: sub.phone, name: sub.student_name, roomId: `chat:${sub.phone}` });

  const StatusBadge = ({ sub }) => {
    if (sub.status === "active") return <span className="text-xs font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full">✅ Paid</span>;
    if (sub.status === "pending") return <span className="text-xs font-semibold text-amber-700 bg-amber-500/10 px-2 py-1 rounded-full">⏳ Pending</span>;
    return <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-1 rounded-full">❌ Unpaid</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totalCount = subscriptions.filter(s => s.roster_status !== "removed").length;
  const activeCount = subscriptions.filter(s => s.status === "active").length;
  const pendingCount = subscriptions.filter(s => s.status === "pending").length;
  const verifiedPendingCount = subscriptions.filter(s => s.status === "pending" && s.screenshot_verified).length;
  const attentionCount = subscriptions.filter(
    s => s.roster_status !== "removed" && getActivityStatus(s, lastActiveMap[s.phone]) === "inactive"
  ).length;
  const activeGroupsCount = referrals.filter(r => (r.group_status || "running") === "running").length;

  const ungrouped = subscriptions.filter(s => s.roster_status !== "removed" && (!s.referral_code || !referrals.some(r => r.code === s.referral_code)));
  const pendingAll = subscriptions.filter(s => s.status === "pending");

  return (
    <motion.div className="min-h-screen bg-muted/40 flex flex-col" variants={pageVariants} initial="initial" animate="animate">
      {/* Header */}
      <header className="bg-background border-b border-border px-4 pb-3 flex items-center justify-between safe-header sticky top-0 z-30">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground p-1 select-none">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <BookOpen className="w-5 h-5 text-primary select-none" />
          <span className="font-bold text-foreground">Teacher Panel</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full select-none">Teacher</span>
          <button onClick={() => base44.auth.logout("/login")} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 select-none">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {refreshing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 40, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center overflow-hidden">
            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollRef} className="flex-1 overflow-y-auto" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

          {/* Hero */}
          <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent rounded-2xl border border-primary/20 p-5">
            <p className="text-xs text-muted-foreground">{greetingWord()},</p>
            <h1 className="text-xl font-bold text-foreground">{resolveUserNameOrEmail(user)?.split(" ")[0] || "Teacher"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeGroupsCount} active group{activeGroupsCount !== 1 ? "s" : ""} · {totalCount} student{totalCount !== 1 ? "s" : ""}
              {attentionCount > 0 && <> · <span className="text-amber-600 font-semibold">{attentionCount} need attention</span></>}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-background rounded-xl p-3 border border-border text-center">
              <Users className="w-4 h-4 text-primary mx-auto mb-1 select-none" />
              <p className="text-lg font-bold text-foreground">{totalCount}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="bg-background rounded-xl p-3 border border-border text-center">
              <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mb-1 select-none" />
              <p className="text-lg font-bold text-emerald-600">{activeCount}</p>
              <p className="text-[10px] text-muted-foreground">Paid</p>
            </div>
            <div className="bg-background rounded-xl p-3 border border-border text-center">
              <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1 select-none" />
              <p className="text-lg font-bold text-amber-600">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </div>
            <div className="bg-background rounded-xl p-3 border border-border text-center">
              <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto mb-1 select-none" />
              <p className="text-lg font-bold text-amber-600">{attentionCount}</p>
              <p className="text-[10px] text-muted-foreground">Attention</p>
            </div>
          </div>

          {notification && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              {notification}
            </div>
          )}

          {/* Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-muted p-1 rounded-xl">
            {[
              { id: "groups", label: "Groups" },
              { id: "approvals", label: `Approvals${pendingCount ? ` (${pendingCount})` : ""}` },
              { id: "coplan", label: "AI Co-Plan" },
              { id: "results", label: "Results" },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`py-2 rounded-lg text-[11px] font-semibold transition-all select-none px-1 ${activeTab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* GROUPS TAB */}
          {activeTab === "groups" && (
            <div className="space-y-4">
              {!creatingGroupOpen ? (
                <Button onClick={() => setCreatingGroupOpen(true)} variant="outline" className="w-full h-11 gap-1.5 select-none">
                  <Plus className="w-4 h-4" /> New group
                </Button>
              ) : (
                <GroupForm
                  onSubmit={handleCreateGroup}
                  onCancel={() => setCreatingGroupOpen(false)}
                  submitLabel="Create group"
                  submitting={savingGroup}
                />
              )}

              {referrals.length === 0 && !creatingGroupOpen && (
                <p className="text-center text-sm text-muted-foreground py-6">No groups yet — create one to start building a roster.</p>
              )}

              {referrals.map(ref => {
                const groupStudents = subscriptions.filter(s => s.referral_code === ref.code);
                if (editingGroup?.id === ref.id) {
                  return (
                    <div key={ref.id} className="bg-background rounded-2xl border border-border p-5">
                      <GroupForm
                        initial={editingGroup}
                        onSubmit={handleUpdateGroup}
                        onCancel={() => setEditingGroup(null)}
                        submitLabel="Save changes"
                        submitting={savingGroup}
                      />
                    </div>
                  );
                }
                return (
                  <GroupCard
                    key={ref.id}
                    group={ref}
                    students={groupStudents}
                    lastActiveMap={lastActiveMap}
                    expanded={expandedReferral === ref.id}
                    onToggle={() => setExpandedReferral(expandedReferral === ref.id ? null : ref.id)}
                    onCopyCode={copyCode}
                    onRemoveStudent={handleRemoveStudent}
                    onOpenChat={openChat}
                    onAccept={handleAccept}
                    onEditGroup={() => setEditingGroup(ref)}
                    showRemoved={showRemovedGroups.has(ref.id)}
                    onToggleShowRemoved={() => toggleShowRemoved(ref.id)}
                    StatusBadge={StatusBadge}
                  />
                );
              })}

              {ungrouped.length > 0 && (
                <div className="bg-background rounded-2xl border border-border overflow-hidden">
                  <div className="px-5 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold text-muted-foreground">Students without a group</h3>
                  </div>
                  {ungrouped.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{sub.student_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{sub.phone}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge sub={sub} />
                        {sub.status === "pending" && (
                          <Button size="sm" onClick={() => handleAccept(sub)} className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7 select-none">
                            Approve
                          </Button>
                        )}
                        <button onClick={() => openChat(sub)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors select-none">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* APPROVALS TAB */}
          {activeTab === "approvals" && (
            <div className="space-y-4">
              {verifiedPendingCount > 0 && (
                <Button onClick={handleApproveAllVerified} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 select-none">
                  ✅ Approve {verifiedPendingCount} AI-verified
                </Button>
              )}
              {pendingAll.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">No pending subscriptions</p>
              ) : (
                <div className="bg-background rounded-2xl border border-border overflow-hidden">
                  {pendingAll.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{sub.student_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{sub.phone}</p>
                        {sub.referral_code && <p className="text-xs text-primary font-mono mt-0.5">{sub.referral_code}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {sub.screenshot_verified && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-500/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">🤖 AI Verified</span>
                        )}
                        <span className="text-xs text-muted-foreground font-mono">{sub.payment_ref || "—"}</span>
                        <Button size="sm" onClick={() => handleAccept(sub)} className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8 select-none">
                          Approve
                        </Button>
                        <button onClick={() => openChat(sub)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors select-none">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI CO-PLAN TAB */}
          {activeTab === "coplan" && <TeacherCoPlanChat user={user} />}

          {/* RESULTS TAB */}
          {activeTab === "results" && (
            <div className="bg-background rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Test Results</h3>
              </div>
              {results.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground text-center">No results found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Student</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Unit</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Score</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(r => (
                        <tr key={r.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{r.student_name}</p>
                            <p className="text-xs text-muted-foreground">{r.student_phone}</p>
                          </td>
                          <td className="px-4 py-3 text-foreground">{r.unit_name}</td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-emerald-600">{r.score}</span>
                            <span className="text-muted-foreground"> / {r.total_questions || 30}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{r.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Chat overlay */}
      <AnimatePresence>
        {chatStudent && user && (
          <ChatWindow
            user={user}
            roomId={chatStudent.roomId}
            partnerName={chatStudent.name}
            onClose={() => setChatStudent(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Reusable create/edit form for a group (TeacherReferral row). `initial`
// present = edit mode (prefilled, shows the running/paused/ended status
// picker); absent = create mode (always starts "running").
function GroupForm({ initial, onSubmit, onCancel, submitLabel, submitting }) {
  const [label, setLabel] = useState(initial?.label || "");
  const [level, setLevel] = useState(initial?.level || "");
  const [days, setDays] = useState(initial?.days || []);
  const [startTime, setStartTime] = useState(initial?.start_time || "");
  const [endTime, setEndTime] = useState(initial?.end_time || "");
  const [groupStatus, setGroupStatus] = useState(initial?.group_status || "running");

  const toggleDay = (d) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const submit = () => {
    onSubmit({ label: label.trim(), level: level || null, days, start_time: startTime || null, end_time: endTime || null, group_status: groupStatus });
    if (!initial) { setLabel(""); setLevel(""); setDays([]); setStartTime(""); setEndTime(""); setGroupStatus("running"); }
  };

  return (
    <div className="bg-background rounded-2xl border border-border p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{initial ? "Edit group" : "New group"}</h3>
      <input
        type="text"
        placeholder="Group title, e.g. B2 Evening"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="w-full h-10 px-3 border border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
      />
      <select
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        className="w-full h-10 px-3 border border-input rounded-xl text-sm bg-background text-foreground"
      >
        <option value="">Level (optional)</option>
        {LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Days</p>
        <div className="flex flex-wrap gap-1.5">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              className={`w-9 h-9 rounded-lg text-xs font-bold select-none transition-colors ${
                days.includes(d) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {d[0]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
          className="flex-1 h-10 px-3 border border-input rounded-xl text-sm bg-background text-foreground" />
        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
          className="flex-1 h-10 px-3 border border-input rounded-xl text-sm bg-background text-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Status</p>
        <div className="grid grid-cols-3 gap-1.5">
          {["running", "paused", "ended"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setGroupStatus(s)}
              className={`h-9 rounded-lg text-xs font-semibold select-none capitalize transition-colors ${
                groupStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button onClick={submit} disabled={submitting} className="flex-1 h-10 select-none">{submitLabel}</Button>
        {onCancel && <Button variant="outline" onClick={onCancel} className="h-10 select-none">Cancel</Button>}
      </div>
    </div>
  );
}

// CRM-inspired group card: title/level/status at a glance, day-pattern +
// time, student count, expands into the group's roster with per-student
// activity state and a manual remove/restore control.
function GroupCard({
  group, students, lastActiveMap, expanded, onToggle, onCopyCode, onRemoveStudent,
  onOpenChat, onAccept, onEditGroup, showRemoved, onToggleShowRemoved, StatusBadge,
}) {
  const activeStudents = students.filter((s) => s.roster_status !== "removed");
  const removedStudents = students.filter((s) => s.roster_status === "removed");
  const attentionCount = activeStudents.filter((s) => getActivityStatus(s, lastActiveMap[s.phone]) === "inactive").length;
  const status = group.group_status || "running";

  return (
    <div className="bg-background rounded-2xl border border-border overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors select-none text-left gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-foreground truncate">{group.label || "Untitled group"}</p>
              {group.level && <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{group.level}</span>}
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${GROUP_STATUS_STYLES[status]}`}>{status}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {group.days?.length ? formatDayPattern(group.days) : "No schedule set"}
              {group.start_time && ` · ${group.start_time}${group.end_time ? "–" + group.end_time : ""}`}
              {" · "}{activeStudents.length} student{activeStudents.length !== 1 ? "s" : ""}
              {attentionCount > 0 && <span className="text-amber-600 font-semibold"> · {attentionCount} need attention</span>}
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
              <button onClick={() => onCopyCode(group.code)} className="text-xs font-mono font-bold text-primary flex items-center gap-1.5 select-none">
                <Copy className="w-3.5 h-3.5" /> {group.code}
              </button>
              <button onClick={onEditGroup} className="text-xs font-medium text-muted-foreground hover:text-foreground select-none">Edit schedule</button>
            </div>
            {activeStudents.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">No students yet</p>
            ) : activeStudents.map((sub) => {
              const st = getActivityStatus(sub, lastActiveMap[sub.phone]);
              const styleInfo = ACTIVITY_STYLES[st];
              return (
                <div key={sub.id} className="flex items-center justify-between px-5 py-3 border-t border-border gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{sub.student_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{sub.phone}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <StatusBadge sub={sub} />
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${styleInfo.cls}`}>{styleInfo.label}</span>
                    {sub.status === "pending" && (
                      <Button size="sm" onClick={() => onAccept(sub)} className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7 select-none">
                        Approve
                      </Button>
                    )}
                    <button onClick={() => onOpenChat(sub)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors select-none">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => onRemoveStudent(sub)} title="Remove from roster" className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors select-none">
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {removedStudents.length > 0 && (
              <div className="border-t border-border px-5 py-2.5">
                <button onClick={onToggleShowRemoved} className="text-xs text-muted-foreground hover:text-foreground select-none">
                  {showRemoved ? "Hide" : "Show"} {removedStudents.length} removed
                </button>
                {showRemoved && removedStudents.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between py-2">
                    <p className="text-xs text-muted-foreground">{sub.student_name}</p>
                    <button onClick={() => onRemoveStudent(sub, true)} className="text-xs text-primary font-medium select-none">Restore</button>
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
