import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, LayoutDashboard, Users, GraduationCap, Network, Wallet, ShieldCheck, LogOut, Home as HomeIcon } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { consoleApi, getConsoleToken, clearConsoleToken, errorText } from "@/lib/consoleApi";
import ConsoleGate, { Shell, Refused } from "@/components/console/ConsoleGate";
import OverviewSection from "@/components/console/OverviewSection";
import SecuritySection from "@/components/console/SecuritySection";
import StudentsSection from "@/components/console/StudentsSection";

// /console: one admin page for students, teachers, groups and payments
// (VT-35). Sign-in = VIRORA login + authenticator code; enforced on the
// server by base44/functions/adminApi on every call. Nothing on this page
// talks to the entity SDK directly.
//
// P1: Overview + Security. P2a: Students. Teachers / Groups follow in P2b/c
// and Payments in P3; until then their tabs point at the existing pages.

const SECTIONS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "students", label: "Students", icon: Users },
  { key: "teachers", label: "Teachers", icon: GraduationCap, phase: "P2", legacy: "/admin" },
  { key: "groups", label: "Groups", icon: Network, phase: "P2", legacy: "/teacher" },
  { key: "payments", label: "Payments", icon: Wallet, phase: "P3", legacy: "/admin-qr-payments" },
  { key: "security", label: "Security", icon: ShieldCheck },
];

function readSection() {
  const h = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
  return SECTIONS.some((s) => s.key === h) ? h : "overview";
}

function ComingSoon({ section }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 p-8 text-center">
      <section.icon className="mb-3 h-8 w-8 text-white/40" />
      <h2 className="text-lg font-semibold">{section.label} moves here in {section.phase}</h2>
      <p className="mt-1 max-w-sm text-sm text-white/60">Until then, use the existing page.</p>
      <Link to={section.legacy} className="mt-4 rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5 select-none">Open {section.legacy}</Link>
    </div>
  );
}

function ConsoleShell({ user, onSignOut, onSessionLost }) {
  const [section, setSection] = useState(readSection);
  const go = (key) => { setSection(key); try { window.history.replaceState(null, "", `#${key}`); } catch { /* ignore */ } };
  const current = SECTIONS.find((s) => s.key === section);

  return (
    <div className="min-h-screen bg-[#0B0C1E] text-white">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-white/10 bg-[#0E0F26] md:flex">
        <div className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">VIRORA</p>
          <p className="text-lg font-bold">Console</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => go(s.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm select-none ${section === s.key ? "bg-violet-600/25 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
              <s.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{s.label}</span>
              {s.phase && <span className="rounded bg-white/10 px-1.5 text-[10px] text-white/50">{s.phase}</span>}
            </button>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/10 p-3">
          <p className="truncate px-3 pb-1 text-xs text-white/40">{user?.email}</p>
          <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/60 hover:bg-white/5 select-none"><HomeIcon className="h-4 w-4" /> Back to VIRORA</Link>
          <button onClick={onSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/60 hover:bg-white/5 select-none"><LogOut className="h-4 w-4" /> Lock console</button>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0B0C1E]/95 px-4 py-3 backdrop-blur md:hidden">
        <p className="font-bold">VIRORA <span className="text-violet-300">Console</span></p>
        <button onClick={onSignOut} className="flex items-center gap-1 text-sm text-white/60 select-none"><LogOut className="h-4 w-4" /> Lock</button>
      </header>

      <main className="px-4 pb-28 pt-5 md:ml-60 md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-5xl">
          {section === "overview" && <OverviewSection onSessionLost={onSessionLost} />}
          {section === "security" && <SecuritySection onSessionLost={onSessionLost} />}
          {section === "students" && <StudentsSection onSessionLost={onSessionLost} />}
          {current?.phase && <ComingSoon section={current} />}
        </div>
      </main>

      {/* mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-6 border-t border-white/10 bg-[#0E0F26] pb-[env(safe-area-inset-bottom)] md:hidden">
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => go(s.key)}
            className={`flex flex-col items-center gap-1 py-2 text-[10px] select-none ${section === s.key ? "text-violet-300" : "text-white/50"}`}>
            <s.icon className="h-5 w-5" />
            {s.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function Console() {
  const { user } = useAuth();
  // null = checking, false = needs the code screen, true = signed in
  const [signedIn, setSignedIn] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!getConsoleToken()) { setSignedIn(false); return; }
    consoleApi("ping").then(() => setSignedIn(true)).catch(() => { clearConsoleToken(); setSignedIn(false); });
  }, []);

  const onSessionLost = useCallback((e) => {
    clearConsoleToken();
    setNotice(e?.code ? errorText(e) : null);
    setSignedIn(false);
  }, []);

  const lock = () => { clearConsoleToken(); setNotice(null); setSignedIn(false); };

  // The real check is on the server; this only avoids showing a useless
  // screen to students who type the URL.
  if (user && user.role !== "admin") return <Shell><Refused error={{ code: "forbidden" }} /></Shell>;
  if (signedIn === null) return <Shell><Loader2 className="h-6 w-6 animate-spin text-violet-300" /></Shell>;
  if (!signedIn) {
    return (
      <>
        {notice && <div className="fixed inset-x-0 top-0 z-20 bg-amber-500/90 px-4 py-2 text-center text-sm text-black">{notice}</div>}
        <ConsoleGate onSignedIn={() => { setNotice(null); setSignedIn(true); }} />
      </>
    );
  }
  return <ConsoleShell user={user} onSignOut={lock} onSessionLost={onSessionLost} />;
}
