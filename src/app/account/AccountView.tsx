"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shield, Seat, Ticket, User } from "@/components/Icons";
import { useAuthUser } from "@/lib/useAuthUser";
import { toast } from "@/lib/toast";

/* Profile UI driven by the merged auth state (Firebase Google). The "edit
   profile / verify account" menu items are kept as placeholders for now —
   they're known dead-ends. The two pieces the user wanted live above the
   menu: a "Joined since …" tag and an editable mini-bio so passengers can
   read something about the driver before booking. */

const MENU = [
  { Icon: User, label: "Edit profile", sub: "Name, photo, bio" },
  { Icon: Shield, label: "Verify your account", sub: "Add ID, phone & email" },
  { Icon: Ticket, label: "Payments & refunds", sub: "Methods and history" },
  { Icon: Seat, label: "Vehicles", sub: "Manage your cars" },
];

const BIO_MAX = 280;

type Profile = {
  bio: string;
  joinedAt: number | null;
};

function formatJoined(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function AccountView() {
  const { user, ready } = useAuthUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftBio, setDraftBio] = useState("");
  const [saving, setSaving] = useState(false);

  // Pull the server-side profile (bio + joinedAt) once we know there's a user.
  // Bio lives in Firestore; joinedAt comes from Firebase Auth metadata.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    // cache: 'no-store' so the browser HTTP cache never serves a stale
    // pre-save snapshot of the bio after the user comes back from a refresh.
    fetch("/api/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then((d: { profile: Profile | null }) => {
        if (!alive) return;
        setProfile(d.profile);
        setDraftBio(d.profile?.bio ?? "");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  async function saveBio() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: draftBio }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Couldn’t save your bio.");
        return;
      }
      setProfile((p) => (p ? { ...p, bio: data.bio ?? draftBio } : p));
      setEditing(false);
      toast("Bio updated.");
    } catch {
      toast("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return <div className="wrap py-12 md:py-16 text-center text-muted">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="wrap py-12 md:py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-8 text-center">
          <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-sky-soft text-blue">
            <User width={30} height={30} />
          </span>
          <h1 className="text-xl font-bold">Log in to BlaBlue</h1>
          <p className="mt-2 text-muted">
            Sign in with Google to book rides, message drivers, and manage your trips.
          </p>
          <Link href="/sign-in" className="btn btn-primary mt-6 w-full">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const joinedLabel = formatJoined(profile?.joinedAt ?? null);
  const bio = profile?.bio ?? "";

  return (
    <div className="wrap py-12 md:py-16">
      {/* Identity card — avatar, name, email, joined-since chip */}
      <div className="card flex items-start gap-4 p-6">
        {user.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt={user.name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-sherpa text-xl font-bold text-white">
            {user.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">{user.name}</h1>
          {user.email && <div className="text-sm text-muted">{user.email}</div>}
          {joinedLabel && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-bgsoft px-2.5 py-1 text-xs font-semibold text-muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              Since {joinedLabel}
            </span>
          )}
        </div>
      </div>

      {/* About you — editable bio so passengers can read something before booking */}
      <div className="card mt-5 p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">About you</h2>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm font-semibold text-blue hover:underline"
            >
              {bio ? "Edit" : "Add"}
            </button>
          )}
        </div>

        {editing ? (
          <>
            <textarea
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition focus:border-blue"
              rows={4}
              maxLength={BIO_MAX}
              value={draftBio}
              onChange={(e) => setDraftBio(e.target.value)}
              placeholder="A short bio passengers see when they view your profile — preferred music, smoker/non-smoker, languages you speak…"
            />
            <div className="mt-1 text-right text-xs text-muted">
              {draftBio.length}/{BIO_MAX}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftBio(bio);
                  setEditing(false);
                }}
                disabled={saving}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveBio}
                disabled={saving}
                className="btn btn-primary disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        ) : bio ? (
          <p className="whitespace-pre-wrap text-[15px] text-ink">{bio}</p>
        ) : (
          <p className="text-muted">
            Add a short bio so passengers know a bit about you before they request a seat.
          </p>
        )}
      </div>

      {/* Legacy menu — kept as placeholders. Hooked up later. */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
        {MENU.map(({ Icon, label, sub }, i) => (
          <button
            key={label}
            className={`flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-bgsoft ${
              i ? "border-t border-line" : ""
            }`}
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-sky-soft text-blue">
              <Icon />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{label}</span>
              <span className="block text-sm text-muted">{sub}</span>
            </span>
            <span className="text-muted">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
