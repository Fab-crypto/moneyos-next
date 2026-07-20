"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ChevronLeft, Loader2, Lock, FileText, Shield, ShieldCheck, Fingerprint } from "lucide-react";
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
            <TwoFactorCard />
          </motion.div>

          <motion.div variants={item} className="mt-5">
            <PasskeyCard />
          </motion.div>

          <motion.div variants={item} className="mt-5">
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

interface EnrolledFactor {
  id: string;
  createdAt: string;
}

function TwoFactorCard() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<EnrolledFactor[]>([]);

  const [enrolling, setEnrolling] = useState(false);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    loadFactors();
  }, []);

  async function loadFactors() {
    setLoading(true);
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (!listError && data) {
      setFactors(
        (data.totp ?? [])
          .filter((f) => f.status === "verified")
          .map((f) => ({ id: f.id, createdAt: f.created_at }))
      );
    }
    setLoading(false);
  }

  async function startEnroll() {
    setError(null);
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });

    if (enrollError || !data) {
      setError("Couldn't start setup. Please try again.");
      return;
    }

    setPendingFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setCode("");
    setEnrolling(true);
  }

  async function cancelEnroll() {
    if (pendingFactorId) {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: pendingFactorId });
      if (unenrollError) {
        // Don't silently reset - an unverified factor left behind here is invisible
        // (the list below only shows verified factors) and can eventually exhaust
        // Supabase's per-user factor cap, permanently blocking future enrollment.
        setError("Couldn't cancel cleanly. Please try again before leaving this page.");
        return;
      }
    }
    setPendingFactorId(null);
    setQrCode(null);
    setSecret(null);
    setCode("");
    setError(null);
    setEnrolling(false);
  }

  async function verifyEnroll() {
    if (!pendingFactorId || code.length < 6) return;
    setVerifying(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: pendingFactorId,
      code,
    });

    setVerifying(false);

    if (verifyError) {
      setError("That code didn't match. Check your authenticator app and try again.");
      return;
    }

    setPendingFactorId(null);
    setQrCode(null);
    setSecret(null);
    setCode("");
    setEnrolling(false);
    await loadFactors();
  }

  async function handleRemove(factorId: string) {
    setRemoving(true);
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
    setRemoving(false);
    if (!unenrollError) {
      setConfirmRemoveId(null);
      await loadFactors();
    }
  }

  return (
    <MoneyCard>
      <SectionHeader icon={ShieldCheck} iconClassName="text-muted-foreground">
        Two-Factor Authentication
      </SectionHeader>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Checking status...</p>
        ) : enrolling ? (
          <div className="space-y-3">
            <p className="text-[13px] text-muted-foreground">
              Scan this code with an authenticator app (1Password, Authy, Google Authenticator, etc).
            </p>

            {qrCode && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCode}
                alt="Scan this QR code with your authenticator app"
                className="mx-auto h-40 w-40 rounded-lg bg-white p-2"
              />
            )}

            {secret && (
              <p className="break-all rounded-lg bg-muted px-3 py-2 text-center font-mono text-[11px] text-muted-foreground">
                {secret}
              </p>
            )}

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              placeholder="Enter 6-digit code"
              className="w-full rounded-xl border-0 bg-muted px-4 py-3 text-center text-[15px] tracking-[0.3em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold"
            />

            {error && (
              <p className="text-xs font-medium text-danger" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEnroll}
                disabled={verifying}
                className="h-11 flex-1 rounded-xl bg-muted text-[13px] font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={verifyEnroll}
                disabled={verifying || code.length < 6}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {verifying && <Loader2 size={13} className="animate-spin" />}
                {verifying ? "Verifying..." : "Verify & Enable"}
              </button>
            </div>
          </div>
        ) : factors.length > 0 ? (
          <div className="space-y-2">
            {factors.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={15} className="text-success" />
                  <div>
                    <p className="text-[14px] font-medium text-foreground">Authenticator app</p>
                    <p className="text-[12px] text-muted-foreground">Enabled</p>
                  </div>
                </div>

                {confirmRemoveId === f.id ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(null)}
                      disabled={removing}
                      className="text-[12px] font-medium text-muted-foreground disabled:opacity-50"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(f.id)}
                      disabled={removing}
                      className="text-[12px] font-medium text-danger disabled:opacity-50"
                    >
                      {removing ? "Removing..." : "Remove"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveId(f.id)}
                    className="text-[12px] font-medium text-muted-foreground transition-colors [@media(hover:hover)]:hover:text-danger"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <p className="text-[12px] text-muted-foreground">Required to connect a bank account.</p>
          </div>
        ) : (
          <div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Add an authenticator app for a phishing-resistant second step at sign-in. This is required
              before you can connect a bank account.
            </p>
            <button
              type="button"
              onClick={startEnroll}
              className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-foreground text-[14px] font-medium text-background transition-opacity hover:opacity-90"
            >
              Set Up Authenticator App
            </button>
            {error && (
              <p className="mt-2 text-xs font-medium text-danger" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </MoneyCard>
  );
}

interface Passkey {
  id: string;
  label: string;
  createdAt: string | null;
}

function PasskeyCard() {
  const [loading, setLoading] = useState(true);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    loadPasskeys();
  }, []);

  async function loadPasskeys() {
    setLoading(true);
    try {
      const { data, error: listError } = await supabase.auth.passkey.list();
      if (listError) throw listError;

      setPasskeys(
        (data ?? []).map((p: Record<string, unknown>, i: number) => ({
          id: String(p.id ?? i),
          label: String(p.friendly_name ?? p.friendlyName ?? p.name ?? `Passkey ${i + 1}`),
          createdAt: (p.created_at as string) ?? (p.createdAt as string) ?? null,
        }))
      );
    } catch {
      // Experimental API - if it's unavailable (not enabled in the dashboard yet,
      // unsupported browser, etc.) show a setup hint instead of an error.
      setUnsupported(true);
    }
    setLoading(false);
  }

  async function handleRegister() {
    setError(null);
    setRegistering(true);
    const { error: registerError } = await supabase.auth.registerPasskey();
    setRegistering(false);

    if (registerError) {
      setError(
        registerError.message ||
          "Couldn't set up a passkey. Make sure passkeys are enabled for this project and try again."
      );
      return;
    }

    await loadPasskeys();
  }

  async function handleRemove(passkeyId: string) {
    setRemoving(true);
    const { error: deleteError } = await supabase.auth.passkey.delete({ passkeyId });
    setRemoving(false);
    if (!deleteError) {
      setConfirmRemoveId(null);
      await loadPasskeys();
    }
  }

  return (
    <MoneyCard>
      <SectionHeader icon={Fingerprint} iconClassName="text-muted-foreground">
        Passkey
      </SectionHeader>

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Checking status...</p>
        ) : unsupported ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Passkeys aren&apos;t available yet. This feature is optional and separate from the
            two-factor authentication above, which is what&apos;s required to connect a bank account.
          </p>
        ) : passkeys.length > 0 ? (
          <div className="space-y-2">
            {passkeys.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Fingerprint size={15} className="text-success" />
                  <div>
                    <p className="text-[14px] font-medium text-foreground">{p.label}</p>
                    <p className="text-[12px] text-muted-foreground">Sign in without a password</p>
                  </div>
                </div>

                {confirmRemoveId === p.id ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(null)}
                      disabled={removing}
                      className="text-[12px] font-medium text-muted-foreground disabled:opacity-50"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(p.id)}
                      disabled={removing}
                      className="text-[12px] font-medium text-danger disabled:opacity-50"
                    >
                      {removing ? "Removing..." : "Remove"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveId(p.id)}
                    className="text-[12px] font-medium text-muted-foreground transition-colors [@media(hover:hover)]:hover:text-danger"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleRegister}
              disabled={registering}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-muted text-[13px] font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
            >
              {registering ? "Setting up..." : "Add another passkey"}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Optional: add a passkey to sign in with Face ID, Touch ID, or Windows Hello instead of
              your password. This is in addition to the two-factor authentication above, not a
              replacement for it.
            </p>
            <button
              type="button"
              onClick={handleRegister}
              disabled={registering}
              className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-foreground text-[14px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {registering ? "Setting up..." : "Add a Passkey"}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs font-medium text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </MoneyCard>
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
