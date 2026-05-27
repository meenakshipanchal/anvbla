import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin (and its @google-cloud/firestore dep) use Node-native features
  // and an optional @opentelemetry/api require that breaks when bundled. Opt it
  // out of Server Component bundling so Next uses native require.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
