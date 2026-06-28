import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, CheckCircle, Clock, Users, ChevronLeft, RefreshCw, Plus, Copy, Hash, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const pageVariants = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { x: "-100%", opacity: 0, transition: { duration: 0.2 } },
};

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [results, setResults] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("students"); // "students" | "referrals" | "results"
  const [creatingCode, setCreatingCode] = useState(false);
  const [newCodeLabel, setNewCodeLabel] = useState("");
  const [expandedReferral, setExpandedReferral] = useState(null);
  const pullStartY = useRef(0);
  const scrollRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      if (me.role !== "admin") { navigate("/"); return; }
      const [subs, res, refs] = await Promise.all([
        base44.entities.StudentSubscription.list("-created_date", 100),
        base44.entities.QuizResult.list("-created_date", 100),
        base44.entities.TeacherReferral.filter({ teacher_id: me.id }, "-created_date"),
      ]);
      setSubscriptions(subs);
      setResults(res);
      setReferrals(refs);
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
    await base44.entities.StudentSubscription.update(sub.id, { status: "active" });
    setNotification(`"${sub.student_name}" obunasi tasdiqlandi!`);
    setTimeout(() => setNotification(""), 3000);
    loadData(true);
  };

  const handleCreateCode = async () => {
    if (!user) return;
    setCreatingCode(true);
    try {
      const code = generateCode();
      await base44.entities.TeacherReferral.create({
        teacher_id: user.id,
        teacher_name: user.full_name || user.email,
        teacher_email: user.email,
        code,
        label: newCodeLabel.trim() || `Guruh ${referrals.length + 1}`,
        uses: 0,
      });
      setNewCodeLabel("");
      loadData(true);
    } finally {
      setCreatingCode(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setNotification(`Kod nusxalandi: ${code}`);
    setTimeout(() => setNotification(""), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const activeCount = subscriptions.filter(s => s.status === "active").length;
  const pendingCount = subscriptions.filter(s => s.status === "pending").length;

  // Group subscriptions by referral code
  const myStudents = subscriptions.filter(s => s.teacher_id === user?.id || referrals.some(r => r.code === s.referral_code));
  const ungrouped = subscriptions.filter(s => !s.referral_code || !referrals.some(r => r.code === s.referral_code));

  return (
    <motion.div className="min-h-screen bg-muted/40 flex flex-col" variants={pageVariants} initial="initial" animate="animate">
      {/* Header */}
      <header className="bg-background border-b border-border px-4 pb-3 flex items-center justify-between safe-header sticky top-0 z-30">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground p-1 select-none">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <BookOpen className="w-5 h-5 text-primary select-none" />
          <span className="font-bold text-foreground">O'qituvchi Paneli</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full select-none">O'qituvchi</span>
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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background rounded-xl p-4 border border-border text-center">
              <Users className="w-5 h-5 text-primary mx-auto mb-1 select-none" />
              <p className="text-xl font-bold text-foreground">{subscriptions.length}</p>
              <p className="text-xs text-muted-foreground">Jami</p>
            </div>
            <div className="bg-background rounded-xl p-4 border border-border text-center">
              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1 select-none" />
              <p className="text-xl font-bold text-emerald-600">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Faol</p>
            </div>
            <div className="bg-background rounded-xl p-4 border border-border text-center">
              <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1 select-none" />
              <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Kutilmoqda</p>
            </div>
          </div>

          {notification && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              {notification}
            </div>
          )}

          {/* Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-xl">
            {[
              { id: "students", label: "O'quvchilar" },
              { id: "referrals", label: "Kodlar" },
              { id: "results", label: "Natijalar" },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`py-2 rounded-lg text-xs font-semibold transition-all select-none ${activeTab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* STUDENTS TAB */}
          {activeTab === "students" && (
            <div className="space-y-4">
              {/* Pending approvals first */}
              {subscriptions.filter(s => s.status === "pending").length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-amber-500/20">
                    <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">⏳ Tasdiqlash kutilmoqda</h3>
                  </div>
                  {subscriptions.filter(s => s.status === "pending").map(sub => (
                    <div key={sub.id} className="flex items-center justify-between px-5 py-3 border-b border-amber-500/10 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{sub.student_name}</p>
                        <p className="text-xs text-muted-foreground">{sub.phone}</p>
                        {sub.referral_code && <p className="text-xs text-primary font-mono mt-0.5">{sub.referral_code}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-mono">{sub.payment_ref || "—"}</span>
                        <Button size="sm" onClick={() => handleAccept(sub)} className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8 select-none">
                          Tasdiqlash
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Students grouped by referral */}
              {referrals.map(ref => {
                const refStudents = subscriptions.filter(s => s.referral_code === ref.code);
                if (refStudents.length === 0) return null;
                return (
                  <div key={ref.id} className="bg-background rounded-2xl border border-border overflow-hidden">
                    <button
                      onClick={() => setExpandedReferral(expandedReferral === ref.id ? null : ref.id)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">{ref.code}</span>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-foreground">{ref.label}</p>
                          <p className="text-xs text-muted-foreground">{refStudents.length} ta o'quvchi</p>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedReferral === ref.id ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {expandedReferral === ref.id && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="border-t border-border">
                            {refStudents.map(sub => (
                              <div key={sub.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0">
                                <div>
                                  <p className="text-sm font-medium text-foreground">{sub.student_name}</p>
                                  <p className="text-xs text-muted-foreground">{sub.phone}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {sub.status === "active" ? (
                                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full">Faol</span>
                                  ) : sub.status === "pending" ? (
                                    <Button size="sm" onClick={() => handleAccept(sub)} className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7 select-none">
                                      Tasdiqlash
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Faol emas</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Ungrouped students */}
              {ungrouped.length > 0 && (
                <div className="bg-background rounded-2xl border border-border overflow-hidden">
                  <div className="px-5 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold text-muted-foreground">Kodsiz o'quvchilar</h3>
                  </div>
                  {ungrouped.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{sub.student_name}</p>
                        <p className="text-xs text-muted-foreground">{sub.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sub.status === "active" ? (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full">Faol</span>
                        ) : sub.status === "pending" ? (
                          <Button size="sm" onClick={() => handleAccept(sub)} className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7 select-none">
                            Tasdiqlash
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Faol emas</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {subscriptions.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-10">Hozircha o'quvchi yo'q</p>
              )}
            </div>
          )}

          {/* REFERRALS TAB */}
          {activeTab === "referrals" && (
            <div className="space-y-4">
              {/* Create new code */}
              <div className="bg-background rounded-2xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Yangi referral kodi yaratish</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Guruh nomi (ixtiyoriy)"
                    value={newCodeLabel}
                    onChange={e => setNewCodeLabel(e.target.value)}
                    className="flex-1 h-10 px-3 border border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                  <Button onClick={handleCreateCode} disabled={creatingCode} className="h-10 gap-1.5 select-none">
                    <Plus className="w-4 h-4" />
                    Yaratish
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Har bir guruh yoki sinf uchun alohida kod yarating</p>
              </div>

              {referrals.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">Hali kod yaratilmagan</p>
              ) : (
                <div className="space-y-3">
                  {referrals.map(ref => (
                    <div key={ref.id} className="bg-background rounded-2xl border border-border p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground font-mono text-lg tracking-widest">{ref.code}</p>
                        <p className="text-xs text-muted-foreground">{ref.label} · {ref.uses || 0} ta o'quvchi</p>
                      </div>
                      <button
                        onClick={() => copyCode(ref.code)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground select-none"
                        title="Nusxalash"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RESULTS TAB */}
          {activeTab === "results" && (
            <div className="bg-background rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Test Natijalari</h3>
              </div>
              {results.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground text-center">Natijalar topilmadi</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">O'quvchi</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Unit</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Natija</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Sana</th>
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

          <footer className="text-center text-xs text-muted-foreground pb-4">
            Created by <strong className="text-foreground">Salohiddin Nurullaev & Temur Normatov</strong>
          </footer>
        </div>
      </div>
    </motion.div>
  );
}