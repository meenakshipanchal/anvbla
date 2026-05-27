import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { countPendingRequestsForDriver } from "@/lib/bookings";
import { countUnreadThreadsForUser } from "@/lib/messages";

/* Unified counts for in-app notification badges + polling.
   Returns:
     requests — pending ride-bookings the driver hasn't responded to
     unread   — chat threads with new messages the user hasn't opened
   Single endpoint so the BottomNav makes ONE round-trip per tick. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ requests: 0, unread: 0 });

  const [requests, unread] = await Promise.all([
    countPendingRequestsForDriver(user.uid),
    countUnreadThreadsForUser(user.uid),
  ]);
  return NextResponse.json({ requests, unread });
}
