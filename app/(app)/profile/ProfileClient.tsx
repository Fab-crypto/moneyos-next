"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
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
  Loader2,
} from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MoneyButton } from "@/components/ui/MoneyButton";
import { BottomNav } from "@/components/layout/BottomNav";
import { EASE, SHELL_WIDTH } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

interface ConnectedBank {
  id: string;
  name: string;
}

interface ProfileClientProps {
  name: string;
  memberSince: string | null;
  connectedBanks: ConnectedBank[];
  initialNotificationsEnabled: boolean;
}

export function ProfileClient({ name, memberSince, connectedBanks, initialNotificationsEnabled }: ProfileClientProps) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[profile] sign out failed:", error);
      setSigningOut(false);
      return;
    }
    router.replace("/welcome");
  }

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
            <ProfileHeader name={name} memberSince={memberSince} />
          </motion.div>

          <motion.div variants={item} className="mt-5">
            <ConnectedBanksCard banks={connectedBanks} />
          </motion.div>

          <motion.div variants={item} className="mt-5">
            <SettingsListCard initialNotificationsEnabled={initialNotificationsEnabled} />
          </motion.div>

          <motion.div variants={item} className="mt-3">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-2xl px-6 py-4 text-danger transition-colors disabled:opacity-50 [@media(hover:hover)]:hover:bg-destructive/10"
            >
              {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              <span className="text-sm font-medium">{signingOut ? "Signing out..." : "Sign Out"}</span>
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

function ProfileHeader({ name, memberSince }: { name: string; memberSince: string | null }) {
  return (
    <MoneyCard>
      <div className="flex items-center gap-4">
        <div className="gold-bg flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
          <span className="gold-text font-heading text-lg font-semibold">{name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">MoneyOS Member</p>
          {memberSince && <p className="mt-0.5 text-xs text-muted-foreground">Since {memberSince}</p>}
        </div>
      </div>
    </MoneyCard>
  );
}

function ConnectedBanksCard({ banks }: { banks: ConnectedBank[] }) {
  return (
    <MoneyCard>
      <SectionHeader>Connected Banks</SectionHeader>
      {banks.length > 0 ? (
        <div className="mt-4 space-y-3.5">
          {banks.map((bank) => (
            <div key={bank.id} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Building2 size={14} className="text-foreground" />
              </div>
              <span className="flex-1 text-[15px] text-foreground">{bank.name}</span>
              <CheckCircle2 size={16} className="text-success" />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          No banks connected yet — connect one from the Accounts tab.
        </p>
      )}
    </MoneyCard>
  );
}

function SettingsListCard({ initialNotificationsEnabled }: { initialNotificationsEnabled: boolean }) {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(initialNotificationsEnabled);
  const [saving, setSaving] = useState(false);

  async function handleNotificationsChange(next: boolean) {
    setNotifications(next);
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("profiles").update({ notifications_enabled: next }).eq("id", user.id);

    if (error) {
      console.error("[profile] failed to save notification setting:", error);
      setNotifications(!next);
    }
    setSaving(false);
  }

  return (
    <MoneyCard padded={false} className="divide-y divide-border/50">
      <ToggleRow icon={Moon} label="Appearance" checked={darkMode} onChange={setDarkMode} />
      <ToggleRow
        icon={Bell}
        label="Notifications"
        checked={notifications}
        onChange={handleNotificationsChange}
        disabled={saving}
      />
      <NavRow icon={Shield} label="Privacy & Security" />
      <NavRow icon={CreditCard} label="Subscription" />
      <NavRow icon={HelpCircle} label="Support" />
    </MoneyCard>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onChange,
  disabled = false,
}: {
  icon: typeof Moon;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
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
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-gold" : "bg-muted"
        }`}
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

function DeleteAccountCard() {
  const [confirming, setConfirming] = useState(false);

  return (
    <MoneyCard>
      {!confirming ? (
        <MoneyButton variant="destructive" size="md" onClick={() => setConfirming(true)}>
          <Trash2 size={15} />
          Delete Account
        </MoneyButton>
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
    </MoneyCard>
  );
}
