"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const SPLASH_DURATION_MS = 2000;

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/welcome");
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 50% 45%, hsl(var(--card)) 0%, hsl(var(--background)) 70%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center gap-4"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/20 blur-3xl"
        />

        <div className="gold-bg relative flex h-16 w-16 items-center justify-center rounded-2xl">
          <span className="gold-text font-heading text-2xl font-semibold">
            M
          </span>
        </div>

        <span className="relative font-heading text-2xl font-semibold tracking-[0.02em] text-foreground">
          MoneyOS
        </span>
      </motion.div>
    </div>
  );
}