import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";

/* Server-side current-user, verified from a Firebase session cookie.
   The cookie is httpOnly and minted by /api/auth/session after a successful
   Google sign-in. Named "__session" so it also works behind Firebase Hosting. */

export const SESSION_COOKIE = "__session";

export type SessionUser = { uid: string; name: string; email: string; picture: string | null };

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (!adminAuth) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(token, true);
    return {
      uid: decoded.uid,
      name: (decoded.name as string) ?? "Traveller",
      email: decoded.email ?? "",
      picture: (decoded.picture as string) ?? null,
    };
  } catch {
    return null;
  }
}
