"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const SHELL_WIDTH = "max-w-[430px]";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  if (!open) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/60"
      />
      <div className="pointer-events-none fixed inset-0 z-[70] flex items-end justify-center">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          className={`pointer-events-auto w-full ${SHELL_WIDTH} rounded-t-[28px] bg-card p-6 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl`}
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="h-1 w-9 rounded-full bg-border" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <X size={15} />
            </button>
          </div>
          {children}
        </motion.div>
      </div>
    </>
  );
}
