"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  DollarSign,
} from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MoneyButton } from "@/components/ui/MoneyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toggle } from "@/components/ui/Toggle";
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
  initialMonthlyIncome: number | null;
  isSubscribed: boolean;
}

export function ProfileClient({
  name,
  memberSince,
  connectedBanks,
  initialNotificationsEnabled,
  initialMonthlyIncome,
  isSubscribed,
}: ProfileClientProps) {
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
            <MonthlyIncomeCard initialValue={initialMonthlyIncome} />
          </motion.div>

          <motion.div variants={item} className="mt-5">
            <ConnectedBanksCard banks={connectedBanks} />
          </motion.div>

          <motion.div variants={item} className="mt-5">
            <SettingsListCard initialNotificationsEnabled={initialNotificationsEnabled} isSubscribed={isSubscribed} />
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

function MonthlyIncomeCard({ initialValue }: { initialValue: number | null }) {
  const [value, setValue] = useState(initialValue !== null ? String(initialValue) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedValue = initialValue !== null ? String(initialValue) : "";
  const isDirty = value !== savedValue;

  async function handleSave() {
    setError(null);

    const trimmed = value.trim();
    let parsed: number | null = null;

    if (trimmed !== "") {
      parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Enter a valid amount.");
        return;
      }
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ monthly_income: parsed })
      .eq("id", user.id);

    if (updateError) {
      console.error("[profile] failed to save monthly income:", updateError);
      setError("Failed to save. Please try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <MoneyCard>
      <SectionHeader icon={DollarSign} iconClassName="text-muted-foreground">
        Monthly Income
      </SectionHeader>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        Used to compare your real spending against your real budget in Analytics, instead of a
        generic estimate.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-muted-foreground">
            $
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            disabled={saving}
            placeholder="Not set"
            className="w-full rounded-xl border-0 bg-muted py-3 pl-8 pr-4 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 text-sm font-medium text-background transition-opacity disabled:opacity-40 [@media(hover:hover)]:hover:opacity-90"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving..." : saved ? "Saved" : "Save"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function SettingsListCard({
  initialNotificationsEnabled,
  isSubscribed,
}: {
  initialNotificationsEnabled: boolean;
  isSubscribed: boolean;
}) {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(initialNotificationsEnabled);
  const [saving, setSaving] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("moneyos_theme");
    const isLight = saved === "light";
    setDarkMode(!isLight);
    document.documentElement.classList.toggle("light", isLight);
  }, []);

  function handleDarkModeChange(nextDarkMode: boolean) {
    setDarkMode(nextDarkMode);
    document.documentElement.classList.toggle("light", !nextDarkMode);
    localStorage.setItem("moneyos_theme", nextDarkMode ? "dark" : "light");
  }

  async function saveNotificationPreference(next: boolean) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("profiles").update({ notifications_enabled: next }).eq("id", user.id);
    if (error) {
      console.error("[profile] failed to save notification preference:", error);
    }
  }

  async function handleNotificationsChange(next: boolean) {
    setNotificationError(null);

    if (!next) {
      setSaving(true);
      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          const subscription = await registration?.pushManager.getSubscription();
          if (subscription) {
            await fetch("/api/push/unsubscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            });
            await subscription.unsubscribe();
          }
        }
        setNotifications(false);
        await saveNotificationPreference(false);
      } catch (err) {
        console.error("[profile] failed to unsubscribe from push:", err);
      }
      setSaving(false);
      return;
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setNotificationError("Push notifications aren't supported in this browser.");
      return;
    }

    setSaving(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission === "denied") {
        setNotificationError(
          "Notifications are blocked. Enable them for MoneyOS in your browser or device settings."
        );
        setSaving(false);
        return;
      }
      if (permission !== "granted") {
        setSaving(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error("[profile] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
        setNotificationError("Failed to set up notifications. Please try again.");
        setSaving(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();
      const p256dhKey = subscription.getKey("p256dh");
      const authKey = subscription.getKey("auth");

      if (!p256dhKey || !authKey) {
        setNotificationError("Failed to set up notifications. Please try again.");
        setSaving(false);
        return;
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscriptionJson.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(p256dhKey),
            auth: arrayBufferToBase64(authKey),
          },
        }),
      });

      if (!response.ok) {
        setNotificationError("Failed to save your subscription. Please try again.");
        setSaving(false);
        return;
      }

      setNotifications(true);
      await saveNotificationPreference(true);
    } catch (err) {
      console.error("[profile] push subscription failed:", err);
      setNotificationError("Failed to set up notifications. Please try again.");
    }

    setSaving(false);
  }

  return (
    <MoneyCard padded={false} className="divide-y divide-border/50">
      <ToggleRow icon={Moon} label="Appearance" checked={darkMode} onChange={handleDarkModeChange} />
      <ToggleRow
        icon={Bell}
        label="Notifications"
        checked={notifications}
        onChange={handleNotificationsChange}
        disabled={saving}
      />
      {notificationError && (
        <p className="px-6 pb-4 text-xs font-medium text-danger" role="alert">
          {notificationError}
        </p>
      )}
      <NavRow icon={Shield} label="Privacy & Security" href="/profile/security" />
      <SubscriptionRow isSubscribed={isSubscribed} />
      <NavRow icon={HelpCircle} label="Support" href="mailto:odukfabian@gmail.com" />
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
    <div className="box-border flex w-full items-center justify-between gap-3 px-6 py-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Icon size={16} className="shrink-0 text-muted-foreground" />
        <span className="truncate text-sm text-foreground">{label}</span>
      </div>
      <Toggle checked={checked} onChange={() => onChange(!checked)} disabled={disabled} label={label} />
    </div>
  );
}

function NavRow({ icon: Icon, label, href }: { icon: typeof Shield; label: string; href: string }) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <Icon size={16} className="text-muted-foreground" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <ChevronRight size={14} className="text-muted-foreground" />
    </>
  );

  const className =
    "flex w-full items-center justify-between px-6 py-4 transition-colors [@media(hover:hover)]:hover:bg-muted/50";

  if (href.startsWith("mailto:")) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

function SubscriptionRow({ isSubscribed }: { isSubscribed: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.url) {
        console.error("[profile] checkout session failed:", data.error);
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("[profile] checkout request failed:", err);
      setLoading(false);
    }
  }

  async function handleManage() {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/create-portal-session", { method: "POST" });
      const data = await response.json();

      if (!response.ok || !data.url) {
        console.error("[profile] portal session failed:", data.error);
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("[profile] portal request failed:", err);
      setLoading(false);
    }
  }

  if (isSubscribed) {
    return (
      <button
        type="button"
        onClick={handleManage}
        disabled={loading}
        className="flex w-full items-center justify-between px-6 py-4 transition-colors disabled:opacity-50 [@media(hover:hover)]:hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          {loading ? (
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          ) : (
            <CreditCard size={16} className="text-muted-foreground" />
          )}
          <span className="text-sm text-foreground">{loading ? "Opening..." : "Subscription"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-success" />
            <span className="text-xs font-medium text-success">Active</span>
          </div>
          <ChevronRight size={14} className="text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleUpgrade}
      disabled={loading}
      className="flex w-full items-center justify-between px-6 py-4 transition-colors disabled:opacity-50 [@media(hover:hover)]:hover:bg-muted/50"
    >
      <div className="flex items-center gap-3">
        {loading ? (
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        ) : (
          <CreditCard size={16} className="text-muted-foreground" />
        )}
        <span className="text-sm text-foreground">{loading ? "Starting checkout..." : "Subscription"}</span>
      </div>
      <ChevronRight size={14} className="text-muted-foreground" />
    </button>
  );
}

function DeleteAccountCard() {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!password) {
      setError("Enter your password to confirm.");
      return;
    }

    setDeleting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setError("Could not verify your account. Please try again.");
      setDeleting(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (verifyError) {
      setError("Incorrect password.");
      setDeleting(false);
      return;
    }

    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to delete account. Please try again.");
        setDeleting(false);
        return;
      }

      await supabase.auth.signOut();
      window.location.href = "/welcome";
    } catch (err) {
      console.error("[profile] account deletion request failed:", err);
      setError("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  }

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
            This permanently deletes your accounts, transactions, and goals, disconnects every bank
            you've linked, and cancels any active subscription. This can't be undone.
          </p>

          <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Confirm your password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={deleting}
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
          />

          {error && (
            <p className="mt-3 text-xs font-medium text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setPassword("");
                setError(null);
              }}
              disabled={deleting}
              className="h-11 flex-1 rounded-xl bg-muted text-sm font-medium text-foreground transition-colors disabled:opacity-50 [@media(hover:hover)]:hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || !password}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {deleting && <Loader2 size={14} className="animate-spin" />}
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </MoneyCard>
  );
}
