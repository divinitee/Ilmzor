import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { LAUNCH_DATE, LAUNCH_END, LAUNCH_START } from "@/lib/appMeta";

const isLaunchWindow = () => {
  const now = new Date();
  return now >= new Date(LAUNCH_START) && now <= new Date(LAUNCH_END);
};

export default function LaunchExperience({ user }) {
  const [showWelcome, setShowWelcome] = useState(false);
  const [launchActive, setLaunchActive] = useState(false);

  useEffect(() => {
    setLaunchActive(isLaunchWindow());
    if (!user?.email || !isLaunchWindow()) return;

    const key = `virora_launch_welcome_seen_${user.email}`;
    if (localStorage.getItem(key) !== "1") {
      const timer = window.setTimeout(() => setShowWelcome(true), 700);
      return () => window.clearTimeout(timer);
    }
  }, [user?.email]);

  const dismissWelcome = () => {
    if (user?.email) {
      localStorage.setItem(`virora_launch_welcome_seen_${user.email}`, "1");
    }
    setShowWelcome(false);
  };

  return (
    <>
      {launchActive && (
        <div className="relative z-[45] border-b border-primary/20 bg-primary/[0.07] text-primary">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.16em] text-center">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            LAUNCH DAY · VIRORA IS OFFICIALLY LIVE · {LAUNCH_DATE}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showWelcome && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissWelcome}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="launch-welcome-title"
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/20 bg-background shadow-2xl"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={dismissWelcome}
                aria-label="Close"
                className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="px-7 pt-8 pb-7 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="w-7 h-7" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">First Public Release</p>
                <h2 id="launch-welcome-title" className="mt-2 text-3xl font-bold tracking-tight text-foreground">VIRORA IS NOW LIVE</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Welcome to the first public release of VIRORA. You are here at the beginning.
                </p>
                <div className="mt-5 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                  September 14, 2026 · The beginning of VIRORA
                </div>
                <button
                  onClick={dismissWelcome}
                  className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
                >
                  Enter VIRORA <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
