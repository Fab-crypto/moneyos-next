"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess, type PlaidLinkOnExit } from "react-plaid-link";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ConnectStatus =
  | "idle"
  | "checking_mfa"
  | "mfa_not_enrolled"
  | "mfa_step_up"
  | "fetching_token"
  | "awaiting_link"
  | "exchanging"
  | "error";

interface ConnectBankProps {
  onConnected?: (accountsConnected: number) => void;
  className?: string;
}

export function ConnectBank({ onConnected, className }: ConnectBankProps) {
  const [status, setStatus] = useState<ConnectStatus>("idle");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [stepUpFactorId, setStepUpFactorId] = useState<string | null>(null);
  const [stepUpCode, setStepUpCode] = useState("");
  const [stepUpVerifying, setStepUpVerifying] = useState(false);
  const [stepUpError, setStepUpError] = useState<string | null>(null);

  const shouldOpenRef = useRef(false);

  const handleSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token, metadata) => {
    setStatus("exchanging");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/plaid/exchange-public-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_token,
          institution: metadata.institution
            ? {
                institution_id: metadata.institution.institution_id,
                name: metadata.institution.name,
              }
            : null,
        }),
      });

      const data: { success?: boolean; accounts_connected?: number; error?: string } =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to connect account.");
      }

      setStatus("idle");
      setLinkToken(null);
      onConnected?.(data.accounts_connected ?? 0);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to connect account.");
    }
  }, [onConnected]);

  const handleExit = useCallback<PlaidLinkOnExit>((err) => {
    shouldOpenRef.current = false;
    setLinkToken(null);

    if (err) {
      setStatus("error");
      setErrorMessage(err.display_message ?? err.error_message ?? "Bank connection was cancelled.");
    } else {
      setStatus("idle");
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: handleExit,
  });

  useEffect(() => {
    if (shouldOpenRef.current && ready && linkToken) {
      shouldOpenRef.current = false;
      setStatus("awaiting_link");
      open();
    }
  }, [ready, linkToken, open]);

  // Actually fetch the link token from the server. The server independently re-checks
  // MFA status (defense in depth) even though we've already gated on the client below.
  async function fetchLinkToken() {
    setStatus("fetching_token");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const data: { link_token?: string; error?: string; code?: string } = await response.json();

      if (!response.ok || !data.link_token) {
        if (data.code === "mfa_not_enrolled") {
          setStatus("mfa_not_enrolled");
          return;
        }
        if (data.code === "mfa_step_up_required") {
          await beginStepUp();
          return;
        }
        throw new Error(data.error ?? "Failed to start bank connection.");
      }

      shouldOpenRef.current = true;
      setLinkToken(data.link_token);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to start bank connection.");
    }
  }

  async function beginStepUp() {
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
    const totpFactor = factorsData?.totp?.find((f) => f.status === "verified");

    if (factorsError || !totpFactor) {
      setStatus("mfa_not_enrolled");
      return;
    }

    setStepUpFactorId(totpFactor.id);
    setStepUpCode("");
    setStepUpError(null);
    setStatus("mfa_step_up");
  }

  async function handleConnectClick() {
    setStatus("checking_mfa");
    setErrorMessage(null);

    try {
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError || !aal) {
        setStatus("error");
        setErrorMessage("Could not verify your security status. Please try again.");
        return;
      }

      // No factor enrolled at all - block until the user sets one up.
      if (aal.nextLevel === "aal1") {
        setStatus("mfa_not_enrolled");
        return;
      }

      // Don't trust the generic aal2 label alone - Supabase reports aal2 for
      // a passkey-only sign-in even without a real TOTP challenge this
      // session, since WebAuthn is treated as a strong primary method.
      // Require an explicit "totp" entry in this session's AMR list instead.
      const authMethods = (aal.currentAuthenticationMethods ?? []).map((entry) =>
        typeof entry === "string" ? entry : entry.method
      );
      const hasVerifiedTotpThisSession = authMethods.includes("totp") || authMethods.includes("mfa/totp");

      if (!hasVerifiedTotpThisSession) {
        await beginStepUp();
        return;
      }

      await fetchLinkToken();
    } catch {
      setStatus("error");
      setErrorMessage("Could not verify your security status. Please try again.");
    }
  }

  async function handleStepUpVerify() {
    if (!stepUpFactorId || stepUpCode.length < 6) return;
    setStepUpVerifying(true);
    setStepUpError(null);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: stepUpFactorId,
      code: stepUpCode,
    });

    setStepUpVerifying(false);

    if (error) {
      setStepUpError("That code didn't work. Check your authenticator app and try again.");
      return;
    }

    setStepUpFactorId(null);
    setStepUpCode("");
    await fetchLinkToken();
  }

  const isBusy =
    status === "checking_mfa" ||
    status === "fetching_token" ||
    status === "awaiting_link" ||
    status === "exchanging";

  const buttonLabel: Record<ConnectStatus, string> = {
    idle: "Connect Bank",
    checking_mfa: "Checking security...",
    mfa_not_enrolled: "Connect Bank",
    mfa_step_up: "Connect Bank",
    fetching_token: "Preparing...",
    awaiting_link: "Opening...",
    exchanging: "Connecting...",
    error: "Try Again",
  };

  if (status === "mfa_not_enrolled") {
    return (
      <div className={className}>
        <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-[14px] font-medium text-foreground">Set up two-factor authentication first</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                To keep your linked accounts secure, MoneyOS requires two-factor authentication before
                connecting a bank.
              </p>
              <Link
                href="/profile/security"
                className="mt-3 inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
              >
                Set up now
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "mfa_step_up") {
    return (
      <div className={className}>
        <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-foreground">Verify it&apos;s you</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                Enter the 6-digit code from your authenticator app to continue.
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                value={stepUpCode}
                onChange={(e) => {
                  setStepUpCode(e.target.value.replace(/\D/g, ""));
                  setStepUpError(null);
                }}
                placeholder="000000"
                className="mt-3 w-full rounded-lg border-0 bg-background px-3 py-2.5 text-center text-[16px] tracking-[0.3em] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold"
              />
              {stepUpError && (
                <p className="mt-2 text-xs font-medium text-danger" role="alert">
                  {stepUpError}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  disabled={stepUpVerifying}
                  className="h-10 flex-1 rounded-lg bg-muted text-[13px] font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStepUpVerify}
                  disabled={stepUpVerifying || stepUpCode.length < 6}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-foreground text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {stepUpVerifying && <Loader2 size={12} className="animate-spin" />}
                  {stepUpVerifying ? "Verifying..." : "Verify"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleConnectClick}
        disabled={isBusy}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
      >
        {isBusy && <Loader2 size={16} className="animate-spin" />}
        {buttonLabel[status]}
      </button>

      {status === "error" && errorMessage && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm text-danger"
          role="alert"
        >
          {errorMessage}
        </motion.p>
      )}
    </div>
  );
}
