import React, { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

import { useAuth } from "@/lib/AuthContext";
import {
  ArrowLeft, Users, CreditCard, CheckCircle2, Clock, Search, Shield,
  Loader2, Crown, GraduationCap, BookOpen,
} from "lucide-react";

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
    tabUsers: "Users", tabSubs: "Subscriptions",
    search: "Search...", totalUsers: "Total users",
    totalSubs: "Total subscriptions", activeSubs: "Active subscriptions", pendingSubs: "Pending",
    name: "Name", email: "Email", role: "Role", joined: "Joined",
    student: "Student", teacher: "Teacher", admin: "Admin",
    plan: "Plan", status: "Status", billing: "Billing", expires: "Expires",
    teacher: "Teacher", phone: "Phone", noData: "No data",
    monthly: "Monthly", yearly: "Yearly", active: "Active", pending: "Pending", inactive: "Inactive",
    accessDenied: "Access denied", deniedDesc: "This page is for admins only",
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

const statusStyle = (status, s) => {
  if (status === "active") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
  if (status === "pending") return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
  return "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400";
};

const statusLabel = (status, s) =>
  status === "active" ? s.active : status === "pending" ? s.pending : s.inactive;

export default function AdminDashboard() {
  const s = STR.en;
  const { user, authChecked, isLoadingAuth } = useAuth();

  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Approve a self-service payment (Pricing.jsx submissions land here as
  // "pending"). Mirrors TeacherDashboard.jsx's handleAccept exactly — that
  // path already sets status + expires_at together correctly; this was the
  // one missing piece for non-teacher-referred payments, which is why a
  // pending self-service subscription could get manually flipped to
  // "active" elsewhere without ever getting a real expiry date.
  const handleApprove = async (sub) => {
    const expiresAt = new Date();
    if (sub.billing_cycle === "yearly") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }
    const expiresAtStr = expiresAt.toISOString().split("T")[0];
    await base44.entities.StudentSubscription.update(sub.id, { status: "active", expires_at: expiresAtStr });
    setSubs((prev) => prev.map((s) => (s.id === sub.id ? { ...s, status: "active", expires_at: expiresAtStr } : s)));
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

  const activeCount = subs.filter((x) => x.status === "active").length;
  const pendingCount = subs.filter((x) => x.status === "pending").length;

  const stats = [
    { label: s.totalUsers, value: users.length, icon: Users, color: "from-blue-500 to-indigo-500" },
    { label: s.totalSubs, value: subs.length, icon: CreditCard, color: "from-violet-500 to-purple-500" },
    { label: s.activeSubs, value: activeCount, icon: CheckCircle2, color: "from-emerald-500 to-teal-500" },
    { label: s.pendingSubs, value: pendingCount, icon: Clock, color: "from-amber-500 to-orange-500" },
  ];

  const filteredUsers = users.filter((u) =>
    !query || `${u.full_name || ""} ${u.email || ""}`.toLowerCase().includes(query.toLowerCase())
  );
  const filteredSubs = subs.filter((x) =>
    !query || `${x.student_name || ""} ${x.phone || ""} ${x.plan || ""} ${x.teacher_name || ""}`.toLowerCase().includes(query.toLowerCase())
  );

  const roleBadge = (role) => {
    if (role === "admin") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 gap-1"><Crown className="w-3 h-3" />{s.admin}</Badge>;
    if (role === "teacher") return <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 gap-1"><BookOpen className="w-3 h-3" />{s.teacher}</Badge>;
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={4} className="text-center text-muted-foreground py-10">{s.noData}</td></tr>
                    )}
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{u.full_name || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{u.email || "—"}</td>
                        <td className="px-4 py-3">{roleBadge(u.role)}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
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
                          <Badge className={statusStyle(x.status, s)}>{statusLabel(x.status, s)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {x.billing_cycle === "yearly" ? s.yearly : s.monthly}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                          {x.expires_at ? new Date(x.expires_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{x.teacher_name || "—"}</td>
                        <td className="px-4 py-3">
                          {x.status === "pending" && (
                            <button
                              onClick={() => handleApprove(x)}
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 border border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg px-2.5 py-1 select-none"
                            >
                              Approve
                            </button>
                          )}
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
    </div>
  );
}