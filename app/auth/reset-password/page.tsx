"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Stage = "checking" | "expired" | "mfa" | "password";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("checking");

  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setStage("expired");
        return;
      }

      // The recovery link only ever establishes an AAL1 session, even when
      // the account has a verified MFA factor - updateUser() would then fail
      // with insufficient_aal. Check locally (no network call) whether a
      // step-up challenge is required before showing the password form.
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        console.error("[reset-password] AAL check failed:", aalError);
        setStage("password");
        return;
      }

      if (aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
        const factor = factorsData?.totp?.find((f) => f.status === "verified");

        if (factorsError || !factor) {
          console.error("[reset-password] expected a verified MFA factor but found none:", factorsError);
          setMfaError("Couldn't load your two-factor setup. Please request a new reset link and try again.");
          setStage("mfa");
          return;
        }

        setMfaFactorId(factor.id);
        setStage("mfa");
        return;
      }

      setStage("password");
    })();
  }, []);

  async function handleVerifyMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactorId || mfaCode.length < 6) return;

    setMfaVerifying(true);
    setMfaError(null);

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code: mfaCode,
    });

    setMfaVerifying(false);

    if (verifyError) {
      console.error("[reset-password] MFA challenge failed:", verifyError);
      setMfaError("That code didn't match. Check your authenticator app and try again.");
      setMfaCode("");
      return;
    }

    setStage("password");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      console.error("[reset-password] updateUser failed:", error);

      if (error.code === "insufficient_aal" || error.message.includes("AAL2")) {
        // The session lost its step-up (or our local AAL read was stale) -
        // send the user back through the MFA challenge rather than stall on
        // a raw backend error they can't act on.
        setError(null);
        setMfaError(null);
        setMfaCode("");
        setStage("mfa");
        return;
      }

      setError("Failed to update password. Please try again.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (stage === "checking") {
    return <main className="min-h-screen bg-background" />;
  }

  if (stage === "expired") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold mb-3">Link expired</h1>
          <p className="text-muted-foreground mb-8">
            This password reset link is invalid or has expired.
          </p>
          <a
            href="/auth/forgot-password"
            className="inline-block rounded-xl bg-white text-black px-6 py-3 font-semibold"
          >
            Request a new link
          </a>
        </div>
      </main>
    );
  }

  if (stage === "mfa") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold mb-2">Verify it&apos;s you</h1>
          <p className="text-muted-foreground mb-8">
            Enter the code from your authenticator app to continue resetting your password.
          </p>

          <form
            onSubmit={handleVerifyMfa}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5"
          >
            <div>
              <label className="block text-xs uppercase mb-2">Authentication Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => {
                  setMfaCode(e.target.value.replace(/\D/g, ""));
                  setMfaError(null);
                }}
                placeholder="6-digit code"
                className="w-full rounded-xl bg-zinc-800 p-4 text-center tracking-[0.3em] outline-none"
                required
                autoFocus
              />
            </div>

            {mfaError && <p className="text-sm text-yellow-400">{mfaError}</p>}

            <button
              type="submit"
              disabled={mfaVerifying || mfaCode.length < 6}
              className="w-full rounded-xl bg-white text-black py-4 font-semibold disabled:opacity-50"
            >
              {mfaVerifying ? "Verifying..." : "Verify"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold mb-2">Set a new password</h1>
        <p className="text-muted-foreground mb-8">Choose a new password for your account.</p>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5"
        >
          <div>
            <label className="block text-xs uppercase mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl bg-zinc-800 p-4 outline-none"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs uppercase mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl bg-zinc-800 p-4 outline-none"
              required
            />
          </div>

          {error && <p className="text-sm text-yellow-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white text-black py-4 font-semibold disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </main>
  );
}
