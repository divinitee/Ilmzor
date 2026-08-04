import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { BookOpen, Trophy, LogOut, Play, Trash2, ChevronDown, RefreshCw, Moon, Sun, Monitor, MessageCircle, TrendingUp, Crown, Lightbulb, SlidersHorizontal } from "lucide-react";
import { AnimatePresence as AP } from "framer-motion";
import ChatWindow from "@/components/ChatWindow";
import ProfileEditor from "@/components/ProfileEditor";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import BottomTabBar from "@/components/BottomTabBar";
import UnitDrawer from "@/components/UnitDrawer";
import ParticleBackground from "@/components/ParticleBackground";
import SkillHub from "@/pages/SkillHub";
import VocabTutorChat from "@/components/tutor/VocabTutorChat";
import { useAppLang } from "@/hooks/useAppLang";
import MissionControl from "@/components/mission/MissionControl";
import TelegramPaymentLink from "@/components/TelegramPaymentLink";

const pageVariants = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { x: "-100%", opacity: 0, transition: { duration: 0.2 } },
};

export default function Home() {
  const { t } = useAppLang();
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [results, setResults] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "home";
  const navigateTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    ["game", "play", "difficulty", "timePerQ", "autoAdvance"].forEach(k => next.delete(k));
    if (tab === "home") next.delete("tab"); else next.set("tab", tab);
    setSearchParams(next);
  };
  const [unitDrawerOpen, setUnitDrawerOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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
      let subs = await base44.entities.StudentSubscription.filter({ phone: me.email });
      if (subs.length === 0) {
        // fallback: find subscription created by this user
        subs = await base44.entities.StudentSubscription.filter({ created_by_id: me.id });
      }
      if (subs.length > 0) {
        let sub = subs[0];
        if (sub.status === "active" && sub.expires_at && new Date(sub.expires_at) < new Date()) {
          sub = await base44.entities.StudentSubscription.update(sub.id, { status: "inactive" });
        }
        setSubscription(sub);
      }
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
        <div className="relative flex items-center gap-2 select-none">
          <span className="neo-bloom" aria-hidden="true" />
          <div className="relative neo-pill px-3 py-1.5">
            <BookOpen className="w-4 h-4 text-fuchsia-300" />
            <span className="font-bold text-foreground tracking-tight text-[13px]">{t("home.app_name")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-full select-none">
            {isAdmin ? t("home.teacher_badge") : t("home.student_badge")}
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
          isAdmin ? (
            <div className="max-w-lg mx-auto px-4 py-10 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">{t("home.teacher_panel_title")}</h2>
              <Link to="/teacher">
                <Button className="w-full h-12 text-base font-semibold select-none">{t("home.go_to_dashboard")}</Button>
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
              onNavigate={navigateTab}
            />
          )
        )}

        {activeTab === "skillhub" && <SkillHub isActive={isActive} user={user} />}

        {activeTab === "tutor" && (isActive ? <VocabTutorChat /> : <TrialHomeScreen isAdmin={isAdmin} subscription={subscription} />)}

        {activeTab === "settings" && (
          <SettingsTab
            user={user}
            onLogout={handleLogout}
            onDeleteRequest={() => setShowDeleteConfirm(true)}
            onProfileSaved={() => loadData(true)}
          />
        )}
      </div>

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab={activeTab} onTabChange={navigateTab} />

      {/* Unit Drawer */}
      <UnitDrawer
        open={unitDrawerOpen}
        onClose={() => setUnitDrawerOpen(false)}
        units={units}
        selectedUnit={selectedUnit}
        onSelect={setSelectedUnit}
      />

      {/* Floating chat button for students */}
      {!isAdmin && isActive && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center select-none hover:bg-primary/90 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}

      {/* Student chat with teacher */}
      <AP>
        {chatOpen && user && (
          <ChatWindow
            user={user}
            roomId={`chat:${user.email}`}
            partnerName="O'qituvchi"
            onClose={() => setChatOpen(false)}
          />
        )}
      </AP>

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
              <h3 className="text-lg font-bold text-foreground text-center mb-2">{t("settings.delete_confirm_title")}</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">{t("settings.delete_confirm_desc")}</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 select-none" onClick={() => setShowDeleteConfirm(false)}>
                  {t("settings.delete_cancel")}
                </Button>
                <Button className="flex-1 bg-destructive hover:bg-destructive/90 select-none" onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? t("settings.deleting") : t("settings.delete_confirm")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StudentDashboard({ results, units, selectedUnit, selectedUnitName, onOpenUnitDrawer, isActive, user, subscription, onSubmitted, onNavigate }) {
  return (
    <MissionControl
      user={user}
      results={results}
      units={units}
      selectedUnit={selectedUnit}
      selectedUnitName={selectedUnitName}
      subscription={subscription}
      isActive={isActive}
      onOpenUnitDrawer={onOpenUnitDrawer}
      onNavigate={onNavigate}
    />
  );
}

function SettingsTab({ user, onLogout, onDeleteRequest, onProfileSaved }) {
  const { theme, setTheme } = useTheme();
  const { t } = useAppLang();

  const themeOptions = [
    { value: "system", label: t("settings.theme_system"), icon: Monitor },
    { value: "light", label: t("settings.theme_light"), icon: Sun },
    { value: "dark", label: t("settings.theme_dark"), icon: Moon },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      <h2 className="text-xl font-bold text-foreground">{t("settings.page_title")}</h2>

      {/* Profile editor */}
      <div className="bg-background rounded-2xl border border-border p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">{t("settings.profile")}</p>
        <ProfileEditor user={user} onSaved={onProfileSaved} />
        <p className="text-sm text-muted-foreground mt-3 text-center">{user?.email}</p>
      </div>

      {/* Quick links */}
      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold px-5 pt-4 pb-2">{t("settings.more")}</p>
        {[
          { to: "/leaderboard", label: t("settings.leaderboard"), icon: Trophy },
          { to: "/my-progress", label: t("settings.my_progress"), icon: TrendingUp },
          { to: "/plans", label: t("settings.subscription_plans"), icon: Crown },
          { to: "/study-tips", label: t("settings.study_tips"), icon: Lightbulb },
          { to: "/settings", label: t("settings.full_settings"), icon: SlidersHorizontal },
        ].map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors border-b border-border last:border-0 select-none"
          >
            <Icon className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{label}</span>
          </Link>
        ))}
      </div>

      {/* Theme */}
      <div className="bg-background rounded-2xl border border-border p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">{t("settings.appearance")}</p>
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
          <span className="text-sm font-medium text-foreground">{t("settings.logout")}</span>
        </button>
        <button
          onClick={onDeleteRequest}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-destructive/5 transition-colors select-none"
        >
          <Trash2 className="w-5 h-5 text-destructive" />
          <span className="text-sm font-medium text-destructive">{t("settings.delete_account")}</span>
        </button>
      </div>
    </div>
  );
}

function TrialHomeScreen({ isAdmin, subscription }) {
  const { t } = useAppLang();
  const isPending = subscription?.status === "pending";
  return (
    <div className="max-w-lg mx-auto px-4 py-10 text-center space-y-5">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
        <BookOpen className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {isAdmin ? t("home.trial_teacher_title") : t("home.trial_student_title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? t("home.trial_teacher_desc") : t("home.trial_student_desc")}
        </p>
      </div>
      {isPending ? (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4 text-sm text-amber-700 dark:text-amber-400 font-medium">
          {t("home.pending_msg")}
        </div>
      ) : (
        <Link to="/pricing">
          <Button className="w-full h-12 text-base font-semibold select-none">
            {t("home.view_plans")}
          </Button>
        </Link>
      )}
    </div>
  );
}

function PaywallScreen({ user, subscription, onSubmitted }) {
  const { t } = useAppLang();
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
        <h2 className="text-xl font-bold text-primary text-center mb-2">{t("home.paywall_title")}</h2>
        <p className="text-center text-sm text-muted-foreground mb-6">
          {t("home.paywall_desc")}<br />
          <strong className="text-foreground">{t("home.paywall_price")}</strong>
        </p>
        <div className="text-center mb-6">
          <p className="text-xs text-muted-foreground mb-2 font-medium">{t("home.qr_prompt")}</p>
          <img
            src="https://media.base44.com/images/public/6a40f974860993eff3634df0/4ef59e6e7_paymentqr.jpg"
            alt="To'lov QR Kodi"
            className="w-44 h-44 mx-auto rounded-xl border-4 border-white shadow-md object-contain bg-white"
          />
        </div>
        <div className="mb-4">
          <TelegramPaymentLink />
        </div>
        {submitted ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
            <p className="text-amber-700 dark:text-amber-400 font-medium text-sm">{t("home.submitted_msg")}</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-foreground mb-2">{t("home.ref_label")}</label>
              <input
                type="text"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder={t("home.ref_placeholder")}
                className="w-full h-12 px-4 border-2 border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !paymentRef.trim()}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold select-none"
            >
              {submitting ? t("home.submitting") : t("home.submit_payment")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}