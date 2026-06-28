import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Trophy, LogOut, Play, Settings, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const pageVariants = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { x: "-100%", opacity: 0, transition: { duration: 0.2 } },
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [results, setResults] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      const subs = await base44.entities.StudentSubscription.filter({ phone: me.email });
      if (subs.length > 0) setSubscription(subs[0]);
      const words = await base44.entities.VocabularyWord.list();
      const unitMap = {};
      words.forEach(w => { if (!unitMap[w.unit_key]) unitMap[w.unit_key] = w.unit_name; });
      const unitList = Object.entries(unitMap).map(([key, name]) => ({ key, name }));
      setUnits(unitList);
      if (unitList.length > 0) setSelectedUnit(unitList[0].key);
      const myResults = await base44.entities.QuizResult.filter({ student_phone: me.email }, '-created_date');
      setResults(myResults);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => base44.auth.logout("/login");

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      if (subscription) await base44.entities.StudentSubscription.delete(subscription.id);
      await base44.entities.QuizResult.deleteMany({ student_phone: user.email });
      await base44.auth.logout("/register");
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const isActive = subscription?.status === "active";

  return (
    <motion.div className="min-h-screen bg-muted/40" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <AppHeader user={user} onLogout={handleLogout} role={isAdmin ? "O'qituvchi" : "O'quvchi"} onSettings={() => setShowSettings(true)} />

      {isAdmin ? (
        <div className="max-w-lg mx-auto px-4 py-10 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">O'qituvchi Paneli</h2>
          <Link to="/teacher">
            <Button className="w-full h-12 text-base font-semibold select-none">Nazorat Paneliga o'tish</Button>
          </Link>
        </div>
      ) : !isActive ? (
        <PaywallScreen user={user} subscription={subscription} onSubmitted={loadData} />
      ) : (
        <StudentDashboard user={user} results={results} units={units} selectedUnit={selectedUnit} setSelectedUnit={setSelectedUnit} />
      )}

      <Footer />

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl p-6 shadow-2xl"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">Sozlamalar</h3>
                <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground select-none">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => { setShowSettings(false); setShowDeleteConfirm(true); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-semibold select-none"
              >
                <Trash2 className="w-5 h-5" />
                Hisobni o'chirish
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirm Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl"
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="text-lg font-bold text-foreground text-center mb-2">Hisobni o'chirish</h3>
                <p className="text-sm text-muted-foreground text-center mb-6">Bu amalni qaytarib bo'lmaydi. Barcha ma'lumotlaringiz o'chib ketadi.</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 select-none" onClick={() => setShowDeleteConfirm(false)}>
                    Bekor qilish
                  </Button>
                  <Button
                    className="flex-1 bg-destructive hover:bg-destructive/90 select-none"
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? "O'chirilmoqda..." : "O'chirish"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AppHeader({ user, onLogout, role, onSettings }) {
  return (
    <header className="bg-background border-b border-border px-4 pb-3 flex items-center justify-between safe-header sticky top-0 z-30">
      <div className="flex items-center gap-2 select-none">
        <BookOpen className="w-5 h-5 text-primary" />
        <span className="font-bold text-foreground">Destination B1 Quiz</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full select-none">{role}</span>
        <span className="text-sm text-muted-foreground hidden sm:inline">{user?.full_name || user?.email}</span>
        <button onClick={onSettings} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 select-none">
          <Settings className="w-4 h-4" />
        </button>
        <button onClick={onLogout} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 select-none">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

function StudentDashboard({ results, units, selectedUnit, setSelectedUnit }) {
  const totalQuizzes = results.length;
  const totalCorrect = results.reduce((sum, r) => sum + (r.score || 0), 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="bg-background rounded-2xl shadow-sm border border-border p-6 mb-6">
        <h2 className="text-xl font-bold text-primary text-center mb-6">O'quvchi paneli</h2>
        <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-primary/5 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalQuizzes}</p>
            <p className="text-xs text-muted-foreground mt-1">Jami testlar</p>
          </div>
          <div className="flex-1 bg-emerald-500/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalCorrect}</p>
            <p className="text-xs text-muted-foreground mt-1">To'g'ri javoblar</p>
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-sm font-semibold text-foreground mb-2">Vocabulary Unitni tanlang:</label>
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Unit tanlang" />
            </SelectTrigger>
            <SelectContent>
              {units.map(u => (
                <SelectItem key={u.key} value={u.key}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Link to={`/quiz/${selectedUnit}`}>
          <Button className="w-full h-12 text-base font-semibold gap-2 select-none">
            <Play className="w-5 h-5" />
            Testni Boshlash (30 ta random)
          </Button>
        </Link>
      </div>

      {results.length > 0 && (
        <div className="bg-background rounded-2xl shadow-sm border border-border p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Oxirgi natijalar</h3>
          <div className="space-y-3">
            {results.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.unit_name}</p>
                  <p className="text-xs text-muted-foreground">{r.date}</p>
                </div>
                <div className="flex items-center gap-1 select-none">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-emerald-600">{r.score}</span>
                  <span className="text-muted-foreground text-sm">/ {r.total_questions || 30}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PaywallScreen({ user, subscription, onSubmitted }) {
  const [paymentRef, setPaymentRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(subscription?.status === "pending");

  const handleSubmit = async () => {
    if (!paymentRef.trim()) return;
    setSubmitting(true);
    try {
      if (subscription) {
        await base44.entities.StudentSubscription.update(subscription.id, { payment_ref: paymentRef, status: "pending" });
      } else {
        await base44.entities.StudentSubscription.create({
          student_name: user.full_name || user.email,
          phone: user.email,
          payment_ref: paymentRef,
          status: "pending"
        });
      }
      setSubmitted(true);
      onSubmitted();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="bg-background rounded-2xl shadow-sm border border-border p-6">
        <h2 className="text-xl font-bold text-primary text-center mb-2">Obuna faol emas</h2>
        <p className="text-center text-sm text-muted-foreground mb-6">
          Platformadan to'liq foydalanish uchun oylik to'lovni amalga oshiring.<br />
          <strong className="text-foreground">Oylik obuna narxi: 18,999 so'm</strong>
        </p>
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl p-5 text-white mb-6">
          <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">To'lov kartasi (Uzcard/Humo)</p>
          <p className="text-lg font-mono font-bold tracking-wider mb-3 select-all">8888 0133 9870 3481</p>
          <p className="text-sm opacity-90">Egasi: <strong>Temur Normatov Ulugbekovich</strong></p>
        </div>
        {submitted ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
            <p className="text-amber-700 dark:text-amber-400 font-medium text-sm">To'lovingiz tizimga yuborildi. O'qituvchi tasdiqlaganidan so'ng platforma faollashadi.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-foreground mb-2">To'lov cheki raqami / Tranzaksiya ID:</label>
              <input
                type="text"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="Masalan: 45781223"
                className="w-full h-12 px-4 border-2 border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !paymentRef.trim()}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold select-none"
            >
              {submitting ? "Yuborilmoqda..." : "To'lovni tasdiqlashga yuborish"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto py-6 text-center text-xs text-muted-foreground">
      Created by <strong className="text-foreground">Salohiddin Nurullaev & Temur Normatov</strong>
    </footer>
  );
}