import { redirect } from "next/navigation";

/* Legacy OAuth-redirect landing. Firebase Google sign-in uses a popup, so this
   route is no longer part of the flow — send anyone who lands here onward. */
export default function SSOCallbackPage() {
  redirect("/trips");
}
