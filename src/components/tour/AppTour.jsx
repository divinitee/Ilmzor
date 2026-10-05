import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { TOUR_COPY } from "./tourCopy";

// First-run walkthrough of the student app (Tee, 2026-10-05: "not a lot of
// people are able to navigate the UI easily and may be missing features").
//
// - Shown once per account per browser, automatically, to every student
//   (new and existing). Bump TOUR_VERSION to show a revised tour again.
// - Replayable from Settings and from the floating Help button.
// - Steps point at elements tagged with data-tour="..."; a step whose
//   element isn't on screen falls back to a centred card, so a missing tag
//   degrades the step rather than breaking the tour.
// - Each step names the Home tab it lives on; the tour switches tabs so the
//   student sees the real screen behind the spotlight.

export const TOUR_VERSION = "v1";
export const START_TOUR_EVENT = "virora:start-tour";
const doneKey = (email) => `virora_tour_${TOUR_VERSION}_done_${email || "anon"}`;

export function hasSeenTour(email) {
  try { return localStorage.getItem(doneKey(email)) === "1"; } catch { return true; }
}
function markTourSeen(email) {
  try { localStorage.setItem(doneKey(email), "1"); } catch { /* private mode */ }
}
export function startAppTour() {
  window.dispatchEvent(new Event(START_TOUR_EVENT));
}

const STEPS = [
  { id: "welcome", tab: "home" },
  { id: "home", tab: "home", target: "nav-home" },
  { id: "missions", tab: "home", target: "missions" },
  { id: "skillhub", tab: "skillhub", target: "nav-skillhub" },
  { id: "stage", tab: "skillhub", target: "skill-stage" },
  { id: "toolbar", tab: "skillhub", target: "hub-toolbar" },
  { id: "deep", tab: "deep", target: "nav-deep" },
  { id: "settings", tab: "settings", target: "nav-settings" },
  { id: "help", tab: "home", target: "help-button" },
  { id: "done", tab: "home" },
];

const PAD = 8;
const GAP = 14;
const EDGE = 16;
const CARD_W = 360;

function findTarget(name) {
  if (!name) return null;
  const el = document.querySelector(`[data-tour="${name}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return el;
}

export default function AppTour({ user, activeTab, onNavigate, autoStart = true }) {
  const { lang } = useAppLang();
  const c = TOUR_COPY[lang] || TOUR_COPY.en;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const cardRef = useRef(null);
  const [cardH, setCardH] = useState(180);

  const step = STEPS[index];
  const copy = c.steps[step.id];
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  // Auto-start once for anyone who hasn't seen this version of the tour.
  useEffect(() => {
    if (!autoStart || !user?.email || hasSeenTour(user.email)) return;
    const timer = window.setTimeout(() => { setIndex(0); setOpen(true); }, 1200);
    return () => window.clearTimeout(timer);
  }, [autoStart, user?.email]);

  // Manual replay (Settings row, Help dialog).
  useEffect(() => {
    const start = () => { setIndex(0); setOpen(true); };
    window.addEventListener(START_TOUR_EVENT, start);
    return () => window.removeEventListener(START_TOUR_EVENT, start);
  }, []);

  const close = useCallback(() => {
    markTourSeen(user?.email);
    setOpen(false);
    setRect(null);
    onNavigate?.("home");
  }, [user?.email, onNavigate]);

  // Put the right tab behind the step.
  useEffect(() => {
    if (!open) return;
    if (step.tab && step.tab !== activeTab) onNavigate?.(step.tab);
    // activeTab deliberately omitted: only switch when the step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  // Track the target element. Polled because tabs mount and animate in, and
  // the Skill Hub stage moves while it settles.
  useEffect(() => {
    if (!open) return;
    setRect(null);
    if (!step.target) return;
    let scrolled = false;
    const tick = () => {
      const el = findTarget(step.target);
      if (!el) { setRect(null); return; }
      if (!scrolled) {
        scrolled = true;
        const r0 = el.getBoundingClientRect();
        if (r0.top < 60 || r0.bottom > window.innerHeight - 80) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }
      const r = el.getBoundingClientRect();
      setRect((prev) =>
        prev && Math.abs(prev.top - r.top) < 0.5 && Math.abs(prev.left - r.left) < 0.5 &&
        Math.abs(prev.width - r.width) < 0.5 && Math.abs(prev.height - r.height) < 0.5
          ? prev
          : { top: r.top, left: r.left, width: r.width, height: r.height }
      );
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [open, index, step.target]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, STEPS.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [open, index, lang, rect]);

  if (!open) return null;

  const next = () => (isLast ? close() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));

  // Card placement: below the target if it fits, else above, else pinned
  // near the bottom (very tall targets like the skill tree).
  const cardW = Math.min(CARD_W, vp.w - EDGE * 2);
  let cardStyle;
  if (!rect) {
    cardStyle = { width: cardW, left: (vp.w - cardW) / 2, top: Math.max(EDGE, (vp.h - cardH) / 2) };
  } else {
    const spotTop = rect.top - PAD;
    const spotBottom = rect.top + rect.height + PAD;
    const centerX = rect.left + rect.width / 2;
    const left = Math.min(Math.max(centerX - cardW / 2, EDGE), vp.w - cardW - EDGE);
    let top;
    if (spotBottom + GAP + cardH <= vp.h - EDGE) top = spotBottom + GAP;
    else if (spotTop - GAP - cardH >= EDGE) top = spotTop - GAP - cardH;
    else top = Math.max(EDGE, vp.h - cardH - 96);
    cardStyle = { width: cardW, left, top };
  }

  const counter = c.counter.replace("{n}", String(index + 1)).replace("{total}", String(STEPS.length));

  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="app-tour-title">
      {/* Dim layer. With a target, the spotlight's huge shadow does the
          dimming so the target stays bright; without one, a plain scrim. */}
      {rect ? (
        <motion.div
          className="absolute rounded-2xl pointer-events-none"
          initial={false}
          animate={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          style={{
            boxShadow: "0 0 0 9999px rgba(6,3,18,0.74), 0 0 0 2px rgba(167,139,250,0.9), 0 0 28px 4px rgba(167,139,250,0.45)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(6,3,18,0.74)] backdrop-blur-[2px]" />
      )}

      {/* Click shield: the tour is driven by its own buttons. */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          ref={cardRef}
          className="absolute rounded-2xl border border-primary/30 bg-background shadow-2xl p-5"
          style={cardStyle}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            onClick={close}
            aria-label={c.skip}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{counter}</p>
          <h2 id="app-tour-title" className="mt-1 pr-6 text-lg font-bold text-foreground tracking-tight">{copy.title}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{copy.body}</p>

          <div className="mt-3 flex gap-1" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1 rounded-full transition-all ${i === index ? "w-5 bg-primary" : i < index ? "w-2 bg-primary/50" : "w-2 bg-muted"}`}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            {isFirst || isLast ? (
              isFirst ? (
                <button type="button" onClick={close} className="text-xs font-semibold text-muted-foreground hover:text-foreground select-none">
                  {c.skip}
                </button>
              ) : <span />
            ) : (
              <button type="button" onClick={back} className="h-9 px-3 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors select-none">
                {c.back}
              </button>
            )}
            <button
              type="button"
              onClick={next}
              autoFocus
              className="h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors select-none"
            >
              {isLast ? c.finish : c.next}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
