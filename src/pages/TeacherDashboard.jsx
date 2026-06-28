import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, CheckCircle, Clock, Users, ChevronLeft, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const pageVariants = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { x: "-100%", opacity: 0, transition: { duration: 0.2 } },
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const scrollRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      if (me.role !== "admin") { navigate("/"); return; }
      const subs = await base44.entities.StudentSubscription.list('-created_date', 50);
      setSubscriptions(subs);
      const res = await base44.entities.QuizResult.list('-created_date', 50);
      setResults(res);
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
    setNotification(`O'quvchi "${sub.student_name}" obunasi tasdiqlandi!`);
    loadData(true);
  };

  const handleLogout = () => base44.auth.logout("/login");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const activeCount = subscriptions.filter(s => s.status === "active").length;
  const pendingCount = subscriptions.filter(s => s.status === "pending").length;

  return (
    <motion.div className="min-h-screen bg-muted/40 flex flex-col" variants={pageVariants} initial="initial" animate="animate">
      {/* Header */}
      <header className="bg-background border-b border-border px-4 pb-3 flex items-center justify-between safe-header sticky top-0 z-30">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground p-1 select-none">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <BookOpen className="w-5 h-5 text-primary select-none" />
          <span className="font-bold text-foreground">Destination B1 Quiz</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full select-none">O'qituvchi</span>
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 select-none">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {refreshing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 40, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center overflow-hidden"
          >
            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <h2 className="text-xl font-bold text-foreground">O'qituvchi Nazorat Paneli</h2>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background rounded-xl p-4 border border-border text-center">
              <Users className="w-5 h-5 text-primary mx-auto mb-1 select-none" />
              <p className="text-xl font-bold text-foreground">{subscriptions.length}</p>
              <p className="text-xs text-muted-foreground">Jami o'quvchi</p>
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
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              {notification}
            </div>
          )}

          {/* Subscriptions Table */}
          <div className="bg-background rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Obuna va To'lovlar</h3>
            </div>
            {subscriptions.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground text-center">Hozircha o'quvchi yo'q</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">O'quvchi</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Email</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Chek ID</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Harakat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map(sub => (
                      <tr key={sub.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-medium text-foreground">{sub.student_name}</td>
                        <td className="px-5 py-3 text-muted-foreground">{sub.phone}</td>
                        <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{sub.payment_ref || "—"}</td>
                        <td className="px-5 py-3">
                          {sub.status === "active" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full select-none">
                              <CheckCircle className="w-3 h-3" /> Faol
                            </span>
                          ) : sub.status === "pending" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-500/10 px-2 py-1 rounded-full select-none">
                              <Clock className="w-3 h-3" /> Kutilmoqda
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground select-none">Faol emas</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {sub.status !== "active" ? (
                            <Button size="sm" onClick={() => handleAccept(sub)} className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8 select-none">
                              Tasdiqlash
                            </Button>
                          ) : (
                            <span className="text-emerald-500 text-xs font-medium select-none">✓ Tasdiqlangan</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Results Table */}
          <div className="bg-background rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">O'quvchilar Test Natijalari</h3>
            </div>
            {results.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground text-center">Natijalar topilmadi</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">O'quvchi</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Email</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Unit</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Natija</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Sana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-medium text-foreground">{r.student_name}</td>
                        <td className="px-5 py-3 text-muted-foreground">{r.student_phone}</td>
                        <td className="px-5 py-3 text-foreground">{r.unit_name}</td>
                        <td className="px-5 py-3">
                          <span className="font-bold text-emerald-600">{r.score}</span>
                          <span className="text-muted-foreground"> / {r.total_questions || 30}</span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">{r.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Button onClick={handleLogout} variant="outline" className="w-full h-10 select-none">
            Chiqish
          </Button>

          <footer className="text-center text-xs text-muted-foreground pb-4">
            Created by <strong className="text-foreground">Salohiddin Nurullaev & Temur Normatov</strong>
          </footer>
        </div>
      </div>
    </motion.div>
  );
}