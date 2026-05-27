import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

/* Returns the server-verified user (decoded from the __session cookie) so the
   client can render the right header chrome even when the Firebase client SDK
   hasn't yet restored its session for the current tab/browser. Returns
   { user: null } when no valid cookie is present. */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    user: user
      ? { uid: user.uid, name: user.name, email: user.email, picture: user.picture }
      : null,
  });
}
