import "server-only";
import { adminDb } from "./firebase-admin";

/* Chat between a passenger and a driver. A thread is opened when a booking is
   made (see createBooking). Threads + messages are top-level collections. */

export type Thread = {
  id: string;
  rideId: string;
  route: string;
  passengerId: string;
  passengerName: string;
  driverId: string;
  driverName: string;
  lastText?: string;
  lastAt?: number;
  lastSenderId?: string;
  // Per-user last-read timestamp. A thread is "unread" for `uid` when its
  // lastAt > lastReadAt[uid] AND the last sender isn't `uid`.
  lastReadAt?: Record<string, number>;
  // Per-user last-typed timestamp. Used to show the "… is typing" indicator
  // when the other participant's value is within the last few seconds.
  typing?: Record<string, number>;
};

export type Message = {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
};

export async function listThreadsForUser(uid: string): Promise<Thread[]> {
  if (!adminDb) return [];
  try {
    const [asPassenger, asDriver] = await Promise.all([
      adminDb.collection("threads").where("passengerId", "==", uid).get(),
      adminDb.collection("threads").where("driverId", "==", uid).get(),
    ]);
    const map = new Map<string, Thread>();
    for (const d of [...asPassenger.docs, ...asDriver.docs]) {
      map.set(d.id, { id: d.id, ...(d.data() as Omit<Thread, "id">) });
    }
    return [...map.values()].sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0));
  } catch {
    return [];
  }
}

export async function getThread(id: string): Promise<Thread | null> {
  if (!adminDb) return null;
  try {
    const d = await adminDb.collection("threads").doc(id).get();
    return d.exists ? { id: d.id, ...(d.data() as Omit<Thread, "id">) } : null;
  } catch {
    return null;
  }
}

export async function listMessages(threadId: string): Promise<Message[]> {
  if (!adminDb) return [];
  try {
    const snap = await adminDb.collection("messages").where("threadId", "==", threadId).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Message, "id">) }))
      .sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function sendMessage(
  threadId: string,
  sender: { id: string; name: string },
  text: string
): Promise<string> {
  if (!adminDb) throw new Error("Firestore is not configured.");
  const now = Date.now();
  const ref = await adminDb.collection("messages").add({
    threadId,
    senderId: sender.id,
    senderName: sender.name,
    text,
    createdAt: now,
  });
  // Stamp the sender so unread-count logic knows whether the latest activity
  // came from "me" (already read) or the other person (counts as unread).
  // NOTE: dot-notation keys (`lastReadAt.${uid}`) only resolve to nested paths
  // via .update() — .set({merge:true}) would treat them as literal field names.
  await adminDb.collection("threads").doc(threadId).update({
    lastText: text,
    lastAt: now,
    lastSenderId: sender.id,
    [`lastReadAt.${sender.id}`]: now, // sender has obviously "read" their own message
  });
  return ref.id;
}

export async function markThreadRead(threadId: string, uid: string): Promise<void> {
  if (!adminDb) return;
  try {
    // .update() interprets the dotted key as a nested field path.
    await adminDb.collection("threads").doc(threadId).update({ [`lastReadAt.${uid}`]: Date.now() });
  } catch {
    /* best-effort */
  }
}

export async function setTyping(threadId: string, uid: string): Promise<void> {
  if (!adminDb) return;
  try {
    await adminDb.collection("threads").doc(threadId).update({ [`typing.${uid}`]: Date.now() });
  } catch {
    /* best-effort */
  }
}

// Threads with new activity the user hasn't opened yet. Used for the inbox badge.
export async function countUnreadThreadsForUser(uid: string): Promise<number> {
  const threads = await listThreadsForUser(uid);
  return threads.filter((t) => {
    if (!t.lastAt) return false;
    if (t.lastSenderId === uid) return false; // my own message doesn't count
    const seen = t.lastReadAt?.[uid] ?? 0;
    return t.lastAt > seen;
  }).length;
}
