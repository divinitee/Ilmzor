import React from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">VocabApp</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-slate-500">
          <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it works</a>
          <a href="#interests" className="hover:text-blue-600 transition-colors">Topics</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
          <Link to="/login" className="hover:text-blue-600 transition-colors">Log in</Link>
        </nav>
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} VocabApp</p>
      </div>
    </footer>
  );
}