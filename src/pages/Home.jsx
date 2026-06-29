import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { BookOpen, Trophy, LogOut, Play, Trash2, ChevronDown, RefreshCw, Moon, Sun, Monitor } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import BottomTabBar from "@/components/BottomTabBar";
import UnitDrawer from "@/components/UnitDrawer";
import VocabularyList from "@/pages/VocabularyList";
import ParticleBackground from "@/components/ParticleBackground";
import Games from "@/pages/Games";

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
  const [activeTab, setActiveTab] = useState("vocab");
  const [unitDrawerOpen, setUnitDrawerOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const scrollRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      const subs = await base44.entities.StudentSubscription.filter({ phone: me.email });
      if (subs.length > 0) setSubscription(subs[0]);
      const words = await base44.entities.VocabularyWord.list();
      const unitMap = {};
      words.forEach(w => { if (!unitMap[w.unit_key]) unitMap[w.unit_key] = w.unit_name; });
      const unitList = Object.entries(unitMap)
        .map(([key, name]) => ({ key, name, num: words.find(w => w.unit_key === key)?.unit_number || 99 }))
        .sort((a, b) => a.num - b.num);
      setUnits(unitList);
      if (unitList.length > 0 && !selectedUnit) setSelectedUnit(unitList[0].key);
      const myResults = await base44.entities.QuizResult.filter({ student_phone: me.email }, '-created_date');
      setResults(myResults);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull-to-refresh handlers
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

  const handleLogout = () => base44.auth.logout("/login");

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      if (subscription) await base44.entities.StudentSubscription.delete(subscription.id);
      await base44.entities.QuizResult.deleteMany({ student_phone: user?.email });
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
  const selectedUnitName = units.find(u => u.key === selectedUnit)?.name || "";

  // Everyone needs an active subscription — admins are not exempt
  // They get a free trial (limited vocab + 2 game rounds tracked in localStorage)
  // After trial they're redirected to /pricing from within the tabs

  return (
    <motion.div className="min-h-screen bg-muted/40 flex flex-col" variants={pageVariants} initial="initial" animate="animate">
      <ParticleBackground />
      {/* Header */}
      <header className="bg-background border-b border-border px-4 pb-3 flex items-center justify-between safe-header sticky top-0 z-30">
        <div className="flex items-center gap-2 select-none">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">Vocabulary A2·B1·B2</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full select-none">
            {isAdmin ? "O'qituvchi" : "O'quvchi"}
          </span>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 select-none">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        <AnimatePresence>
          {refreshing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 40, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center justify-center overflow-hidden"
            >
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === "home" && (
          isActive ? (
            isAdmin ? (
              <div className="max-w-lg mx-auto px-4 py-10 text-center">
                <h2 className="text-2xl font-bold text-foreground mb-4">O'qituvchi Paneli</h2>
                <Link to="/teacher">
                  <Button className="w-full h-12 text-base font-semibold select-none">Nazorat Paneliga o'tish</Button>
                </Link>
              </div>
            ) : (
              <StudentDashboard
                results={results}
                units={units}
                selectedUnit={selectedUnit}
                selectedUnitName={selectedUnitName}
                onOpenUnitDrawer={() => setUnitDrawerOpen(true)}
                isActive={isActive}
                user={user}
                subscription={subscription}
                onSubmitted={() => loadData(true)}
              />
            )
          ) : (
            <TrialHomeScreen isAdmin={isAdmin} subscription={subscription} />
          )
        )}

        {activeTab === "vocab" && <VocabularyList isActive={isActive} />}

        {activeTab === "games" && <Games isActive={isActive} />}

        {activeTab === "settings" && (
          <SettingsTab
            user={user}
            onLogout={handleLogout}
            onDeleteRequest={() => setShowDeleteConfirm(true)}
          />
        )}
      </div>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Unit Drawer */}
      <UnitDrawer
        open={unitDrawerOpen}
        onClose={() => setUnitDrawerOpen(false)}
        units={units}
        selectedUnit={selectedUnit}
        onSelect={setSelectedUnit}
      />

      {/* Delete Confirm Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
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
                <Button className="flex-1 bg-destructive hover:bg-destructive/90 select-none" onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? "O'chirilmoqda..." : "O'chirish"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StudentDashboard({ results, units, selectedUnit, selectedUnitName, onOpenUnitDrawer, isActive, user, subscription, onSubmitted }) {
  const totalQuizzes = results.length;
  const totalCorrect = results.reduce((sum, r) => sum + (r.score || 0), 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Paid: Quiz section */}
      {isActive ? (
        <div className="bg-background rounded-2xl shadow-sm border border-border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full">Premium</span>
            <h2 className="text-base font-bold text-foreground">Test va Reading</h2>
          </div>
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
            <label className="block text-sm font-semibold text-foreground mb-2">Unitni tanlang:</label>
            <button
              onClick={onOpenUnitDrawer}
              className="w-full h-12 px-4 flex items-center justify-between border-2 border-input rounded-xl bg-background text-foreground text-sm font-medium hover:border-primary transition-colors select-none"
            >
              <span>{selectedUnitName || "Unit tanlang"}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <Link to={`/quiz/${selectedUnit}`}>
            <Button className="w-full h-12 text-base font-semibold gap-2 select-none">
              <Play className="w-5 h-5" />
              Testni Boshlash (30 ta random)
            </Button>
          </Link>
        </div>
      ) : (
        <PaywallScreen user={user} subscription={subscription} onSubmitted={onSubmitted} />
      )}


      {isActive && results.length > 0 && (
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

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        Created by <strong className="text-foreground">Salohiddin Nurullaev & Temur Normatov</strong>
      </footer>
    </div>
  );
}

function SettingsTab({ user, onLogout, onDeleteRequest }) {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: "system", label: "Tizim", icon: Monitor },
    { value: "light", label: "Yorug'", icon: Sun },
    { value: "dark", label: "Qorong'i", icon: Moon },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      <h2 className="text-xl font-bold text-foreground">Sozlamalar</h2>

      {/* User info */}
      <div className="bg-background rounded-2xl border border-border p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Hisob</p>
        <p className="text-sm font-medium text-foreground">{user?.full_name || "—"}</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      {/* Theme */}
      <div className="bg-background rounded-2xl border border-border p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Ko'rinish rejimi</p>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-colors select-none ${
                theme === value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/50 transition-colors border-b border-border select-none"
        >
          <LogOut className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Chiqish</span>
        </button>
        <button
          onClick={onDeleteRequest}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-destructive/5 transition-colors select-none"
        >
          <Trash2 className="w-5 h-5 text-destructive" />
          <span className="text-sm font-medium text-destructive">Hisobni o'chirish</span>
        </button>
      </div>
    </div>
  );
}

function TrialHomeScreen({ isAdmin, subscription }) {
  const isPending = subscription?.status === "pending";
  return (
    <div className="max-w-lg mx-auto px-4 py-10 text-center space-y-5">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
        <BookOpen className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {isAdmin ? "O'qituvchi obunasi kerak" : "Bepul sinov tugadi"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "O'qituvchi sifatida platformadan to'liq foydalanish uchun obuna kerak."
            : "So'zlar ro'yxati va o'yinlarning bepul sinov versiyasini ko'rdingiz."}
        </p>
      </div>
      {isPending ? (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4 text-sm text-amber-700 dark:text-amber-400 font-medium">
          ⏳ To'lovingiz ko'rib chiqilmoqda. Tez orada faollashadi.
        </div>
      ) : (
        <Link to="/pricing">
          <Button className="w-full h-12 text-base font-semibold select-none">
            Obuna rejalarini ko'rish →
          </Button>
        </Link>
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
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl p-5 text-white mb-4">
          <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">To'lov kartasi (Uzcard/Humo)</p>
          <p className="text-lg font-mono font-bold tracking-wider mb-3 select-all">9860 1201 5281 8502</p>
          <p className="text-sm opacity-90">Egasi: <strong>Temur Normatov Ulugbekovich</strong></p>
        </div>
        <div className="text-center mb-6">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Yoki QR-kod orqali tezkor to'lang:</p>
          <img
            src="https://media.base44.com/images/public/6a40f974860993eff3634df0/4ef59e6e7_paymentqr.jpg"
            alt="To'lov QR Kodi"
            className="w-44 h-44 mx-auto rounded-xl border-4 border-white shadow-md object-contain bg-white"
          />
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