"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";

type Msg = { id: string; senderId: string; senderName: string; text: string; createdAt: number };
// Adds a transient `pending` flag for the optimistic message rendering only —
// not stored or sent anywhere, just toggles the local "sending…" tick.
type LocalMsg = Msg & { pending?: boolean };

export default function Chat({ threadId, meId, initial }: { threadId: string; meId: string; initial: Msg[] }) {
  const [msgs, setMsgs] = useState<LocalMsg[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [othersTyping, setOthersTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  // Last time we sent an "is typing" ping; throttled to avoid hammering the API.
  const lastTypingPingRef = useRef(0);

  async function load() {
    if (document.hidden) return; // skip while tab is in the background
    try {
      const res = await fetch(`/api/messages?threadId=${threadId}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        // Preserve any still-pending optimistic messages that the server hasn't
        // returned yet (e.g. POST in flight). Once they appear in the server
        // list, the optimistic copy is filtered out by createdAt match.
        setMsgs((prev) => {
          const server: Msg[] = d.messages || [];
          const pending = prev.filter(
            (m) => m.pending && !server.some((s) => s.text === m.text && s.senderId === m.senderId)
          );
          return [...server, ...pending];
        });
        setOthersTyping(!!d.typing);
      }
    } catch {
      /* ignore */
    }
  }

  function pingTyping() {
    const now = Date.now();
    // Send at most once every 2 seconds — the server window is 4s so we stay live.
    if (now - lastTypingPingRef.current < 2000) return;
    lastTypingPingRef.current = now;
    fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, action: "typing" }),
    }).catch(() => {});
  }

  // Aggressive polling so new messages feel near-instant (~1s).
  // Pauses on hidden tab; resumes when the user returns to the page.
  useEffect(() => {
    const t = setInterval(load, 1000);
    const onVis = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Mark this thread as read for the signed-in user (clears the inbox badge).
  // Fires on open and again on every render where new messages arrived, so
  // the badge stays clear while the user is actively in the chat.
  useEffect(() => {
    fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, action: "markRead" }),
    }).catch(() => {});
  }, [threadId, msgs.length]);

  // First render should JUMP to the latest message (WhatsApp/iMessage style),
  // not slowly animate up from the top. After that, new incoming/sent messages
  // can animate smoothly so the user notices them arriving.
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: didInitialScrollRef.current ? "smooth" : "auto",
      block: "end",
    });
    didInitialScrollRef.current = true;
  }, [msgs, othersTyping]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || sending) return;

    // Optimistic UI: render the message instantly with a temp id, then send.
    // The server copy will replace it on the next poll (matched by text+sender).
    const tempId = `tmp-${Date.now()}`;
    const optimistic: LocalMsg = {
      id: tempId,
      senderId: meId,
      senderName: "",
      text: t,
      createdAt: Date.now(),
      pending: true,
    };
    setMsgs((prev) => [...prev, optimistic]);
    setText("");
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, text: t }),
      });
      if (res.ok) {
        // Trigger a fresh load to swap the optimistic copy for the server one.
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || (res.status === 401 ? "Please sign in again." : "Couldn’t send message."));
        // Roll back the optimistic message + restore the input so the user can retry.
        setMsgs((prev) => prev.filter((m) => m.id !== tempId));
        setText(t);
      }
    } catch {
      toast("Network error — please try again.");
      setMsgs((prev) => prev.filter((m) => m.id !== tempId));
      setText(t);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[60vh] flex-col rounded-2xl border border-line bg-white">
      <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
        {msgs.length === 0 && <p className="py-8 text-center text-muted">No messages yet — say hello 👋</p>}
        {msgs.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                  mine ? "bg-blue text-white" : "bg-bgsoft text-ink"
                }`}
              >
                {!mine && <div className="mb-0.5 text-[11px] font-semibold text-muted">{m.senderName}</div>}
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
              </div>
            </div>
          );
        })}
        {othersTyping && (
          <div className="flex justify-start">
            <div className="flex max-w-[78%] items-center gap-1 rounded-2xl bg-bgsoft px-3.5 py-2.5">
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
              <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-3">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value) pingTyping();
          }}
          placeholder="Type a message…"
          className="flex-1 rounded-full border-[1.5px] border-line px-4 py-2.5 outline-none transition focus:border-blue"
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn btn-primary px-5 py-2.5 disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
