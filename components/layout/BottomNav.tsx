"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutGrid, Wallet, Target, Sparkles, User } from "lucide-react";
import { EASE, SHELL_WIDTH } from "@/lib/constants";

const NAV_TABS = [
  { href: "/dashboard", icon: LayoutGrid, label: "Home" },
  { href: "/accounts", icon: Wallet, label: "Accounts" },
  { href: "/goals", icon: Target, label: "Goals" },
  { href: "/mo", icon: Sparkles, label: "MO" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        className={`glass flex w-full ${SHELL_WIDTH} items-center justify-around rounded-full border border-border/60 px-3 py-3 shadow-2xl`}
      >
        {NAV_TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className="relative flex flex-col items-center gap-1 px-2">
              <motion.div
                animate={{ scale: active ? 1.08 : 1 }}
                transition={{ duration: 0.2, ease: EASE }}
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  active ? "bg-foreground/10 text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.3 : 1.7} />
              </motion.div>
              <span className={`text-[10px] ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
