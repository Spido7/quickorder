// next.config.ts
// API verified from node_modules/@ducanh2912/next-pwa/dist/index.d.ts:
//   withPWAInit(pluginOptions) => (nextConfig) => NextConfig
//
// Next.js 16 uses Turbopack by default in dev. @ducanh2912/next-pwa injects
// a webpack plugin which only runs during `next build`. In dev we keep
// Turbopack fast-HMR; the service worker is intentionally disabled in dev.

import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const withPWA = withPWAInit({
  dest: "public",       // sw.js + workbox files land in /public
  register: true,       // auto-registers the SW via a script injected by the plugin
  reloadOnOnline: true, // reload page when connectivity is restored
  // Disable the SW in development — avoids stale cache during local work
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    // Never cache Supabase API calls — always go to the network
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: "NetworkOnly",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // Silence the Turbopack/webpack coexistence warning in dev.
  // The PWA plugin's webpack config is skipped in dev (disable: true above)
  // so there is no actual conflict at runtime.
  turbopack: {},
};

export default withPWA(nextConfig);
