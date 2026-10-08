import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@/index.css";
import Coach from "@/pages/Coach";
import CoachTodayCard from "@/components/coach/CoachTodayCard";
const start = new URLSearchParams(location.search).get("start") || "/coach";
try { localStorage.setItem("app_lang", new URLSearchParams(location.search).get("lang") || "en"); } catch {}
ReactDOM.createRoot(document.getElementById("root")).render(
  <MemoryRouter initialEntries={[start]}>
    <Routes>
      <Route path="/coach" element={<Coach />} />
      <Route path="/" element={<div id="home" className="max-w-xl mx-auto p-4"><CoachTodayCard /></div>} />
      <Route path="/pricing" element={<div id="pricing">PRICING</div>} />
    </Routes>
  </MemoryRouter>
);
