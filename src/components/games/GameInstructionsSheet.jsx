import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import InstructionsContent from "@/components/games/InstructionsContent";
import { Button } from "@/components/ui/button";
import { useAppLang } from "@/hooks/useAppLang";

export default function GameInstructionsSheet({ gameId, open, onClose, onStart }) {
  const { t } = useAppLang();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-3" />
            <div className="px-4 pb-4">
              <InstructionsContent gameId={gameId} defaultOpen={true} />
              {onStart && (
                <Button onClick={onStart} className="w-full mt-2 select-none">{t("games.lets_play")}</Button>
              )}
              <Button variant="outline" onClick={onClose} className="w-full mt-2 select-none">{t("common.back")}</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}