import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@/index.css";
import Coach from "@/pages/Coach";
import CoachTodayCard from "@/components/coach/CoachTodayCard";
import PracticeRunner from "@/components/grammar/PracticeRunner";
import { loadTopic } from "@/lib/grammarPractice";
import { useGrammarCopy } from "@/lib/grammarCopy";

// Grammar round OUTSIDE and INSIDE Coach mode (regression check D).
function PracticeHarness() {
  const mode = new URLSearchParams(location.search).get("mode") || "plain";
  const c = useGrammarCopy();
  const [items, setItems] = React.useState(null);
  const [ended, setEnded] = React.useState(null);
  React.useEffect(() => { loadTopic("tenses", "present", "simple-routine").then(setItems); }, []);
  if (!items) return <div>loading</div>;
  if (ended) return <div id="ended">{ended}</div>;
  return (
    <div className="max-w-xl mx-auto p-4">
      {mode === "coach"
        ? <PracticeRunner items={items} stage="choose" topicKey="tenses.present.simple-routine" size={3} c={c} coachSessionKey="2026-10-08:today:0"
            onFinish={() => setEnded("finish")} onExit={() => setEnded("exit")} />
        : <PracticeRunner items={items} stage="choose" topicKey="tenses.present.simple-routine" c={c}
            onAgain={() => setEnded("again")} onExit={() => setEnded("exit")} />}
    </div>);
}
const start = new URLSearchParams(location.search).get("start") || "/coach";
try { localStorage.setItem("app_lang", new URLSearchParams(location.search).get("lang") || "en"); } catch {}
ReactDOM.createRoot(document.getElementById("root")).render(
  <MemoryRouter initialEntries={[start]}>
    <Routes>
      <Route path="/coach" element={<Coach />} />
      <Route path="/" element={<div id="home" className="max-w-xl mx-auto p-4"><CoachTodayCard /></div>} />
      <Route path="/pricing" element={<div id="pricing">PRICING</div>} />
      <Route path="/practice" element={<PracticeHarness />} />
    </Routes>
  </MemoryRouter>
);
