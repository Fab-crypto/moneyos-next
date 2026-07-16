"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ChevronLeft, Loader2, Lock, FileText, Shield } from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EASE, SHELL_WIDTH } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

export function SecurityClient() {
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
          className="px-6 pb-16 pt-[max(3.75rem,env(safe-area-inset-top))]"
        >
          <motion.div variants={item}>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1 text-[14px] font-medium text-muted-foreground transition-colors [@media(hover:hover)]:hover:text-foreground"
            >
              <ChevronLeft size={16} />
              Profile
            </Link>
            <h1 className="mt-4 text-[34px] font-semibold leading-tight tracking-tight text-foreground">
              Privacy & Security
            </h1>
          </motion.div>

          <motion.div variants={item} className="mt-6">
            <ChangePasswordCard />
          </motion.div>

          <motion.div variants={item} className="mt-5">
            <MoneyCard padded={false} className="divide-y divide-border/50">
              <Link
                href="/privacy"
                className="flex w-full items-center justify-between px-6 py-4 transition-colors [@media(hover:hover)]:hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-muted-foreground" />
                  <span className="text-sm text-foreground">Privacy Policy</span>
                </div>
              </Link>
              <Link
                href="/terms"
                className="flex w-full items-center justify-between px-6 py-4 transition-colors [@media(hover:hover)]:hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-muted-foreground" />
                  <span className="text-sm text-foreground">Terms of Service</span>
                </div>
              </Link>
            </MoneyCard>
          </motion.div>
        </motion.main>
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setError("Could not verify your account. Please try again.");
      setSaving(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      setError("Current password is incorrect.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      console.error("[security] password update failed:", updateError);
      setError("Failed to update password. Please try again.");
      setSaving(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <MoneyCard>
      <SectionHeader icon={Lock} iconClassName="text-muted-foreground">
        Change Password
      </SectionHeader>

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setError(null);
            }}
            disabled={saving}
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setError(null);
            }}
            disabled={saving}
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError(null);
            }}
            disabled={saving}
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !currentPassword || !newPassword || !confirmPassword}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-[15px] font-medium text-background transition-opacity disabled:opacity-40 [@media(hover:hover)]:hover:opacity-90"
      >
        {saving && <Loader2 size={15} className="animate-spin" />}
        {saving ? "Saving..." : saved ? "Password updated" : "Update Password"}
      </button>
    </MoneyCard>
  );
}
