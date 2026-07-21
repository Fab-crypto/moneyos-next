"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasValidSession(!!session);
      setCheckingSession(false);
    });
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
      // TEMPORARY: show the real Supabase error message so we can diagnose why
      // this is failing, instead of a generic message that hides the cause.
      setError(`Failed to update password: ${error.message} (code: ${error.code ?? error.status ?? "unknown"})`);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (checkingSession) {
    return <main className="min-h-screen bg-background" />;
  }

  if (!hasValidSession) {
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
