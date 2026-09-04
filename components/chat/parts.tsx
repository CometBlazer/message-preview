"use client";

import React from "react";
import type { Message, Platform, PlatformTheme, Sender, Settings, Thread } from "@/lib/types";
import type { Row } from "@/lib/grouping";
import { bubbleRadius, hasTail } from "@/lib/grouping";
import { initials, nameColor, timeOfDay } from "@/lib/util";
import { Battery, Cellular, Wifi, AndroidNav } from "@/components/icons";

export const DRAFT_ID = "__draft";

export interface ChatProps {
  thread: Thread;
  rows: Row[];
  platform: Platform;
  theme: PlatformTheme;
  settings: Settings;
  pov: Sender;
  /** text shown in the input field (empty when the draft renders as a bubble) */
  barText: string;
}

/** Who the phone's owner is looking at. Flips with POV. */
export function other(thread: Thread, pov: Sender) {
  return pov === "me"
    ? { name: thread.name, avatar: thread.avatar, handle: thread.handle }
    : { name: thread.myName || "You", avatar: thread.myAvatar, handle: "" };
}

export function Avatar({
  name,
  src,
  className = "hdr-av",
  style,
}: {
  name: string;
  src?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={{ background: src ? undefined : nameColor(name), ...style }}>
      {src ? <img src={src} alt="" /> : initials(name)}
    </div>
  );
}

export function StatusBar({ platform, settings }: { platform: Platform; settings: Settings }) {
  if (!settings.showStatusBar) return null;
  if (platform.os === "android") {
    return (
      <div className="sb android">
        <span>{settings.clockLabel}</span>
        <span className="sb-icons">
          <Cellular size={14} />
          <Wifi size={13} />
          <Battery size={20} />
        </span>
      </div>
    );
  }
  return (
    <div className="sb">
      <span>{settings.clockLabel}</span>
      <i className="island" />
      <span className="sb-icons">
        <Cellular />
        <Wifi />
        <Battery />
      </span>
    </div>
  );
}

export function HomeIndicator({ platform }: { platform: Platform }) {
  if (platform.os === "android") {
    return (
      <div className="nav-bar">
        <AndroidNav />
      </div>
    );
  }
  return (
    <div className="home-bar">
      <i />
    </div>
  );
}

/** iMessage-style "Today 9:41 AM" — day in bold, time regular. */
export function Divider({ text, chip }: { text: string; chip?: boolean }) {
  if (chip) return <div className="divider chip">{text}</div>;
  const m = text.match(/^(Today|Yesterday|[A-Z][a-z]+day|[A-Z][a-z]{2} \d{1,2}(?:, \d{4})?)\s(.*)$/);
  return (
    <div className="divider">
      {m ? (
        <>
          <b>{m[1]}</b> {m[2]}
        </>
      ) : (
        text
      )}
    </div>
  );
}

export function Bubble({
  row,
  platform,
  children,
  extraClass = "",
}: {
  row: Row;
  platform: Platform;
  children?: React.ReactNode;
  extraClass?: string;
}) {
  const tailed = hasTail(platform, row.first, row.last);
  const radius = bubbleRadius(platform, row.side, row.first, row.last, tailed);
  return (
    <div
      className={`bubble ${row.side} ${tailed ? "tail" : ""} ${extraClass}`}
      style={{ borderRadius: radius }}
      data-draft-bubble={row.msg.id === DRAFT_ID ? "1" : undefined}
    >
      {row.msg.reaction && <span className="reaction">{row.msg.reaction}</span>}
      {row.msg.image && <img className="att" src={row.msg.image} alt="" />}
      {row.msg.text && <span className="txt">{row.msg.text}</span>}
      {children}
    </div>
  );
}

export function TypingBubble({ platform }: { platform: Platform }) {
  return (
    <div className="mrow gap">
      <div
        className="bubble in typing"
        style={{ borderRadius: `${platform.radius}px ${platform.radius}px ${platform.radius}px ${platform.tightRadius}px` }}
      >
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

export function receiptText(msg: Message, platform: Platform, settings: Settings): string | null {
  if (platform.readReceipt !== "text") return null;
  const status = msg.status ?? "read";
  if (status === "sending") return "Sending…";
  const t = timeOfDay(msg.ts, settings.hour24);
  if (platform.id === "instagram") return status === "read" ? "Seen" : "Sent";
  if (platform.id === "sms") return status === "read" ? `Read · ${t}` : `Delivered · ${t}`;
  return status === "read" ? "Read" : status === "delivered" ? "Delivered" : "Sent";
}

/** Scroll the transcript to the bottom whenever it changes, like a real app. */
export function useStickToBottom(dep: unknown) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const pin = () => {
      const el = ref.current;
      if (el) el.scrollTop = el.scrollHeight;
    };
    pin();
    // again after layout settles (web fonts swapping in changes bubble heights)
    const raf = requestAnimationFrame(pin);
    const t = setTimeout(pin, 250);
    // and whenever the phone is resized, so the bottom stays the bottom
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(pin) : null;
    if (ro && ref.current) ro.observe(ref.current);
    window.addEventListener("resize", pin);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      ro?.disconnect();
      window.removeEventListener("resize", pin);
    };
  }, [dep]);
  return ref;
}

/**
 * The live draft is appended as a real message before grouping runs, so it
 * groups, tails and takes a read receipt exactly like a sent one would.
 */
export function messagesWithDraft(
  messages: Message[],
  draft: string,
  draftFrom: Sender
): Message[] {
  if (!draft.trim()) return messages;
  const last = messages[messages.length - 1];
  return [
    ...messages,
    {
      id: DRAFT_ID,
      from: draftFrom,
      text: draft,
      ts: Math.max(Date.now(), (last?.ts ?? 0) + 1000),
      status: "sent",
    },
  ];
}
