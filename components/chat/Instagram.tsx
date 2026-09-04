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
import { CameraIcon, ChevronLeft, ImageIcon, MicIcon, PhoneIcon, StickerIcon, VideoIcon } from "@/components/icons";

export default function Instagram(p: ChatProps) {
  const o = other(p.thread, p.pov);
  const bodyRef = useStickToBottom(p.rows);

  return (
    <>
      <StatusBar platform={p.platform} settings={p.settings} />
      <div className="hdr ig">
        <span className="back" style={{ color: p.theme.headerFg }}>
          <ChevronLeft size={26} />
        </span>
        <Avatar name={o.name} src={o.avatar} style={{ width: 34, height: 34 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hdr-name" style={{ fontSize: 15.5 }}>
            {o.name}
          </div>
          <div className="hdr-sub">{o.handle || "Instagram"}</div>
        </div>
        <div className="hdr-actions">
          <PhoneIcon size={21} />
          <VideoIcon size={23} />
        </div>
      </div>

      <div className="body" ref={bodyRef}>
        <div className="grow" />
        {p.rows.map((r) => (
          <React.Fragment key={r.msg.id}>
            {r.divider && <Divider text={r.divider} />}
            <div className={`mrow ${r.side} ${r.first ? "gap" : ""}`}>
              {r.side === "in" && (
                <Avatar
                  name={o.name}
                  src={o.avatar}
                  className={`mini-av ${r.last ? "" : "hole"}`}
                />
              )}
              <Bubble row={r} platform={p.platform} />
            </div>
            {r.isLastOut && (
              <div className="receipt">{receiptText(r.msg, p.platform, p.settings)}</div>
            )}
          </React.Fragment>
        ))}
        {p.settings.showTyping && <TypingBubble platform={p.platform} />}
      </div>

      <div className="bar">
        <span className="ig-cam">
          <CameraIcon size={18} />
        </span>
        <div className="pill">
          {p.barText ? (
            <span className="typed">{p.barText}</span>
          ) : (
            <span className="ph">{p.platform.placeholder}</span>
          )}
          {p.barText ? (
            <span className="send-txt">Send</span>
          ) : (
            <span style={{ display: "flex", gap: 12, color: p.theme.headerFg }}>
              <MicIcon size={19} />
              <ImageIcon size={19} />
              <StickerIcon size={19} />
            </span>
          )}
        </div>
      </div>
      <HomeIndicator platform={p.platform} />
    </>
  );
}
