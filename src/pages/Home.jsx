import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Trophy, LogOut, Play } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [results, setResults] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);

      const subs = await base44.entities.StudentSubscription.filter({ phone: me.email });
      if (subs.length > 0) {
        setSubscription(subs[0]);
      }

      const words = await base44.entities.VocabularyWord.list();
      const unitMap = {};
      words.forEach(w => {
        if (!unitMap[w.unit_key]) unitMap[w.unit_key] = w.unit_name;
      });
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

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const isActive = subscription?.status === "active";

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100">
        <Header user={user} onLogout={handleLogout} role="O'qituvchi" />
        <div className="max-w-lg mx-auto px-4 py-10 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">O'qituvchi Paneli</h2>
          <Link to="/teacher">
            <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-base font-semibold">
              Nazorat Paneliga o'tish
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100">
        <Header user={user} onLogout={handleLogout} role="O'quvchi" />
        <PaywallScreen user={user} subscription={subscription} onSubmitted={loadData} />
      </div>
    );
  }

  const totalQuizzes = results.length;
  const totalCorrect = results.reduce((sum, r) => sum + (r.score || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100">
      <Header user={user} onLogout={handleLogout} role="O'quvchi" />
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-indigo-700 text-center mb-6">O'quvchi paneli</h2>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-indigo-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-indigo-700">{totalQuizzes}</p>
              <p className="text-xs text-slate-500 mt-1">Jami testlar</p>
            </div>
            <div className="flex-1 bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{totalCorrect}</p>
              <p className="text-xs text-slate-500 mt-1">To'g'ri javoblar</p>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Vocabulary Unitni tanlang:</label>
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
            <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-base font-semibold gap-2">
              <Play className="w-5 h-5" />
              Testni Boshlash (30 ta random)
            </Button>
          </Link>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Oxirgi natijalar</h3>
            <div className="space-y-3">
              {results.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.unit_name}</p>
                    <p className="text-xs text-slate-400">{r.date}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-emerald-600">{r.score}</span>
                    <span className="text-slate-400 text-sm">/ {r.total_questions || 30}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function Header({ user, onLogout, role }) {
  return (
    <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-indigo-600" />
        <span className="font-bold text-slate-800">Destination B1 Quiz</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">{role}</span>
        <span className="text-sm text-slate-600 hidden sm:inline">{user?.full_name || user?.email}</span>
        <button onClick={onLogout} className="text-slate-400 hover:text-slate-600 transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
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
        await base44.entities.StudentSubscription.update(subscription.id, {
          payment_ref: paymentRef,
          status: "pending"
        });
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-indigo-700 text-center mb-2">Obuna faol emas</h2>
        <p className="text-center text-sm text-slate-500 mb-6">
          Platformadan to'liq foydalanish uchun oylik to'lovni amalga oshiring.<br />
          <strong className="text-slate-700">Oylik obuna narxi: 18,999 so'm</strong>
        </p>

        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl p-5 text-white mb-6">
          <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">To'lov kartasi (Uzcard/Humo)</p>
          <p className="text-lg font-mono font-bold tracking-wider mb-3">8888 0133 9870 3481</p>
          <p className="text-sm opacity-90">Egasi: <strong>Temur Normatov Ulugbekovich</strong></p>
        </div>

        {submitted ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-amber-800 font-medium text-sm">To'lovingiz tizimga yuborildi. O'qituvchi tasdiqlaganidan so'ng platforma faollashadi.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">To'lov cheki raqami / Tranzaksiya ID:</label>
              <input
                type="text"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="Masalan: 45781223"
                className="w-full h-12 px-4 border-2 border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !paymentRef.trim()}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold"
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
    <footer className="mt-auto py-6 text-center text-xs text-slate-400">
      Created by <strong className="text-slate-600">Salohiddin Nurullaev & Temur Normatov</strong>
    </footer>
  );
}