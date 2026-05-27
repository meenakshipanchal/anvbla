import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getThread, listMessages, markThreadRead, sendMessage, setTyping } from "@/lib/messages";
import { sendPush } from "@/lib/push";

// "is typing" pings expire if the other side hasn't sent one within this window.
const TYPING_WINDOW_MS = 4000;

function isParticipant(thread: { passengerId: string; driverId: string }, uid: string) {
  return thread.passengerId === uid || thread.driverId === uid;
}

/* GET ?threadId=… → messages in a thread (participants only). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const threadId = req.nextUrl.searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "Missing thread." }, { status: 400 });

  const thread = await getThread(threadId);
  if (!thread || !isParticipant(thread, user.uid)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const messages = await listMessages(threadId);
  const otherUid = thread.passengerId === user.uid ? thread.driverId : thread.passengerId;
  const otherTypingAt = thread.typing?.[otherUid] ?? 0;
  const otherTyping = Date.now() - otherTypingAt < TYPING_WINDOW_MS;
  return NextResponse.json({ messages, typing: otherTyping });
}

/* POST { threadId, text } → send a message (participants only). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { threadId, text } = await req.json().catch(() => ({}));
  const body = typeof text === "string" ? text.trim().slice(0, 1000) : "";
  if (!threadId || !body) return NextResponse.json({ error: "Empty message." }, { status: 400 });

  const thread = await getThread(String(threadId));
  if (!thread || !isParticipant(thread, user.uid)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const id = await sendMessage(String(threadId), { id: user.uid, name: user.name }, body);
  // Push the new message to the OTHER participant. Tag by thread so multiple
  // messages from the same chat collapse into one notification on the OS.
  const otherUid = thread.passengerId === user.uid ? thread.driverId : thread.passengerId;
  void sendPush(otherUid, {
    title: user.name || "New message",
    body,
    url: `/inbox/${threadId}`,
    tag: `chat-${threadId}`,
  });
  return NextResponse.json({ id });
}

/* PATCH { threadId, action: "markRead" } — record that the signed-in user has
   opened this thread so it stops counting toward their unread badge. */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { threadId, action } = await req.json().catch(() => ({}));
  if (!threadId || (action !== "markRead" && action !== "typing")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const thread = await getThread(String(threadId));
  if (!thread || !isParticipant(thread, user.uid)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (action === "markRead") await markThreadRead(String(threadId), user.uid);
  else await setTyping(String(threadId), user.uid);
  return NextResponse.json({ ok: true });
}
