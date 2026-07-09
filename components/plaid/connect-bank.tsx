"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess, type PlaidLinkOnExit } from "react-plaid-link";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

type ConnectStatus = "idle" | "fetching_token" | "awaiting_link" | "exchanging" | "error";

interface ConnectBankProps {
  onConnected?: (accountsConnected: number) => void;
  className?: string;
}

export function ConnectBank({ onConnected, className }: ConnectBankProps) {
  const [status, setStatus] = useState<ConnectStatus>("idle");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  async function handleConnectClick() {
    setStatus("fetching_token");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const data: { link_token?: string; error?: string } = await response.json();

      if (!response.ok || !data.link_token) {
        throw new Error(data.error ?? "Failed to start bank connection.");
      }

      shouldOpenRef.current = true;
      setLinkToken(data.link_token);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to start bank connection.");
    }
  }

  const isBusy = status === "fetching_token" || status === "awaiting_link" || status === "exchanging";

  const buttonLabel: Record<ConnectStatus, string> = {
    idle: "Connect Bank",
    fetching_token: "Preparing...",
    awaiting_link: "Opening...",
    exchanging: "Connecting...",
    error: "Try Again",
  };

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