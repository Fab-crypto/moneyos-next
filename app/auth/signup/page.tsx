"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { AppleIcon } from "@/components/ui/AppleIcon";
import { EASE } from "@/lib/constants";


export default function SignupPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/dashboard");
      } else {
        setCheckingSession(false);
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError("Check your email to confirm your account before signing in.");
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      console.error("[signup] Google sign-in failed:", error);
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setError(null);
    setAppleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      console.error("[signup] Apple sign-in failed:", error);
      setError("Apple sign-in failed. Please try again.");
      setAppleLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="pt-[max(4rem,env(safe-area-inset-top))]"
        >
          <h1 className="font-heading text-[28px] font-semibold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">Takes less than a minute.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5, ease: EASE }}
          className="mt-8"
        >
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={appleLoading || googleLoading || submitting}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-border/60 bg-black text-[15px] font-medium text-white transition-opacity disabled:opacity-50 [@media(hover:hover)]:hover:opacity-90"
          >
            <AppleIcon />
            {appleLoading ? "Redirecting..." : "Continue with Apple"}
          </button>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || appleLoading || submitting}
            className="mt-3 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-white text-[15px] font-medium text-black transition-opacity disabled:opacity-50 [@media(hover:hover)]:hover:opacity-90"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-[12px] text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.5, ease: EASE }}
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-1 flex-col"
        >
          <div className="card-premium space-y-4 p-6">
            <Field label="Name">
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3.5 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3.5 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3.5 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
              />
            </Field>
            <Field label="Confirm Password">
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
                className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3.5 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
              />
            </Field>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-sm text-danger"
              role="alert"
            >
              {error}
            </motion.p>
          )}

          <div className="mt-auto flex flex-col gap-3 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-10">
            <button
              type="submit"
              disabled={submitting || googleLoading || appleLoading}
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "Creating account..." : "Create Account"}
            </button>
            <Link
              href="/auth/login"
              className="flex h-12 items-center justify-center text-[14px] font-medium text-muted-foreground transition-colors [@media(hover:hover)]:hover:text-foreground"
            >
              Already have an account? Sign in
            </Link>

            <p className="mt-1 text-center text-[12px] text-muted-foreground/70">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </motion.form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
