import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { saveFcmToken } from "@/lib/push";

/* POST { token } — register an FCM device token for the signed-in user.
   Called once after the browser grants notification permission. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { token } = await req.json().catch(() => ({}));
  if (typeof token !== "string" || token.length < 10) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  await saveFcmToken(user.uid, token);
  return NextResponse.json({ ok: true });
}
