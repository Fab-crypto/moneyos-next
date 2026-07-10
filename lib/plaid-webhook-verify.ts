import "server-only";
import * as jose from "jose";
import crypto from "crypto";
import { plaidClient } from "@/lib/plaid";

// Plaid's own guidance: reject verification tokens older than 5 minutes
// to prevent a captured request being replayed later.
const MAX_TOKEN_AGE_SECONDS = 5 * 60;

/**
 * Confirms an incoming webhook request genuinely came from Plaid, not
 * someone spoofing it. Plaid signs every webhook with a JWT in the
 * `Plaid-Verification` header; this fetches Plaid's public key for that
 * signature, verifies it, checks the token isn't stale, and confirms
 * the signed body hash matches what was actually received.
 */
export async function verifyPlaidWebhook(
  rawBody: string,
  verificationHeader: string | null
): Promise<boolean> {
  if (!verificationHeader) {
    console.error("[plaid-webhook] missing Plaid-Verification header");
    return false;
  }

  try {
    const { kid } = jose.decodeProtectedHeader(verificationHeader);
    if (!kid) {
      console.error("[plaid-webhook] verification header missing key id");
      return false;
    }

    const keyResponse = await plaidClient.webhookVerificationKeyGet({ key_id: kid });
    const key = await jose.importJWK(keyResponse.data.key as jose.JWK, "ES256");

    const { payload } = await jose.jwtVerify(verificationHeader, key);

    const iat = payload.iat as number | undefined;
    if (!iat || Date.now() / 1000 - iat > MAX_TOKEN_AGE_SECONDS) {
      console.error("[plaid-webhook] verification token too old, possible replay");
      return false;
    }

    const expectedHash = payload.request_body_sha256 as string | undefined;
    const actualHash = crypto.createHash("sha256").update(rawBody).digest("hex");

    if (!expectedHash || expectedHash !== actualHash) {
      console.error("[plaid-webhook] request body hash mismatch");
      return false;
    }

    return true;
  } catch (err) {
    console.error("[plaid-webhook] signature verification failed:", err);
    return false;
  }
}