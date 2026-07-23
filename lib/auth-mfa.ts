import { supabase } from "@/lib/supabase";

export type MfaStepUpCheck =
  | { required: false }
  | { required: true; factorId: string; error: null }
  | { required: true; factorId: null; error: string };

/**
 * Checks whether the current session needs an MFA step-up before it can be
 * trusted for a sensitive action (updating the password, etc). A session
 * can be fully authenticated (AAL1) yet still short of AAL2 right after
 * sign-in or a password-recovery link, even when the account has a
 * verified TOTP factor - Supabase never auto-elevates those flows.
 */
export async function checkMfaStepUpRequired(): Promise<MfaStepUpCheck> {
  const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError) {
    console.error("[auth-mfa] AAL check failed:", aalError);
    return { required: false };
  }

  if (aal.nextLevel !== "aal2" || aal.currentLevel === "aal2") {
    return { required: false };
  }

  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  const factor = factorsData?.totp?.find((f) => f.status === "verified");

  if (factorsError || !factor) {
    console.error("[auth-mfa] expected a verified MFA factor but found none:", factorsError);
    return {
      required: true,
      factorId: null,
      error: "Couldn't load your two-factor setup. Please try again.",
    };
  }

  return { required: true, factorId: factor.id, error: null };
}
