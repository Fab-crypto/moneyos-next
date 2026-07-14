"use client";

import { motion } from "framer-motion";

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
}

export function Toggle({ checked, onChange, disabled = false, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative h-7 w-[52px] shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-neutral-900" : "bg-neutral-300"
      }`}
    >
      <motion.span
        animate={{ x: checked ? 24 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={`absolute top-0.5 h-6 w-6 rounded-full ${checked ? "bg-white" : "bg-neutral-800"}`}
        style={{
          boxShadow: "0 1px 2px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(0,0,0,0.08)",
        }}
      />
    </button>
  );
}
