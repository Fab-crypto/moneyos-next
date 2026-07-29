import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Content-Security-Policy, scoped to the origins this app actually talks to.
// Kept as a readable directive list; edit the relevant line when adding an
// integration rather than loosening a whole source.
//
// script-src includes 'unsafe-inline' because Next injects inline bootstrap
// scripts and there is no nonce middleware yet. This is the one weak spot — the
// documented next hardening step is nonce-based CSP (middleware sets a per-
// request nonce; drop 'unsafe-inline' then). Everything else is tightly scoped.
// Next's dev server (HMR/Fast Refresh) needs 'unsafe-eval'; production does not.
// Allow it in development only so local dev works while prod stays strict.
const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devEval} https://va.vercel-scripts.com https://cdn.plaid.com https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Supabase (REST + realtime wss), Sentry ingest, Vercel vitals, Plaid, Stripe.
  "connect-src 'self' https://abkccdbbdfjrfskrssil.supabase.co wss://abkccdbbdfjrfskrssil.supabase.co https://o4511707254161408.ingest.us.sentry.io https://*.ingest.us.sentry.io https://vitals.vercel-insights.com https://*.plaid.com https://api.stripe.com",
  // Plaid Link opens in an iframe; Stripe.js frames.
  "frame-src 'self' https://*.plaid.com https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // Force HTTPS for two years, including subdomains, and allow preload-list
  // inclusion. Safe once the domain is HTTPS-only (Vercel is).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Never let a browser MIME-sniff a response into an executable type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Legacy clickjacking defense (frame-ancestors 'none' in the CSP is the modern
  // equivalent). Does not affect the Capacitor iOS WebView, which loads the app
  // as top-level content, not in a frame.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop access to device features the app doesn't use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to every route.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "moneyos",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
