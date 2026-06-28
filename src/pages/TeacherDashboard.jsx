import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, CheckCircle, Clock, Users, Trophy } from "lucide-react";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      if (me.role !== "admin") {
        navigate("/");
        return;
      }
      const subs = await base44.entities.StudentSubscription.list('-created_date', 50);
      setSubscriptions(subs);
      const res = await base44.entities.QuizResult.list('-created_date', 50);
      setResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (sub) => {
    await base44.entities.StudentSubscription.update(sub.id, { status: "active" });
    setNotification(`O'quvchi "${sub.student_name}" (${sub.phone}) obunasi tasdiqlandi!`);
    loadData();
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

  const activeCount = subscriptions.filter(s => s.status === "active").length;
  const pendingCount = subscriptions.filter(s => s.status === "pending").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100">
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <span className="font-bold text-slate-800">Destination B1 Quiz</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">O'qituvchi</span>
          <span className="text-sm text-slate-600 hidden sm:inline">{user?.email}</span>
          <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-bold text-slate-800">O'qituvchi Nazorat Paneli</h2>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
            <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-slate-800">{subscriptions.length}</p>
            <p className="text-xs text-slate-400">Jami o'quvchi</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-emerald-600">{activeCount}</p>
            <p className="text-xs text-slate-400">Faol</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
            <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-slate-400">Kutilmoqda</p>
          </div>
        </div>

        {notification && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 font-medium">
            {notification}
          </div>
        )}

        {/* Subscriptions */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Obuna va To'lovlar</h3>
          </div>
          {subscriptions.length === 0 ? (
            <p className="p-5 text-sm text-slate-400 text-center">Hozircha o'quvchi yo'q</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase">O'quvchi</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase">Chek ID</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase">Harakat</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map(sub => (
                    <tr key={sub.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-slate-800">{sub.student_name}</td>
                      <td className="px-5 py-3 text-slate-500">{sub.phone}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-xs">{sub.payment_ref || "—"}</td>
                      <td className="px-5 py-3">
                        {sub.status === "active" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Faol
                          </span>
                        ) : sub.status === "pending" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                            <Clock className="w-3 h-3" /> Kutilmoqda
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Faol emas</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {sub.status !== "active" ? (
                          <Button
                            size="sm"
                            onClick={() => handleAccept(sub)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8"
                          >
                            Tasdiqlash
                          </Button>
                        ) : (
                          <span className="text-emerald-500 text-xs font-medium">✓ Tasdiqlangan</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">O'quvchilar Test Natijalari</h3>
          </div>
          {results.length === 0 ? (
            <p className="p-5 text-sm text-slate-400 text-center">Natijalar topilmadi</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase">O'quvchi</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase">Unit</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase">Natija</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase">Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-slate-800">{r.student_name}</td>
                      <td className="px-5 py-3 text-slate-500">{r.student_phone}</td>
                      <td className="px-5 py-3 text-slate-600">{r.unit_name}</td>
                      <td className="px-5 py-3">
                        <span className="font-bold text-emerald-600">{r.score}</span>
                        <span className="text-slate-400"> / {r.total_questions || 30}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Button onClick={handleLogout} variant="outline" className="w-full h-10">
          Chiqish
        </Button>
      </div>

      <footer className="py-6 text-center text-xs text-slate-400">
        Created by <strong className="text-slate-600">Salohiddin Nurullaev & Temur Normatov</strong>
      </footer>
    </div>
  );
}