"use client";

import React from "react";
import {
  Avatar,
  Bubble,
  ChatProps,
  Divider,
  HomeIndicator,
  StatusBar,
  TypingBubble,
  other,
  receiptText,
  useStickToBottom,
} from "./parts";
import {
  ChevronLeft,
  ChevronRight,
  ClipIcon,
  GifIcon,
  ImageIcon,
  MicIcon,
  MoreIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  SmileyIcon,
  StickerIcon,
  Ticks,
  VideoIcon,
} from "@/components/icons";
import { timeOfDay } from "@/lib/util";

/** Telegram / Messenger / Google Messages / Tinder share one layout engine. */
export default function BubbleChat(p: ChatProps) {
  const o = other(p.thread, p.pov);
  const bodyRef = useStickToBottom(p.rows);
  const id = p.platform.id;

  const header =
    p.platform.headerStyle === "android-left" ? (
      <div className="hdr inline">
        <span className="back" style={{ color: p.theme.headerFg }}>
          <ChevronLeft size={24} />
        </span>
        <Avatar name={o.name} src={o.avatar} style={{ width: 34, height: 34 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hdr-name" style={{ fontSize: 17 }}>
            {o.name}
          </div>
        </div>
        <div className="hdr-actions" style={{ color: p.theme.headerFg, gap: 20 }}>
          <VideoIcon size={21} />
          <PhoneIcon size={19} />
          <MoreIcon size={17} />
        </div>
      </div>
    ) : p.platform.headerStyle === "hinge" ? (
      <div className="hdr match">
        <span className="ios-side" style={{ left: 12 }}>
          <ChevronLeft size={24} />
        </span>
        <span className="ios-side" style={{ right: 14 }}>
          <MoreIcon size={18} />
        </span>
        <Avatar name={o.name} src={o.avatar} />
        <div className="hdr-name" style={{ fontFamily: "var(--sans)", fontWeight: 700 }}>
          {o.name}
        </div>
      </div>
    ) : id === "telegram" ? (
      <div className="hdr inline">
        <span className="back">
          <ChevronLeft size={24} />
          <span style={{ fontSize: 16, marginLeft: -2 }}>Back</span>
        </span>
        <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          <div className="hdr-name" style={{ fontSize: 16 }}>
            {o.name}
          </div>
          <div className="hdr-sub">last seen recently</div>
        </div>
        <Avatar name={o.name} src={o.avatar} style={{ width: 34, height: 34 }} />
      </div>
    ) : (
      <div className="hdr inline">
        <span className="back">
          <ChevronLeft size={26} />
        </span>
        <Avatar name={o.name} src={o.avatar} style={{ width: 34, height: 34 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hdr-name" style={{ fontSize: 15.5 }}>
            {o.name}
          </div>
          <div className="hdr-sub">Active now</div>
        </div>
        <div className="hdr-actions">
          <PhoneIcon size={20} />
          <VideoIcon size={22} />
        </div>
      </div>
    );

  const bar =
    id === "telegram" ? (
      <div className="bar">
        <ClipIcon size={22} style={{ color: p.theme.meta, transform: "rotate(-45deg)" }} />
        <div className="pill">
          {p.barText ? <span className="typed">{p.barText}</span> : <span className="ph">{p.platform.placeholder}</span>}
          <StickerIcon size={20} style={{ color: p.theme.meta }} />
        </div>
        {p.barText ? (
          <SendIcon size={22} style={{ color: p.theme.accent }} />
        ) : (
          <MicIcon size={21} style={{ color: p.theme.meta }} />
        )}
      </div>
    ) : id === "sms" ? (
      <div className="bar">
        <div className="pill" style={{ borderRadius: 24 }}>
          <SmileyIcon size={21} style={{ color: p.theme.meta }} />
          {p.barText ? <span className="typed">{p.barText}</span> : <span className="ph">{p.platform.placeholder}</span>}
          <GifIcon size={20} style={{ color: p.theme.meta }} />
          <ImageIcon size={20} style={{ color: p.theme.meta }} />
        </div>
        <span
          className="circle"
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: p.barText ? p.theme.accent : p.theme.inputBg,
            color: p.barText ? (p.theme.outFg === "#C2E7FF" ? "#062E6F" : "#fff") : p.theme.meta,
          }}
        >
          <SendIcon size={18} />
        </span>
      </div>
    ) : id === "tinder" ? (
      <div className="bar">
        <div className="pill">
          {p.barText ? <span className="typed">{p.barText}</span> : <span className="ph">{p.platform.placeholder}</span>}
        </div>
        <span className="send-txt" style={{ padding: "0 4px 8px" }}>
          SEND
        </span>
      </div>
    ) : (
      <div className="bar">
        <PlusIcon size={24} style={{ color: p.theme.accent }} />
        <ImageIcon size={22} style={{ color: p.theme.accent }} />
        <div className="pill" style={{ borderRadius: 20 }}>
          {p.barText ? <span className="typed">{p.barText}</span> : <span className="ph">{p.platform.placeholder}</span>}
          <SmileyIcon size={20} style={{ color: p.theme.accent }} />
        </div>
        {p.barText ? (
          <SendIcon size={20} style={{ color: p.theme.accent }} />
        ) : (
          <span style={{ fontSize: 20, lineHeight: 1 }}>👍</span>
        )}
      </div>
    );

  return (
    <>
      <StatusBar platform={p.platform} settings={p.settings} />
      {header}

      <div className="body" ref={bodyRef}>
        <div className="grow" />
        {p.rows.map((r) => {
          const isOut = r.side === "out";
          const status = r.msg.status ?? "read";
          return (
            <React.Fragment key={r.msg.id}>
              {r.divider && (
                <Divider text={r.divider} chip={id === "telegram"} />
              )}
              <div className={`mrow ${r.side} ${r.first ? "gap" : ""}`}>
                {id === "messenger" && r.side === "in" && (
                  <Avatar name={o.name} src={o.avatar} className={`mini-av ${r.last ? "" : "hole"}`} />
                )}
                <Bubble row={r} platform={p.platform}>
                  {p.platform.metaInBubble && (
                    <span className="meta-in">
                      {timeOfDay(r.msg.ts, p.settings.hour24)}
                      {isOut && (
                        <Ticks
                          size={16}
                          double={status !== "sent"}
                          style={{ color: status === "read" ? p.theme.tick : p.theme.metaOut }}
                        />
                      )}
                    </span>
                  )}
                </Bubble>
              </div>
              {r.isLastOut && p.platform.readReceipt === "text" && (
                <div className="receipt">{receiptText(r.msg, p.platform, p.settings)}</div>
              )}
              {r.isLastOut && p.platform.readReceipt === "avatar" && (
                <div className="receipt" style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Avatar
                    name={o.name}
                    src={o.avatar}
                    className="mini-av"
                    style={{ width: 14, height: 14, fontSize: 7 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
        {p.settings.showTyping && <TypingBubble platform={p.platform} />}
      </div>

      {bar}
      <HomeIndicator platform={p.platform} />
    </>
  );
}
