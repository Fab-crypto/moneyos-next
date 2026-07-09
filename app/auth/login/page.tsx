"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("odukfabian@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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

    // Force a full page navigation
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

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5"
        >
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
          </div>

          {message && (
            <p className="text-sm text-yellow-400">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white text-black py-4 font-semibold"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          <Link
            href="/auth/signup"
            className="block text-center text-sm text-gray-400 hover:text-white"
          >
            Don't have an account? Create one
          </Link>
        </form>
      </div>
    </main>
  );
}