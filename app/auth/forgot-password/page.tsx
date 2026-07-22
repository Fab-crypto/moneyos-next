"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    setLoading(false);

    if (error) {
      console.error("[forgot-password] resetPasswordForEmail failed:", error);
    }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold mb-3">Check your email</h1>
          <p className="text-muted-foreground">
            If an account exists for <span className="text-foreground">{email}</span>, we&apos;ve sent a
            link to reset your password.
          </p>
          <Link href="/auth/login" className="mt-8 inline-block text-sm text-gray-400 hover:text-white">
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold mb-2">Reset your password</h1>
        <p className="text-muted-foreground mb-8">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5"
        >
          <div>
            <label className="block text-xs uppercase mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-zinc-800 p-4 outline-none"
              required
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-yellow-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white text-black py-4 font-semibold disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <Link href="/auth/login" className="block text-center text-sm text-gray-400 hover:text-white">
            Back to sign in
          </Link>
        </form>
      </div>
    </main>
  );
}
