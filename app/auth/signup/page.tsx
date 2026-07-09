"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function SignupPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If someone's already signed in, don't show them a signup form.
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

    // If email confirmation is off, signUp returns an active session
    // immediately. If it's on, there's a session-less user and no
    // redirect should happen until they've verified.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError("Check your email to confirm your account before signing in.");
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

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
          onSubmit={handleSubmit}
          noValidate
          className="mt-10 flex flex-1 flex-col"
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
              disabled={submitting}
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