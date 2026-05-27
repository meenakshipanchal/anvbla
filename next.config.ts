import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin (and its @google-cloud/firestore dep) use Node-native features
  // and an optional @opentelemetry/api require that breaks when bundled. Opt it
  // out of Server Component bundling so Next uses native require.
  serverExternalPackages: ["firebase-admin"],

  // Cross-Origin-Opener-Policy: Firebase signInWithPopup needs to read
  // `window.closed` on the Google popup to detect close. Vercel's default
  // COOP (`same-origin`) blocks that, breaking sign-in. `same-origin-allow-popups`
  // keeps the isolation everywhere else while letting popups we opened ourselves
  // (the Google OAuth one) talk back to us.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
