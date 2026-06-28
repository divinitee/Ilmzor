import React from "react";
import { CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UnitDrawer({ open, onClose, units, selectedUnit, onSelect }) {
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
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-4" />
            <h3 className="text-base font-bold text-foreground px-5 mb-3">Unit tanlang</h3>
            <div className="divide-y divide-border">
              {units.map(u => (
                <button
                  key={u.key}
                  onClick={() => { onSelect(u.key); onClose(); }}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors select-none"
                >
                  <span className={`text-sm font-medium ${selectedUnit === u.key ? "text-primary" : "text-foreground"}`}>
                    {u.name}
                  </span>
                  {selectedUnit === u.key && <CheckCircle className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}