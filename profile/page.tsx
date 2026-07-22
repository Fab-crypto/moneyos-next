"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  LayoutGrid,
  Wallet,
  Target,
  Sparkles,
  User,
  Moon,
  Bell,
  Shield,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronRight,
  Flame,
  TrendingUp,
  Trash2,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;
const SHELL_WIDTH = "max-w-[430px]";

const NAV_TABS = [
  { href: "/dashboard", icon: LayoutGrid, label: "Home" },
  { href: "/accounts", icon: Wallet, label: "Accounts" },
  { href: "/goals", icon: Target, label: "Goals" },
  { href: "/mo", icon: Sparkles, label: "MO" },
  { href: "/profile", icon: User, label: "Profile" },
];

const PROFILE = {
  name: "Fabian",
  email: "fabian@example.com",
  memberSince: "February 2025",
  streakDays: 12,
};

const MENU_ITEMS = [
  { icon: Shield, label: "Privacy & Security" },
  { icon: CreditCard, label: "Subscription" },
  { icon: HelpCircle, label: "Support" },
];

export default function ProfilePage() {
  const reduceMotion = useReducedMotion();

  const pageContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } },
  };
  const item: Variants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0.2 : 0.5, ease: EASE } },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto ${SHELL_WIDTH} min-h-screen bg-background sm:border-x sm:border-border/40`}>
        <motion.main
          variants={pageContainer}
          initial="hidden"
          animate="show"
          className="px-6 pb-32 pt-[max(3.75rem,env(safe-area-inset-top))]"
        >
          <motion.div variants={item}>
            <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-foreground">
              Profile
            </h1>
          </motion.div>

          <motion.div variants={item} className="mt-8">
            <ProfileHeader />
          </motion.div>

          <motion.div variants={item} className="mt-5">
            <SettingsCard />
          </motion.div>

          <motion.div variants={item} className="mt-5">
            <div className="card-premium divide-y divide-border/50">
              {MENU_ITEMS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  className="flex w-full items-center justify-between px-6 py-4 transition-colors [@media(hover:hover)]:hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className="text-muted-foreground" />
                    <span className="text-sm">{label}</span>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div variants={item} className="mt-3">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl px-6 py-4 text-danger transition-colors [@media(hover:hover)]:hover:bg-destructive/10"
            >
              <LogOut size={16} />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </motion.div>

          <motion.div variants={item} className="mt-5">
            <DeleteAccountCard />
          </motion.div>
        </motion.main>
      </div>

      <BottomNav />
    </div>
  );
}

/** Avatar, name, member-since, and two calm stats — "am I in control?" starts here. */
function ProfileHeader() {
  return (
    <div className="card-premium p-6">
      <div className="flex items-center gap-4">
        <div className="gold-bg flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
          <span className="gold-text font-heading text-lg font-semibold">
            {PROFILE.name.charAt(0)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-foreground">{PROFILE.name}</p>
          <p className="truncate text-xs text-muted-foreground">{PROFILE.email}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Member since {PROFILE.memberSince}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/50 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
            <Flame size={16} className="text-warning" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{PROFILE.streakDays} days</p>
            <p className="text-xs text-muted-foreground">MoneyOS Streak</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
            <TrendingUp size={16} className="text-success" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Excellent</p>
            <p className="text-xs text-muted-foreground">Avg. Confidence</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Budget, dark mode, notifications — local state only until Supabase exists. */
function SettingsCard() {
  const [budget, setBudget] = useState("3200");
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="card-premium space-y-5 p-6">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Monthly Budget
        </label>
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3 text-sm text-foreground outline-none"
        />
      </div>

      <div className="h-px bg-border" />

      <SettingRow icon={Moon} label="Dark Mode" checked={darkMode} onChange={setDarkMode} />
      <SettingRow icon={Bell} label="Notifications" checked={notifications} onChange={setNotifications} />

      <button
        type="button"
        onClick={handleSave}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-foreground text-[14px] font-medium text-background transition-opacity hover:opacity-90 active:opacity-80"
      >
        {saved ? "Saved" : "Save Changes"}
      </button>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: typeof Moon;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-muted-foreground" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-gold" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/** Delete Account — an inline confirm step instead of a modal dialog, keeping this file dependency-free. */
function DeleteAccountCard() {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="card-premium p-6">
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-destructive text-[14px] font-medium text-destructive-foreground transition-opacity hover:opacity-90"
        >
          <Trash2 size={15} />
          Delete Account
        </button>
      ) : (
        <div>
          <p className="text-sm font-medium text-foreground">Delete your account?</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            This permanently deletes your accounts, transactions, and goals. This can&apos;t be undone.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-11 flex-1 rounded-xl bg-muted text-sm font-medium text-foreground transition-colors [@media(hover:hover)]:hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              type="button"
              className="h-11 flex-1 rounded-xl bg-destructive text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BottomNav() {
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