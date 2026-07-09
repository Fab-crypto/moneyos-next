import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Decodes a legacy JWT-format Supabase key (anon or service_role) and
 * returns its `role` claim, without verifying the signature — we only
 * need to confirm which role this key claims to be, not re-validate it
 * (Supabase itself does that when the request is made).
 */
function getLegacyJwtRole(key: string): string | null {
  const parts = key.split(".");
  if (parts.length !== 3) return null; // not a JWT at all

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

/**
 * Validates that a key is actually a service-role-equivalent key —
 * either the new opaque `sb_secret_...` format, or a legacy JWT whose
 * `role` claim is literally "service_role". Anything else (a
 * publishable key, an anon JWT, garbage) is rejected here instead of
 * being silently used and quietly failing every write with an RLS
 * error, as happened when this only checked for one specific mistake.
 */
function assertIsServiceRoleKey(key: string) {
  if (key.startsWith("sb_secret_")) return;

  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is set to a publishable key (sb_publishable_...). " +
        "It needs to be a secret key (sb_secret_...) from Settings > API Keys."
    );
  }

  const legacyRole = getLegacyJwtRole(key);
  if (legacyRole === "service_role") return;

  if (legacyRole) {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY is a legacy JWT, but its role claim is "${legacyRole}", not ` +
        `"service_role". This is very likely the anon key pasted into the wrong variable.`
    );
  }

  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY doesn't look like a valid service-role or secret key " +
      "(expected an sb_secret_... key or a service_role JWT)."
  );
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  assertIsServiceRoleKey(serviceRoleKey);

  console.log("[admin-client] service role key validated", {
    keyPrefix: serviceRoleKey.slice(0, 12),
  });

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}