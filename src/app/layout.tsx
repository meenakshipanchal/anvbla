import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Poppins } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import FirebaseProvider from "@/components/FirebaseProvider";
import GoogleOneTap from "@/components/GoogleOneTap";
import { getCurrentUser } from "@/lib/session";
import type { AuthUser } from "@/lib/useAuthUser";

// Google Identity Services (One Tap). Loaded once at app boot via <Script>
// so it's parsed in parallel with the page hydration — by the time
// CustomAuth's effect fires, window.google is already there and the prompt
// can show instantly instead of waiting on a fresh script download.
const ONE_TAP_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "BlaBlue",
  title: {
    default: "BlaBlue — Share rides, save money with carpooling in India",
    template: "%s · BlaBlue",
  },
  description:
    "Find low-cost carpool rides across India. Search, book and travel with verified members — or publish your ride and share the cost.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BlaBlue",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#054752",
  width: "device-width",
  initialScale: 1,
  // Lock the zoom factor — gives the app-like feel users expect from a PWA
  // (no accidental pinch-zoom, no auto-zoom-on-focus when paired with the
  // 16px-input rule in globals.css). iOS still respects assistive zoom
  // requested via OS Settings, so accessibility isn't blocked.
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Auth is entirely Firebase (Google) — no Clerk provider needed.

  // Server-verified user (from __session cookie). Threaded into AppShell so the
  // navbar paints the correct state — avatar vs Log in — on the very first
  // frame, instead of flashing "Log in" while the Firebase client SDK
  // rehydrates. The Firebase client takes over once it's ready.
  const sessionUser = await getCurrentUser();
  const initialUser: AuthUser | null = sessionUser
    ? {
        name: sessionUser.name,
        email: sessionUser.email,
        imageUrl: sessionUser.picture,
        provider: "firebase",
      }
    : null;
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <head>
        {/* Warm the TLS + DNS connection to Google Identity Services before
            any script needs it — shaves a few hundred ms off One Tap. */}
        {ONE_TAP_CLIENT_ID && (
          <>
            <link rel="preconnect" href="https://accounts.google.com" />
            <link rel="dns-prefetch" href="https://accounts.google.com" />
          </>
        )}
      </head>
      <body className="flex min-h-full flex-col">
        <FirebaseProvider>
          <GoogleOneTap />
          <AppShell initialUser={initialUser}>{children}</AppShell>
        </FirebaseProvider>
        {ONE_TAP_CLIENT_ID && (
          <Script
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
