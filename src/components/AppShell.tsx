"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import PwaProvider from "./PwaProvider";
import NotificationPrompt from "./NotificationPrompt";

// Routes that render WITHOUT the app chrome (header / sidebar / footer / bottom nav).
const BARE_ROUTES = ["/sign-in", "/sign-up", "/sso-callback"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some((r) => pathname.startsWith(r));

  if (bare) {
    return (
      <>
        <main className="flex min-h-[100dvh] items-center justify-center bg-bgsoft px-4 py-8">{children}</main>
        <PwaProvider />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 overflow-x-hidden">{children}</main>
      <Footer />
      <BottomNav />
      <PwaProvider />
      <NotificationPrompt />
    </>
  );
}
