"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { checkMfaStepUpRequired } from "@/lib/auth-mfa";
import { MfaVerifyForm } from "@/components/auth/MfaVerifyForm";

const DEFAULT_NEXT = "/dashboard";

function MfaCheckInner() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? DEFAULT_NEXT;

  const [stage, setStage] = useState<"checking" | "mfa">("checking");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // OAuth sign-in (Google, Apple) hands back a session the same way
      // password sign-in does - fully authenticated, but never elevated
      // past AAL1. This is the OAuth callback's landing spot to close that
      // same gap for accounts with a verified TOTP factor.
      const stepUp = await checkMfaStepUpRequired();

      if (stepUp.required) {
        setFactorId(stepUp.factorId);
        setMfaError(stepUp.error);
        setStage("mfa");
        return;
      }

      window.location.href = next;
    })();
  }, [next]);

  if (stage === "checking") {
    return <main className="min-h-screen bg-background" />;
  }

  return (
    <MfaVerifyForm
      factorId={factorId}
      initialError={mfaError}
      subtitle="Enter the code from your authenticator app to finish signing in."
      onVerified={() => {
        window.location.href = next;
      }}
    />
  );
}

export default function MfaCheckPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <MfaCheckInner />
    </Suspense>
  );
}
