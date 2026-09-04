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
import { ArrowUp, CameraIcon, ChevronLeft, ChevronRight, PlusIcon, StickerIcon, VideoIcon } from "@/components/icons";

export default function IMessage(p: ChatProps) {
  const o = other(p.thread, p.pov);
  const bodyRef = useStickToBottom(p.rows);

  return (
    <>
      <StatusBar platform={p.platform} settings={p.settings} />
      <div className="hdr ios">
        <div className="ios-side left">
          <ChevronLeft />
        </div>
        <Avatar name={o.name} src={o.avatar} />
        <div className="hdr-name">
          {o.name}
          <ChevronRight size={11} style={{ color: p.theme.headerSub }} />
        </div>
        <div className="ios-side right">
          <VideoIcon />
        </div>
      </div>

      <div className="body" ref={bodyRef}>
        <div className="grow" />
        {p.rows.map((r) => (
          <React.Fragment key={r.msg.id}>
            {r.divider && <Divider text={r.divider} />}
            <div className={`mrow ${r.side} ${r.first ? "gap" : ""}`}>
              <Bubble row={r} platform={p.platform} />
            </div>
            {r.isLastOut && receiptText(r.msg, p.platform, p.settings) && (
              <div className="receipt">{receiptText(r.msg, p.platform, p.settings)}</div>
            )}
          </React.Fragment>
        ))}
        {p.settings.showTyping && <TypingBubble platform={p.platform} />}
      </div>

      <div className="bar">
        <PlusIcon style={{ color: p.theme.meta }} />
        <div className="pill">
          {p.barText ? (
            <span className="typed">{p.barText}</span>
          ) : (
            <span className="ph">{p.platform.placeholder}</span>
          )}
          {p.barText ? (
            <span className="circle" style={{ width: 26, height: 26, background: p.theme.accent }}>
              <ArrowUp size={15} />
            </span>
          ) : (
            <span style={{ display: "flex", gap: 10, color: p.theme.meta }}>
              <CameraIcon size={19} />
              <StickerIcon size={19} />
            </span>
          )}
        </div>
      </div>
      <HomeIndicator platform={p.platform} />
    </>
  );
}
