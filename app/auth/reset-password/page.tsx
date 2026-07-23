"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { checkMfaStepUpRequired } from "@/lib/auth-mfa";
import { MfaVerifyForm } from "@/components/auth/MfaVerifyForm";

type Stage = "checking" | "expired" | "mfa" | "password";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("checking");

  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
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
      // with insufficient_aal. Check whether a step-up challenge is required
      // before showing the password form.
      const stepUp = await checkMfaStepUpRequired();

      if (stepUp.required) {
        setMfaFactorId(stepUp.factorId);
        setMfaError(stepUp.error);
        setStage("mfa");
        return;
      }

      setStage("password");
    })();
  }, []);

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
        // The session lost its step-up (or our earlier check was stale) -
        // send the user back through the MFA challenge rather than stall on
        // a raw backend error they can't act on.
        setError(null);
        setMfaError(null);
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
      <MfaVerifyForm
        factorId={mfaFactorId}
        initialError={mfaError}
        subtitle="Enter the code from your authenticator app to continue resetting your password."
        onVerified={() => setStage("password")}
      />
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
