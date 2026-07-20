"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { GoogleIcon } from "@/components/ui/GoogleIcon";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    setMessage("Signed in. Redirecting...");
    window.location.href = "/dashboard";
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      console.error("[login] Google sign-in failed:", error);
      setMessage("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  async function handlePasskeySignIn() {
    setPasskeyLoading(true);
    setMessage("");

    // Passkey support in Supabase Auth is experimental. If this fails (e.g. no
    // passkey registered on this device/browser, or the browser cancels the
    // prompt), we just fall back to the password form below - nothing else
    // on this page depends on it working.
    const { error } = await supabase.auth.signInWithPasskey();

    if (error) {
      setPasskeyLoading(false);
      setMessage(error.message || "Passkey sign-in didn't work. Use your password instead, or try again.");
      return;
    }

    setMessage("Signed in. Redirecting...");
    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold mb-2">
          Welcome back
        </h1>

        <p className="text-muted-foreground mb-8">
          Sign in to your MoneyOS account.
        </p>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
          <button
            type="button"
            onClick={handlePasskeySignIn}
            disabled={passkeyLoading || loading || googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800 py-4 font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {passkeyLoading ? "Waiting for passkey..." : "Sign in with a passkey"}
          </button>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading || passkeyLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white py-4 font-semibold text-black transition-opacity disabled:opacity-50"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-500">or</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-zinc-800 p-4 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-zinc-800 p-4 outline-none"
                required
              />
              <Link
                href="/auth/forgot-password"
                className="mt-2 inline-block text-xs text-gray-400 hover:text-white"
              >
                Forgot password?
              </Link>
            </div>

            {message && (
              <p className="text-sm text-yellow-400">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full rounded-xl bg-white text-black py-4 font-semibold disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

            <Link
              href="/auth/signup"
              className="block text-center text-sm text-gray-400 hover:text-white"
            >
              Don&apos;t have an account? Create one
            </Link>

            <p className="text-center text-xs text-gray-500">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-white">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-white">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
