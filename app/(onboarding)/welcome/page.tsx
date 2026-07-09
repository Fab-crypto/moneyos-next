"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: EASE,
    },
  },
};

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="pt-[max(4rem,env(safe-area-inset-top))]"
        >
          <div className="gold-bg flex h-11 w-11 items-center justify-center rounded-xl">
            <span className="gold-text font-heading text-lg font-semibold">
              M
            </span>
          </div>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-1 flex-col justify-center"
        >
          <motion.h1
            variants={item}
            className="font-heading text-[40px] font-semibold leading-[1.15] tracking-[-0.01em] text-foreground"
          >
            Your money.
            <br />
            Finally makes sense.
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 max-w-[85%] text-[16px] leading-relaxed text-muted-foreground"
          >
            Know exactly what you can spend today, tomorrow, and next month.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
          className="flex flex-col gap-3 pb-[max(2.5rem,env(safe-area-inset-bottom))]"
        >
          <Link
            href="/auth/signup"
            className="flex h-14 items-center justify-center rounded-xl bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90 active:opacity-80"
          >
            Get Started
          </Link>

          <Link
            href="/auth/login"
            className="flex h-14 items-center justify-center rounded-xl text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            I already have an account
          </Link>
        </motion.div>
      </div>
    </div>
  );
}