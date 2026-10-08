import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Map as MapIcon, Play, RotateCw, Sparkles, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { coachApi } from "@/lib/serverApi";
import { useAuth } from "@/lib/AuthContext";
import { useAppLang } from "@/hooks/useAppLang";
import { useGrammarCopy } from "@/lib/grammarCopy";
import { loadTopic } from "@/lib/grammarPractice";
import { submitEvidence } from "@/lib/progress/progressClient";
import { generateRoundId } from "@/lib/gameScoring";
import { coachT, labelKey, reasonKey, COACH_NAMES, COACH_COLORS } from "@/lib/coach/coachCopy";
import { buildWordQuestions, evidenceItem, grammarPath, stageForDepth } from "@/lib/coach/wordCheck";
import CoachWordCheck from "@/components/coach/CoachWordCheck";
import PracticeRunner from "@/components/grammar/PracticeRunner";

// VIRORA Coach (VT-40 Stage 3). One screen, five states:
//   handoff (entitlement changed) -> onboarding (goal + minutes) -> today's plan
//   -> session (runs the plan's items in order) -> done (Keep going if allowed).
// The browser never decides WHAT to practise: it renders coachApi.getToday and
// submits answers through progressApi.submitEvidence with coach.session_key.

const humanTopic = (key) => String(key || "").replace(/^grammar:/, "").split(".").pop().replace(/-/g, " ");

function Orb({ color, size = 56 }) {
  return (
    <motion.div aria-hidden="true" className="rounded-full shrink-0"
      style={{ width: size, height: size, background: `radial-gradient(circle at 30% 30%, #fff8, ${color} 45%, #0006)`, boxShadow: `0 0 32px ${color}66` }}
      animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
  );
}

function Shell({ children, onBack, right }) {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b border-border px-4 pb-3 flex items-center justify-between safe-header sticky top-0 z-30">
        <button onClick={onBack} className="neo-pill p-2 select-none" aria-label="Back"><ArrowLeft className="w-4 h-4" /></button>
        {right}
      </header>
      <div className="max-w-xl mx-auto px-4 pt-6 pb-16">{children}</div>
    </div>
  );
}

export default function Coach() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useAppLang();
  const gc = useGrammarCopy();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [view, setView] = useState("plan"); // plan | run | done | map
  const [busy, setBusy] = useState(false);

  // No session_no: the SERVER decides which session is active (today or the
  // latest "Keep going"). The client never decides continuation allowance.
  const load = useCallback(async () => {
    setErr(null);
    try { const d = await coachApi("getToday", {}); setData(d); return d; }
    catch (e) { setErr(e?.code || "error"); return null; }
  }, []);
  useEffect(() => { load(); }, [load]);

  const persona = data?.coach?.persona || "vira";
  const color = COACH_COLORS[persona];
  const t = coachT(lang, persona);
  const back = () => (view === "plan" ? navigate("/") : setView("plan"));
  const mapBtn = data && view !== "map" ? (
    <button onClick={() => setView("map")} className="neo-pill px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 select-none">
      <MapIcon className="w-3.5 h-3.5" /> {t("map_title")}
    </button>) : null;

  if (err) return (
    <Shell onBack={() => navigate("/")}><div className="premium-card rounded-[28px] p-8 text-center">
      <p className="text-sm text-muted-foreground">{t("error")}</p>
      <button onClick={() => load()} className="neo-pill mt-4 px-5 py-2 text-sm font-semibold">{t("retry")}</button>
    </div></Shell>);
  if (!data) return (
    <Shell onBack={() => navigate("/")}><div className="premium-card rounded-[28px] p-10 text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
      <p className="text-sm text-muted-foreground mt-3">{t("loading")}</p>
    </div></Shell>);

  // 1. Handoff: only on a real entitlement change (server decides).
  if (data.handoff) {
    const down = ["learner", "vip", "trial"].includes(data.handoff.from) && data.coach.entitlement === "free";
    return (
      <Shell onBack={() => navigate("/")}>
        <div className="premium-card rounded-[28px] p-8 text-center">
          <div className="flex justify-center mb-4"><Orb color={color} size={72} /></div>
          <h1 className="text-xl font-bold text-foreground">{t(down ? "handoff_down" : "handoff_up", { to: COACH_NAMES[data.coach.coach] || COACH_NAMES[persona] })}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("hello", { n: data.settings.minutes })}</p>
          <button disabled={busy} onClick={async () => { setBusy(true); try { await coachApi("ackHandoff", {}); await load(); } finally { setBusy(false); } }}
            className="mt-6 w-full h-12 rounded-2xl font-semibold text-white" style={{ background: color }}>{t("handoff_ok")}</button>
        </div>
      </Shell>);
  }

  // 2. Onboarding: goal + minutes (only the options this coach offers).
  if (!data.settings.onboarded) return <Onboarding data={data} t={t} color={color} onDone={() => load()} onBack={() => navigate("/")} />;

  if (view === "map") return <Shell onBack={back}><LearnerMap t={t} color={color} /></Shell>;

  if (view === "run") return (
    <Shell onBack={back}>
      <Session data={data} t={t} gc={gc} color={color} lang={lang} email={user?.email}
        onFinished={async () => { await load(); setView("done"); }} />
    </Shell>);

  const items = data.plan.items || [];
  const continuation = data.continuation || {};
  const upsell = (data.coach.entitlement === "free" || data.coach.entitlement === "trial") && persona === "vira";
  const keepGoing = async () => {
    setBusy(true);
    try { const d = await coachApi("startContinuation", {}); setData(d); setView("run"); }
    catch { await load(); }
    finally { setBusy(false); }
  };

  // 3. Done (finished everything planned today, or just finished a session).
  if (view === "done" || (!items.length && data.done_today > 0)) return (
    <Shell onBack={() => navigate("/")} right={mapBtn}>
      <div className="premium-card rounded-[28px] p-8 text-center">
        <div className="flex justify-center mb-4"><Orb color={color} size={64} /></div>
        <h1 className="text-xl font-bold text-foreground">{t("done_title")}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t("done_sub")}</p>
        {continuation.available ? (
          <button disabled={busy} onClick={keepGoing} className="mt-6 w-full h-12 rounded-2xl font-semibold text-white flex items-center justify-center gap-2" style={{ background: color }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />} {t("keep_going")}
          </button>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mt-5">{t("no_more_today")}</p>
            {upsell && <Link to="/pricing" className="block mt-4 text-sm font-semibold underline underline-offset-4" style={{ color: COACH_COLORS.velvet }}>{t("upsell")}</Link>}
          </>
        )}
        {continuation.available && <p className="text-[11px] text-muted-foreground mt-2">{t("keep_going_sub")}</p>}
        <button onClick={() => navigate("/")} className="neo-pill mt-5 px-5 py-2 text-sm font-semibold">{t("back_home")}</button>
      </div>
    </Shell>);

  // 4. Nothing actionable (fallback chain ended with no items).
  if (!items.length) return (
    <Shell onBack={() => navigate("/")} right={mapBtn}>
      <div className="premium-card rounded-[28px] p-8 text-center">
        <div className="flex justify-center mb-4"><Orb color={color} /></div>
        <h1 className="text-xl font-bold text-foreground">{t("nothing_title")}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t("nothing_sub")}</p>
        <button onClick={() => navigate("/")} className="mt-6 w-full h-12 rounded-2xl font-semibold text-white" style={{ background: color }}>{t("free_practice")}</button>
      </div>
    </Shell>);

  // 5. Today's plan.
  return (
    <Shell onBack={() => navigate("/")} right={mapBtn}>
      <div className="flex items-start gap-4 mb-5">
        <Orb color={color} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{COACH_NAMES[persona]}</p>
          <p className="text-sm text-foreground mt-1">{t("hello", { n: data.plan.minutes })}</p>
        </div>
      </div>
      <div className="premium-card rounded-[28px] p-5">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-foreground">{data.session.kind === "continuation" ? t("keep_going") : t("today_title")}</h1>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{t("min", { n: data.plan.minutes_planned })}</span>
        </div>
        <ul className="divide-y divide-white/5">
          {items.map((it) => (
            <li key={it.item_key} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{it.item_type === "grammar" ? humanTopic(it.item_key) : <WordName id={it.word_id} />}</p>
                <p className="text-[11px] text-muted-foreground">{it.item_type === "grammar" ? t("grammar_check") : t("word_check")} · {t("min", { n: it.est_minutes })}</p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-1 bg-white/5 text-foreground/80 shrink-0">{t(reasonKey(it.short_reason))}</span>
            </li>
          ))}
        </ul>
        <button onClick={() => setView("run")} className="mt-4 w-full h-12 rounded-2xl font-semibold text-white flex items-center justify-center gap-2" style={{ background: color }}>
          <Play className="w-4 h-4" /> {t("start")}
        </button>
      </div>
    </Shell>);
}

// Word names for the plan list (cached per page load).
const wordCache = new Map();
async function fetchWords(ids) {
  const missing = [...new Set(ids)].filter((id) => id && !wordCache.has(id));
  if (missing.length) {
    const rows = (await base44.entities.VocabularyWord.filter({ id: { $in: missing } }, "english", missing.length)) || [];
    for (const w of rows) wordCache.set(w.id, w);
  }
  return ids.map((id) => wordCache.get(id)).filter(Boolean);
}
function WordName({ id }) {
  const [w, setW] = useState(wordCache.get(id) || null);
  useEffect(() => { if (!w && id) fetchWords([id]).then((r) => setW(r[0] || null)).catch(() => {}); }, [id, w]);
  return <>{w?.english || "…"}</>;
}

function Onboarding({ data, t, color, onDone, onBack }) {
  const goals = (data.settings.goals || []).filter((g) => g && g.id);
  const [goal, setGoal] = useState(data.settings.goal_id || goals[0]?.id);
  const [minutes, setMinutes] = useState(data.settings.minutes);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await coachApi("saveProfile", { goal_id: goal, daily_minutes: minutes, onboarded: true }); await onDone(); }
    finally { setBusy(false); }
  };
  return (
    <Shell onBack={onBack}>
      <div className="premium-card rounded-[28px] p-6">
        <div className="flex items-center gap-4 mb-4"><Orb color={color} /><h1 className="text-xl font-bold text-foreground">{t("onboarding_title")}</h1></div>
        <p className="text-sm text-foreground">{t("hello", { n: data.settings.minutes })}</p>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-6 mb-2">{t("onboarding_goal")}</p>
        <div className="grid gap-2">
          {goals.map((g) => (
            <button key={g.id} onClick={() => setGoal(g.id)}
              className={`text-left px-4 py-3 rounded-2xl border text-sm select-none ${goal === g.id ? "border-white/40 bg-white/10" : "border-white/10 bg-white/[0.03]"}`}>{g.objective}</button>
          ))}
        </div>
        {data.settings.minutesOptions?.length > 1 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-6 mb-2">{t("onboarding_minutes")}</p>
            <div className="flex gap-2">
              {data.settings.minutesOptions.map((m) => (
                <button key={m} onClick={() => setMinutes(m)}
                  className={`flex-1 h-11 rounded-2xl border text-sm font-semibold select-none ${minutes === m ? "border-white/40 bg-white/10" : "border-white/10"}`}>{t("min", { n: m })}</button>
              ))}
            </div>
          </>
        )}
        <button disabled={busy || !goal} onClick={save} className="mt-6 w-full h-12 rounded-2xl font-semibold text-white flex items-center justify-center gap-2" style={{ background: color }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {t("onboarding_go")}
        </button>
      </div>
    </Shell>);
}

// Runs the plan's items in order. Word answers are batched and sent as ONE
// server-graded "quiz" round when the session moves to grammar or ends.
function Session({ data, t, gc, color, lang, email, onFinished }) {
  const items = data.plan.items || [];
  const sessionKey = data.session.session_key;
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(null); // { kind, word?, questions?, grammarItems?, stage?, topicKey? }
  const pending = useRef([]);
  const pool = useRef(null);

  const flush = useCallback(async () => {
    const batch = pending.current.splice(0);
    if (batch.length && email) await submitEvidence(email, { game: "quiz", round_id: generateRoundId(), items: batch.slice(0, 50), coach: { session_key: sessionKey } });
  }, [email, sessionKey]);

  const advance = useCallback(() => setIdx((i) => i + 1), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const it = items[idx];
      if (!it) { await flush(); onFinished(); return; }
      setReady(null);
      if (it.item_type === "word") {
        if (!pool.current) {
          const ids = items.filter((x) => x.item_type === "word").map((x) => x.word_id);
          await fetchWords(ids);
          const extra = (await base44.entities.VocabularyWord.filter({}, "english", 60).catch(() => [])) || [];
          pool.current = [...ids.map((id) => wordCache.get(id)).filter(Boolean), ...extra];
        }
        const word = wordCache.get(it.word_id);
        const questions = word ? buildWordQuestions(word, pool.current, { depth: it.depth, lang }) : [];
        if (!alive) return;
        if (!questions.length) { advance(); return; } // no usable translation: skip, never fake evidence
        setReady({ kind: "word", word, questions });
      } else {
        await flush();
        const path = grammarPath(it.item_key);
        const bank = path ? await loadTopic(...path) : [];
        if (!alive) return;
        if (!bank.length) { advance(); return; }
        setReady({ kind: "grammar", grammarItems: bank, stage: stageForDepth(it.depth), topicKey: path.join("."), size: Math.max(3, Math.min(10, it.questions || 5)) });
      }
    })();
    return () => { alive = false; };
  }, [idx]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">{t("item_of", { i: Math.min(idx + 1, items.length), n: items.length })}</p>
        <span className="text-xs text-muted-foreground">{data.session.kind === "continuation" ? t("keep_going") : t("today_title")}</span>
      </div>
      <div className="h-1 rounded-full bg-white/10 mb-5 overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: color }} animate={{ width: `${(idx / Math.max(1, items.length)) * 100}%` }} />
      </div>
      {!ready ? (
        <div className="premium-card rounded-[28px] p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color }} /></div>
      ) : ready.kind === "word" ? (
        <CoachWordCheck key={`w${idx}`} word={ready.word} questions={ready.questions} color={color} t={t}
          onAnswer={(w, q, given) => pending.current.push(evidenceItem(w, q, given))} onDone={advance} />
      ) : (
        <PracticeRunner key={`g${idx}`} items={ready.grammarItems} stage={ready.stage} topicKey={ready.topicKey} size={ready.size}
          c={gc} coachSessionKey={sessionKey} onExit={advance} />
      )}
    </div>
  );
}

function LearnerMap({ t, color }) {
  const [map, setMap] = useState(null);
  const [names, setNames] = useState({});
  useEffect(() => {
    coachApi("getMap", {}).then(async (m) => {
      setMap(m);
      const ws = await fetchWords((m.words || []).slice(0, 200).map((w) => w.word_id)).catch(() => []);
      setNames(Object.fromEntries(ws.map((w) => [w.id, w.english])));
    }).catch(() => setMap({ grammar: [], words: [], counts: {} }));
  }, []);
  if (!map) return <div className="premium-card rounded-[28px] p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color }} /></div>;
  const order = ["Needs work", "Practising", "New", "Strong"];
  const all = [...(map.grammar || []), ...(map.words || [])];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">{t("map_title")}</h1>
      <div className="grid grid-cols-4 gap-2">
        {order.map((l) => (
          <div key={l} className="premium-card rounded-2xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{map.counts?.[l] || 0}</p>
            <p className="text-[10px] text-muted-foreground">{t(labelKey(l))}</p>
          </div>
        ))}
      </div>
      {!all.length && <p className="text-sm text-muted-foreground text-center py-6">{t("map_empty")}</p>}
      {order.map((l) => {
        const rows = all.filter((i) => i.label === l);
        if (!rows.length) return null;
        return (
          <div key={l} className="premium-card rounded-[24px] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t(labelKey(l))}</p>
            <div className="flex flex-wrap gap-1.5">
              {rows.slice(0, 60).map((i) => (
                <span key={i.item_key} className="text-xs rounded-full px-2.5 py-1 bg-white/5 text-foreground">
                  {i.item_type === "grammar" ? humanTopic(i.item_key) : names[i.word_id] || "…"}
                </span>
              ))}
            </div>
          </div>);
      })}
    </div>);
}
