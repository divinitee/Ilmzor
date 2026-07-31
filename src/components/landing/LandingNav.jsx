import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? "bg-white/80 backdrop-blur-md border-b border-slate-200" : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/landing" className="flex items-center gap-2 select-none">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">VocabApp</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-7 text-sm font-medium text-slate-600">
          <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it works</a>
          <a href="#interests" className="hover:text-blue-600 transition-colors">Topics</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden sm:inline-block text-sm font-medium text-slate-600 hover:text-blue-600 px-3 py-2 transition-colors">
            Log in
          </Link>
          <Link to="/register">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">Start for free</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}