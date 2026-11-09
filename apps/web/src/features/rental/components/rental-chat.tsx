"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/env";
import { formatDateTime } from "@/lib/date";
import type { ChatMessage } from "../types";

type Row = { id: number; sender_id: string; body: string; created_at: string };
const toMsg = (r: Row): ChatMessage => ({ id: r.id, senderId: r.sender_id, body: r.body, createdAt: r.created_at });

/** 거래별 1:1 채팅. Supabase Realtime으로 상대 메시지를 바로 받는다. */
export function RentalChat({ rentalId, myId, counterpartName, initial }: { rentalId: string; myId: string; counterpartName: string; initial: ChatMessage[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const add = (m: ChatMessage) => setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));

  useEffect(() => {
    if (!hasSupabase()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`rental-chat-${rentalId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `rental_id=eq.${rentalId}` },
        (payload) => add(toMsg(payload.new as Row)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [rentalId]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return; // 처음 들어왔을 때는 페이지 위쪽(상태·버튼)을 보여준다
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error } = await createClient()
      .from("messages")
      .insert({ rental_id: rentalId, sender_id: myId, body })
      .select("id,sender_id,body,created_at")
      .single();
    setSending(false);
    if (error) return setError("메시지를 보내지 못했어요.");
    add(toMsg(data as Row));
    setText("");
  }

  return (
    <section className="px-4">
      <h2 className="mb-3 text-[15px] font-semibold">@{counterpartName}님과 채팅</h2>
      <div className="space-y-2 rounded-2xl bg-neutral-50 p-3">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-neutral-400">만날 시간과 장소를 이야기해 보세요.</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === myId;
            return (
              <div key={m.id} className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                <p
                  className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[14px] leading-snug ${
                    mine ? "rounded-br-md bg-neutral-900 text-white" : "rounded-bl-md bg-white"
                  }`}
                >
                  {m.body}
                </p>
                <span className="shrink-0 text-[10px] text-neutral-400">{formatDateTime(m.createdAt)}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder="메시지 보내기"
          className="h-11 flex-1 rounded-full border border-neutral-200 px-4 text-[14px] outline-none focus:border-neutral-900"
        />
        <button type="submit" disabled={!text.trim() || sending} aria-label="보내기" className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-white disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
      </form>
      {error && <p className="mt-1 text-[12px] text-red-600">{error}</p>}
    </section>
  );
}
