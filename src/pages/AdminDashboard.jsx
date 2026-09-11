import React, { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { resolveUserName } from "@/lib/profileName";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

import { useAuth } from "@/lib/AuthContext";
import {
  ArrowLeft, Users, CreditCard, CheckCircle2, Clock, Search, Shield,
  Loader2, Crown, GraduationCap, BookOpen, Gift, AlertTriangle,
} from "lucide-react";
import {
  subscriptionKind, SUB_KIND_META, isPaying,
  approveSubscription, pauseSubscription, resumeSubscription,
  cancelSubscription, reactivateSubscription,
} from "@/lib/subscription";
import {
  USER_DATA_ENTITIES, PROFILE_RESET_PATCH, guardReset, guardDelete,
  resetUser, deleteUserAccount,
} from "@/lib/userWipe";
import AdminPinGate from "@/components/admin/AdminPinGate";
import { isUnlockedThisSession } from "@/lib/adminPin";

const STR = {
  uz: {
    title: "Admin Panel", sub: "Foydalanuvchilar va obunalarni boshqarish",
    tabUsers: "Foydalanuvchilar", tabSubs: "Obunalar",
    search: "Qidirish...", totalUsers: "Jami foydalanuvchilar",
    totalSubs: "Jami obunalar", activeSubs: "Faol obunalar", pendingSubs: "Kutilmoqda",
    name: "Ism", email: "Email", role: "Rol", joined: "Qo'shilgan",
    student: "O'quvchi", teacher: "O'qituvchi", admin: "Admin",
    plan: "Reja", status: "Holat", billing: "To'lov", expires: "Tugaydi",
    teacher: "O'qituvchi", phone: "Telefon", noData: "Ma'lumot yo'q",
    monthly: "Oylik", yearly: "Yillik", active: "Faol", pending: "Kutilmoqda", inactive: "Nofaol",
    accessDenied: "Ruxsat yo'q", deniedDesc: "Bu sahifa faqat adminlar uchun",
  },
  en: {
    title: "Admin Panel", sub: "Manage users and subscriptions",
    tabUsers: "Users", tabSubs: "Subscriptions", tabTeachers: "Teacher applications",
    search: "Search...", totalUsers: "Total users",
    totalSubs: "Total subscriptions", activeSubs: "Active subscriptions", pendingSubs: "Pending",
    name: "Name", email: "Email", role: "Role", joined: "Joined",
    student: "Student", teacher: "Teacher", admin: "Admin",
    plan: "Plan", status: "Status", billing: "Billing", expires: "Expires",
    teacher: "Teacher", phone: "Phone", noData: "No data",
    monthly: "Monthly", yearly: "Yearly", active: "Active", pending: "Pending", inactive: "Inactive",
    accessDenied: "Access denied", deniedDesc: "This page is for admins only",
    teacherStatus: "Status", teacherApprove: "Approve", teacherReject: "Reject",
    teacherCommissionRate: "Commission %", teacherAccrued: "Accrued (USD)",
    payingSubs: "Paying", trialSubs: "On trial", pausedSubs: "Halted",
    teacherStatusNone: "Not a teacher", teacherStatusPending: "Pending review",
    teacherStatusApproved: "Approved", teacherStatusRejected: "Rejected",
    noTeacherApps: "No teacher applications yet",
  },
  ru: {
    title: "Админ Панель", sub: "Управление пользователями и подписками",
    tabUsers: "Пользователи", tabSubs: "Подписки",
    search: "Поиск...", totalUsers: "Всего пользователей",
    totalSubs: "Всего подписок", activeSubs: "Активные подписки", pendingSubs: "Ожидают",
    name: "Имя", email: "Email", role: "Роль", joined: "Регистрация",
    student: "Ученик", teacher: "Учитель", admin: "Админ",
    plan: "План", status: "Статус", billing: "Оплата", expires: "Истекает",
    teacher: "Учитель", phone: "Телефон", noData: "Нет данных",
    monthly: "Ежемесячно", yearly: "Ежегодно", active: "Активен", pending: "Ожидание", inactive: "Неактивен",
    accessDenied: "Доступ запрещён", deniedDesc: "Эта страница только для админов",
  },
};

// Status presentation now comes from lib/subscription.js's shared classifier
// (subscriptionKind + SUB_KIND_META) so this page and the teacher dashboard
// can never disagree about what "active" means. The old local statusStyle /
// statusLabel helpers only knew the three original states and reported a
// free trial as "Active", which read as a payment that never happened.

const actionBtn =
  "text-xs font-semibold rounded-lg px-2.5 py-1 border select-none transition-colors disabled:opacity-40";

export default function AdminDashboard() {
  const s = STR.en;
  const { user, authChecked, isLoadingAuth } = useAuth();

  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  // Cancelling is the one destructive action, so it goes through a confirm
  // that also asks whether to cut access now or let the paid period finish.
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [cancelNote, setCancelNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(isUnlockedThisSession());
  // Per-user data wipe: { user, mode: "reset" | "delete", blocked? }
  const [wipeTarget, setWipeTarget] = useState(null);
  const [wipeConfirm, setWipeConfirm] = useState("");
  const [wipeLog, setWipeLog] = useState([]);
  const [wipeRunning, setWipeRunning] = useState(false);
  const [wipeResult, setWipeResult] = useState(null);

  const handleApproveTeacher = async (u) => {
    await base44.entities.User.update(u.id, { teacher_status: "approved" });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, teacher_status: "approved" } : x)));
  };

  const handleRejectTeacher = async (u) => {
    await base44.entities.User.update(u.id, { teacher_status: "rejected" });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, teacher_status: "rejected" } : x)));
  };

  const handleSetCommissionRate = async (u, rate) => {
    const parsed = rate === "" ? null : Number(rate);
    await base44.entities.User.update(u.id, { teacher_commission_rate_pct: parsed });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, teacher_commission_rate_pct: parsed } : x)));
  };

  // Every subscription action runs through lib/subscription.js and folds the
  // returned patch straight back into local state, so the table reflects the
  // change without a refetch and the two dashboards stay in lockstep.
  const runSubAction = async (fn) => {
    setBusy(true);
    try {
      const updated = await fn();
      setSubs((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      console.error("Subscription action failed:", e);
    } finally {
      setBusy(false);
      setConfirmCancel(null);
      setCancelNote("");
    }
  };

  // Approve a pending payment (Pricing.jsx submissions land here as
  // "pending"), or revive a cancelled/lapsed one, with a fresh billing
  // period. Pause banks the days already paid for; resume hands them back.
  const handleApprove = (sub) => runSubAction(() => approveSubscription(sub));
  const handlePause = (sub) => runSubAction(() => pauseSubscription(sub));
  const handleResume = (sub) => runSubAction(() => resumeSubscription(sub));
  const handleReactivate = (sub) => runSubAction(() => reactivateSubscription(sub));
  const handleCancel = (sub, immediate) =>
    runSubAction(() => cancelSubscription(sub, { immediate, note: cancelNote.trim() }));

  // Reset = wipe their data across every user-data entity and clear the
  // profile, but keep the login (this is the "wipe me so I can re-register"
  // path). Delete = the same sweep, then remove the account itself. The
  // guards live in lib/userWipe.js: reset is always allowed, delete refuses
  // on your own account and on other admins.
  const openWipe = (u, mode) => {
    const blocked = mode === "delete" ? guardDelete(u, user) : guardReset(u);
    setWipeConfirm("");
    setWipeLog([]);
    setWipeResult(null);
    setWipeTarget({ user: u, mode, blocked });
  };

  const closeWipe = () => {
    if (wipeRunning) return;
    setWipeTarget(null);
    setWipeConfirm("");
    setWipeLog([]);
    setWipeResult(null);
  };

  const runWipe = async () => {
    if (!wipeTarget || wipeTarget.blocked) return;
    const { user: target, mode } = wipeTarget;
    setWipeRunning(true);
    setWipeLog([]);
    try {
      if (mode === "delete") {
        const r = await deleteUserAccount(target, user, setWipeLog);
        setWipeResult(r);
        if (r.accountDeleted) setUsers((prev) => prev.filter((x) => x.id !== target.id));
      } else {
        const r = await resetUser(target, user, setWipeLog);
        setWipeResult(r);
        setUsers((prev) => prev.map((x) => (x.id === target.id ? { ...x, ...PROFILE_RESET_PATCH } : x)));
      }
      // Their subscription rows were just deleted by the sweep.
      setSubs((prev) => prev.filter((sx) => sx.phone !== target.email));
    } catch (e) {
      console.error("Wipe failed:", e);
    } finally {
      setWipeRunning(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [u, sub] = await Promise.all([
          base44.entities.User.list(),
          base44.entities.StudentSubscription.list(),
        ]);
        setUsers(u || []);
        setSubs(sub || []);
      } catch (e) {
        console.error("Admin load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 mb-4">
            <Shield className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{s.accessDenied}</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-5">{s.deniedDesc}</p>
          <Link to="/" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
            <ArrowLeft className="w-4 h-4" /> {s.tabUsers === "Users" ? "Home" : "Bosh sahifa"}
          </Link>
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return <AdminPinGate user={user} onUnlocked={() => setUnlocked(true)} />;
  }

  // "Paying" is real money only. The old "Active subscriptions" number
  // counted the free trial and the permanent free plan too (both are
  // status:"active"), which made it a vanity figure rather than something
  // you could reconcile against Stripe.
  const payingCount = subs.filter(isPaying).length;
  const pendingCount = subs.filter((x) => x.status === "pending").length;
  const trialCount = subs.filter((x) => subscriptionKind(x) === "trial").length;
  const pausedCount = subs.filter((x) => x.status === "paused").length;

  const stats = [
    { label: s.totalUsers, value: users.length, icon: Users, color: "from-blue-500 to-indigo-500" },
    { label: s.totalSubs, value: subs.length, icon: CreditCard, color: "from-violet-500 to-purple-500" },
    { label: s.payingSubs, value: payingCount, icon: CheckCircle2, color: "from-emerald-500 to-teal-500" },
    { label: s.pendingSubs, value: pendingCount, icon: Clock, color: "from-amber-500 to-orange-500" },
    { label: s.trialSubs, value: trialCount, icon: Gift, color: "from-sky-500 to-cyan-500" },
  ];

  const filteredUsers = users.filter((u) =>
    !query || `${resolveUserName(u)} ${u.full_name || ""} ${u.email || ""}`.toLowerCase().includes(query.toLowerCase())
  );
  const teacherApplicants = users.filter((u) => u.teacher_status && u.teacher_status !== "none");
  const pendingTeacherCount = teacherApplicants.filter((u) => u.teacher_status === "pending").length;
  const filteredTeachers = teacherApplicants.filter((u) =>
    !query || `${resolveUserName(u)} ${u.full_name || ""} ${u.email || ""}`.toLowerCase().includes(query.toLowerCase())
  );
  const filteredSubs = subs.filter((x) =>
    !query || `${x.student_name || ""} ${x.phone || ""} ${x.plan || ""} ${x.teacher_name || ""}`.toLowerCase().includes(query.toLowerCase())
  );

  // Reads teacher_status, not role. Base44's own `role` enum is only
  // admin|user — nothing ever sets it to "teacher" — so the old
  // role === "teacher" branch was unreachable and every real teacher
  // showed up here badged as a student.
  const roleBadge = (u) => {
    if (u.role === "admin") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 gap-1"><Crown className="w-3 h-3" />{s.admin}</Badge>;
    if (u.teacher_status === "approved") return <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 gap-1"><BookOpen className="w-3 h-3" />{s.teacher}</Badge>;
    if (u.teacher_status === "pending") return <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400 gap-1"><BookOpen className="w-3 h-3" />{s.teacher} ?</Badge>;
    return <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400 gap-1"><GraduationCap className="w-3 h-3" />{s.student}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950">
      <header className="bg-background/80 backdrop-blur border-b border-border px-4 pb-3 flex items-center gap-3 safe-header sticky top-0 z-30">
        <Link to="/" className="text-muted-foreground hover:text-foreground p-1.5 select-none">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-foreground leading-tight">{s.title}</h1>
            <p className="text-xs text-muted-foreground leading-tight">{s.sub}</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {stats.map((st, i) => {
            const Icon = st.icon;
            return (
              <motion.div
                key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-card border border-border rounded-2xl p-4 shadow-sm"
              >
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${st.color} flex items-center justify-center mb-2`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-2xl font-bold text-foreground">{st.value}</p>
                <p className="text-xs text-muted-foreground">{st.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex gap-2 bg-muted p-1 rounded-xl">
            <button
              onClick={() => setTab("users")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all select-none ${
                tab === "users" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {s.tabUsers} ({users.length})
            </button>
            <button
              onClick={() => setTab("subs")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all select-none ${
                tab === "subs" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {s.tabSubs} ({subs.length})
            </button>
            <button
              onClick={() => setTab("teachers")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all select-none ${
                tab === "teachers" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {s.tabTeachers} ({teacherApplicants.length}){pendingTeacherCount > 0 ? ` · ${pendingTeacherCount} new` : ""}
            </button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={s.search} value={query} onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            {/* Users table */}
            {tab === "users" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">{s.name}</th>
                      <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">{s.email}</th>
                      <th className="text-left font-medium px-4 py-3">{s.role}</th>
                      <th className="text-left font-medium px-4 py-3 hidden md:table-cell">{s.joined}</th>
                      <th className="text-left font-medium px-4 py-3">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-muted-foreground py-10">{s.noData}</td></tr>
                    )}
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{resolveUserName(u) || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{u.email || "—"}</td>
                        <td className="px-4 py-3">{roleBadge(u)}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button onClick={() => openWipe(u, "reset")}
                              className={`${actionBtn} text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10`}>
                              Reset
                            </button>
                            <button onClick={() => openWipe(u, "delete")}
                              className={`${actionBtn} text-destructive border-destructive/30 hover:bg-destructive/10`}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Teacher applications table */}
            {tab === "teachers" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">{s.name}</th>
                      <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">{s.email}</th>
                      <th className="text-left font-medium px-4 py-3">{s.teacherStatus}</th>
                      <th className="text-left font-medium px-4 py-3 hidden md:table-cell">{s.teacherCommissionRate}</th>
                      <th className="text-left font-medium px-4 py-3 hidden md:table-cell">{s.teacherAccrued}</th>
                      <th className="text-left font-medium px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-muted-foreground py-10">{s.noTeacherApps}</td></tr>
                    )}
                    {filteredTeachers.map((u) => {
                      const statusLabelFor = {
                        pending: s.teacherStatusPending,
                        approved: s.teacherStatusApproved,
                        rejected: s.teacherStatusRejected,
                      }[u.teacher_status] || u.teacher_status;
                      const statusClass = {
                        pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
                        approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
                        rejected: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
                      }[u.teacher_status] || "";
                      return (
                        <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium text-foreground">{resolveUserName(u) || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{u.email || "—"}</td>
                          <td className="px-4 py-3"><Badge className={statusClass}>{statusLabelFor}</Badge></td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <input
                              type="number" step="0.5" min="0" max="100"
                              defaultValue={u.teacher_commission_rate_pct ?? ""}
                              onBlur={(e) => handleSetCommissionRate(u, e.target.value)}
                              className="w-20 h-8 px-2 border border-input rounded-lg text-sm bg-background text-foreground"
                            />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                            ${(u.teacher_commission_accrued_usd || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            {u.teacher_status === "pending" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveTeacher(u)}
                                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 border border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg px-2.5 py-1 select-none"
                                >
                                  {s.teacherApprove}
                                </button>
                                <button
                                  onClick={() => handleRejectTeacher(u)}
                                  className="text-xs font-semibold text-destructive hover:text-destructive border border-destructive/30 hover:bg-destructive/10 rounded-lg px-2.5 py-1 select-none"
                                >
                                  {s.teacherReject}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Subscriptions table */}
            {tab === "subs" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">{s.name}</th>
                      <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">{s.plan}</th>
                      <th className="text-left font-medium px-4 py-3">{s.status}</th>
                      <th className="text-left font-medium px-4 py-3 hidden md:table-cell">{s.billing}</th>
                      <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">{s.expires}</th>
                      <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">{s.teacher}</th>
                      <th className="text-left font-medium px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubs.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-muted-foreground py-10">{s.noData}</td></tr>
                    )}
                    {filteredSubs.map((x) => (
                      <tr key={x.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{x.student_name || "—"}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{x.plan || "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{x.plan || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge className={SUB_KIND_META[subscriptionKind(x)].cls}>
                            {SUB_KIND_META[subscriptionKind(x)].label}
                          </Badge>
                          {x.status === "active" && x.cancelled_at && x.expires_at && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              ends {new Date(x.expires_at).toLocaleDateString()}
                            </p>
                          )}
                          {x.status === "paused" && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {x.paused_days_remaining ?? 0}d banked
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {x.billing_cycle === "yearly" ? s.yearly : s.monthly}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                          {x.expires_at ? new Date(x.expires_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{x.teacher_name || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {(x.status === "pending" || x.status === "inactive") && (
                              <button onClick={() => handleApprove(x)} disabled={busy}
                                className={`${actionBtn} text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10`}>
                                Approve
                              </button>
                            )}
                            {x.status === "active" && !x.cancelled_at && (
                              <button onClick={() => handlePause(x)} disabled={busy}
                                className={`${actionBtn} text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10`}>
                                Halt
                              </button>
                            )}
                            {x.status === "paused" && (
                              <button onClick={() => handleResume(x)} disabled={busy}
                                className={`${actionBtn} text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10`}>
                                Resume
                              </button>
                            )}
                            {(x.cancelled_at || x.status === "cancelled") && (
                              <button onClick={() => handleReactivate(x)} disabled={busy}
                                className={`${actionBtn} text-primary border-primary/30 hover:bg-primary/10`}>
                                Reactivate
                              </button>
                            )}
                            {x.status !== "cancelled" && (
                              <button onClick={() => setConfirmCancel(x)} disabled={busy}
                                className={`${actionBtn} text-destructive border-destructive/30 hover:bg-destructive/10`}>
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel confirm. The only destructive action here, so it asks which
          kind of cancellation this is rather than assuming — cutting a
          paying student off mid-period and letting them ride out what they
          paid for are genuinely different decisions. */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-foreground">Cancel subscription</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {confirmCancel.student_name || confirmCancel.phone}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {confirmCancel.expires_at
                ? `Currently paid through ${new Date(confirmCancel.expires_at).toLocaleDateString()}.`
                : "This subscription has no expiry date set."}
            </p>
            <textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              placeholder="Reason (optional) — saved on the record for later reconciliation"
              rows={2}
              className="w-full px-3 py-2 border border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none mb-4 resize-none"
            />
            <div className="space-y-2">
              <button
                onClick={() => handleCancel(confirmCancel, false)}
                disabled={busy}
                className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors select-none disabled:opacity-40"
              >
                <p className="text-sm font-semibold text-foreground">Let it run to the end</p>
                <p className="text-xs text-muted-foreground">
                  Keeps access until{" "}
                  {confirmCancel.expires_at
                    ? new Date(confirmCancel.expires_at).toLocaleDateString()
                    : "expiry"}
                  , then cancels automatically.
                </p>
              </button>
              <button
                onClick={() => handleCancel(confirmCancel, true)}
                disabled={busy}
                className="w-full text-left px-4 py-3 rounded-xl border border-destructive/30 hover:bg-destructive/10 transition-colors select-none disabled:opacity-40"
              >
                <p className="text-sm font-semibold text-destructive">Cut access now</p>
                <p className="text-xs text-muted-foreground">
                  Ends immediately. The expiry date stays on record so you can still see what they had left.
                </p>
              </button>
            </div>
            <button
              onClick={() => { setConfirmCancel(null); setCancelNote(""); }}
              className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground select-none py-2"
            >
              Never mind
            </button>
          </div>
        </div>
      )}

      {/* Per-user wipe. Reset keeps the login so you can re-register on the
          same email; Delete removes the account too. Both sweep every
          user-data entity — see lib/userWipe.js. */}
      {wipeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-foreground">
                  {wipeTarget.mode === "delete" ? "Delete account" : "Reset user data"}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {resolveUserName(wipeTarget.user) || wipeTarget.user.email}
                </p>
              </div>
            </div>

            {wipeTarget.blocked ? (
              <>
                <p className="text-sm text-muted-foreground mb-5">{wipeTarget.blocked}</p>
                <button onClick={closeWipe}
                  className="w-full h-11 rounded-xl border border-border text-sm font-semibold text-foreground select-none hover:bg-muted/50">
                  Close
                </button>
              </>
            ) : wipeResult ? (
              <>
                <p className="text-sm text-foreground mb-2">
                  Deleted{" "}
                  <span className="font-bold">
                    {wipeResult.results.reduce((a, r) => a + r.deleted, 0)}
                  </span>{" "}
                  rows across {wipeResult.results.length} entities.
                </p>
                {wipeTarget.mode === "delete" && (
                  <p className={`text-sm mb-2 ${wipeResult.accountDeleted ? "text-emerald-600" : "text-amber-600"}`}>
                    {wipeResult.accountDeleted
                      ? "Account removed."
                      : `Data is gone, but the account itself could not be deleted${wipeResult.accountError ? ` (${wipeResult.accountError})` : ""}. Remove it from Base44's own Users tab.`}
                  </p>
                )}
                {wipeTarget.mode === "reset" && (
                  <p className={`text-sm mb-2 ${wipeResult.profileError ? "text-amber-600" : "text-emerald-600"}`}>
                    {wipeResult.profileError
                      ? `Data wiped, but the profile fields didn't clear (${wipeResult.profileError}).`
                      : "Profile cleared — this email can register from scratch now."}
                  </p>
                )}
                <div className="text-[11px] font-mono text-muted-foreground space-y-0.5 mt-3 max-h-40 overflow-y-auto">
                  {wipeResult.results.filter((r) => r.deleted || r.failed).map((r) => (
                    <div key={r.name} className={r.failed ? "text-amber-600" : ""}>
                      {r.name}: {r.deleted} deleted{r.failed ? `, ${r.failed} failed` : ""}
                    </div>
                  ))}
                </div>
                <button onClick={closeWipe}
                  className="w-full h-11 mt-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold select-none hover:bg-primary/90">
                  Done
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  {wipeTarget.mode === "delete"
                    ? `Permanently deletes every row belonging to ${wipeTarget.user.email} across ${USER_DATA_ENTITIES.length} entities, then removes the account. No undo.`
                    : `Deletes every row belonging to ${wipeTarget.user.email} across ${USER_DATA_ENTITIES.length} entities and clears their profile (level, goals, class code, teacher status). The login survives, so this email can register again from scratch. No undo.`}
                </p>

                {wipeTarget.mode === "delete" && (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      Type <span className="font-mono font-bold text-foreground">{wipeTarget.user.email}</span> to confirm.
                    </p>
                    <input
                      value={wipeConfirm}
                      onChange={(e) => setWipeConfirm(e.target.value)}
                      placeholder={wipeTarget.user.email}
                      disabled={wipeRunning}
                      className="w-full h-10 px-3 border border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none mb-4"
                    />
                  </>
                )}

                {wipeRunning && wipeLog.length > 0 && (
                  <div className="text-[11px] font-mono text-muted-foreground space-y-0.5 mb-3 max-h-32 overflow-y-auto">
                    {wipeLog.map((r) => (
                      <div key={r.name}>{r.name}: {r.deleted} deleted{r.failed ? `, ${r.failed} failed` : ""}</div>
                    ))}
                  </div>
                )}

                <button
                  onClick={runWipe}
                  disabled={wipeRunning || (wipeTarget.mode === "delete" && wipeConfirm !== wipeTarget.user.email)}
                  className="w-full h-11 rounded-xl bg-destructive text-white text-sm font-semibold select-none disabled:opacity-40 hover:bg-destructive/90 flex items-center justify-center gap-2"
                >
                  {wipeRunning ? <><Loader2 className="w-4 h-4 animate-spin" /> Wiping…</> : wipeTarget.mode === "delete" ? "Delete permanently" : "Reset this user"}
                </button>
                <button onClick={closeWipe} disabled={wipeRunning}
                  className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground select-none py-2 disabled:opacity-40">
                  Never mind
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}