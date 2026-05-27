import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getThread, listMessages } from "@/lib/messages";
import Chat from "./Chat";

export const metadata = { title: "Chat" };

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/inbox/${id}`);

  const thread = await getThread(id);
  if (!thread || (thread.passengerId !== user.uid && thread.driverId !== user.uid)) notFound();

  const messages = await listMessages(id);
  const other = thread.passengerId === user.uid ? thread.driverName : thread.passengerName;

  return (
    <div className="wrap max-w-[760px] py-6 md:py-10">
      <div className="mb-3 text-sm text-muted">
        <Link href="/inbox" className="hover:text-blue">
          ← Inbox
        </Link>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-bold">{other}</h1>
          <p className="text-muted">{thread.route}</p>
        </div>
        <Link href={`/ride/${thread.rideId}`} className="btn btn-outline px-4 py-2">
          View ride
        </Link>
      </div>

      <Chat threadId={id} meId={user.uid} initial={messages} />
    </div>
  );
}
