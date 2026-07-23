"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface MfaVerifyFormProps {
  factorId: string | null;
  initialError?: string | null;
  title?: string;
  subtitle?: string;
  onVerified: () => void;
}

export function MfaVerifyForm({
  factorId,
  initialError = null,
  title = "Verify it's you",
  subtitle = "Enter the code from your authenticator app to continue.",
  onVerified,
}: MfaVerifyFormProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || code.length < 6) return;

    setVerifying(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

    setVerifying(false);

    if (verifyError) {
      console.error("[mfa-verify] challenge failed:", verifyError);
      setError("That code didn't match. Check your authenticator app and try again.");
      setCode("");
      return;
    }

    onVerified();
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground mb-8">{subtitle}</p>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
          <div>
            <label className="block text-xs uppercase mb-2">Authentication Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              placeholder="6-digit code"
              className="w-full rounded-xl bg-zinc-800 p-4 text-center tracking-[0.3em] outline-none"
              required
              autoFocus
              disabled={!factorId}
            />
          </div>

          {error && <p className="text-sm text-yellow-400">{error}</p>}

          <button
            type="submit"
            disabled={verifying || code.length < 6 || !factorId}
            className="w-full rounded-xl bg-white text-black py-4 font-semibold disabled:opacity-50"
          >
            {verifying ? "Verifying..." : "Verify"}
          </button>
        </form>
      </div>
    </main>
  );
}
