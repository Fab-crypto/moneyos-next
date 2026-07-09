"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  layoutGroup?: string;
}

export function Chip({ label, active, onClick, layoutGroup = "chip" }: ChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className="relative shrink-0 rounded-full px-4 py-2 text-[13px] font-medium"
    >
      {active && (
        <motion.span
          layoutId={`${layoutGroup}-active`}
          className="absolute inset-0 rounded-full bg-foreground"
          transition={{ duration: 0.25, ease: EASE }}
        />
      )}
      <span className={`relative z-10 ${active ? "text-background" : "text-muted-foreground"}`}>
        {label}
      </span>
      {!active && <span className="absolute inset-0 rounded-full bg-muted" />}
    </motion.button>
  );
}
