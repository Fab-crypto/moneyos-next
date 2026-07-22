import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "dev.moneyos.app",
  appName: "MoneyOS",
  webDir: "public",
  // MoneyOS is a full Next.js app with server-rendered pages and API routes
  // (Plaid, Supabase), so it can't be statically exported into the native
  // bundle. Instead, the native shell just loads the live production site
  // in a WebView - this is the standard "wrap an existing web app" pattern.
  server: {
    url: "https://moneyos.dev",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
