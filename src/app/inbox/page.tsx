import Link from "next/link";
import { Mail, Search } from "@/components/Icons";
import { avatarColor, initials } from "@/lib/data";
import { getCurrentUser } from "@/lib/session";
import { listThreadsForUser } from "@/lib/messages";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const user = await getCurrentUser();
  const threads = user ? await listThreadsForUser(user.uid) : [];

  return (
    <div className="wrap py-12 md:py-16">
      <h1 className="font-bold">Inbox</h1>
      <p className="mt-1 text-muted">Chats with your drivers and passengers.</p>

      {threads.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-line bg-bgsoft px-6 py-16 text-center">
          <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-sky-soft text-blue">
            <Mail width={30} height={30} />
          </span>
          <h2 className="font-semibold">No messages yet</h2>
          <p className="mt-1 max-w-sm text-muted">
            When you book or publish a ride, a chat opens with your co-traveller and shows up here.
          </p>
          <Link href="/search" className="btn btn-primary mt-5">
            <Search /> Find a ride
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {threads.map((t) => {
            const other = t.passengerId === user!.uid ? t.driverName : t.passengerName;
            return (
              <Link
                key={t.id}
                href={`/inbox/${t.id}`}
                className="card flex w-full max-w-full items-start gap-3 overflow-hidden p-4 hover:border-sky"
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full font-bold text-white"
                  style={{ background: avatarColor(other || "?") }}
                >
                  {initials(other || "?")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{other}</div>
                  <div className="nav-label truncate text-muted">{t.route}</div>
                  <div className="mt-1 line-clamp-1 text-muted break-words">
                    {t.lastText || "Say hello 👋"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
