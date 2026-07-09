"use client";

import { motion } from "framer-motion";

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}
const EASE = [0.22, 1, 0.36, 1] as const;

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const line = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

export function Greeting({ firstName }: { firstName: string }) {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-0.5">
      <motion.p variants={line} className="text-sm text-muted-foreground">
        {greeting()}
      </motion.p>
      <motion.h1 variants={line} className="text-[26px] font-semibold tracking-tight">
        {firstName}
      </motion.h1>
      <motion.p variants={line} className="pt-0.5 text-xs text-muted-foreground">
        {today}
      </motion.p>
    </motion.div>
  );
}