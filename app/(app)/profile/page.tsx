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
  ChevronRight,
  LogOut,
  Trash2,
  CheckCircle2,
  Building2,
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

// Identity, not account management — email lives inside Privacy & Security instead.
const PROFILE = { name: "Fabian", memberSince: "February 2025" };

// Same institutions shown on Accounts, for continuity across screens.
const CONNECTED_BANKS = ["Chase", "American Express", "Fidelity", "SoFi"];

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
            <ConnectedBanksCard />
          </motion.div>

          <motion.div variants={item} className="mt-5">
            <SettingsListCard />
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

/** Identity, kept quiet — a name and how long they've been here, nothing to manage. */
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
          <p className="text-xs text-muted-foreground">MoneyOS Member</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Since {PROFILE.memberSince}</p>
        </div>
      </div>
    </div>
  );
}

/** First-class connections list — a Plaid Link result will populate this later. */
function ConnectedBanksCard() {
  return (
    <div className="card-premium p-6">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Connected Banks
      </span>
      <div className="mt-4 space-y-3.5">
        {CONNECTED_BANKS.map((bank) => (
          <div key={bank} className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Building2 size={14} className="text-foreground" />
            </div>
            <span className="flex-1 text-[15px] text-foreground">{bank}</span>
            <CheckCircle2 size={16} className="text-success" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** One flat settings list — appearance/notifications as toggles, the rest as navigation rows. */
function SettingsListCard() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="card-premium divide-y divide-border/50">
      <ToggleRow icon={Moon} label="Appearance" checked={darkMode} onChange={setDarkMode} />
      <ToggleRow icon={Bell} label="Notifications" checked={notifications} onChange={setNotifications} />
      <NavRow icon={Shield} label="Privacy & Security" />
      <NavRow icon={CreditCard} label="Subscription" />
      <NavRow icon={HelpCircle} label="Support" />
    </div>
  );
}

function ToggleRow({
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
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-muted-foreground" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
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

function NavRow({ icon: Icon, label }: { icon: typeof Shield; label: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between px-6 py-4 transition-colors [@media(hover:hover)]:hover:bg-muted/50"
    >
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-muted-foreground" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <ChevronRight size={14} className="text-muted-foreground" />
    </button>
  );
}

/** Delete Account — inline confirm step, no modal dependency. */
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
            This permanently deletes your accounts, transactions, and goals. This can't be undone.
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