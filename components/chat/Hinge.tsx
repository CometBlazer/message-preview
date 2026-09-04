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
  useStickToBottom,
} from "./parts";
import { ChevronLeft, MoreIcon, SendIcon, SmileyIcon } from "@/components/icons";

export default function Hinge(p: ChatProps) {
  const o = other(p.thread, p.pov);
  const bodyRef = useStickToBottom(p.rows);

  return (
    <>
      <StatusBar platform={p.platform} settings={p.settings} />
      <div className="hdr match">
        <span className="ios-side" style={{ left: 12 }}>
          <ChevronLeft size={24} />
        </span>
        <span className="ios-side" style={{ right: 14 }}>
          <MoreIcon size={18} />
        </span>
        <Avatar name={o.name} src={o.avatar} />
        <div className="hdr-name">{o.name}</div>
      </div>

      <div className="body" ref={bodyRef}>
        {p.thread.matchContext && (
          <div className="match-card">
            <b>You matched with {o.name}</b>
            {p.thread.matchContext}
          </div>
        )}
        <div className="grow" />
        {p.rows.map((r) => (
          <React.Fragment key={r.msg.id}>
            {r.divider && <Divider text={r.divider} />}
            <div className={`mrow ${r.side} ${r.first ? "gap" : ""}`}>
              <Bubble row={r} platform={p.platform} />
            </div>
          </React.Fragment>
        ))}
        {p.settings.showTyping && <TypingBubble platform={p.platform} />}
      </div>

      <div className="bar">
        <div className="pill">
          {p.barText ? (
            <span className="typed">{p.barText}</span>
          ) : (
            <span className="ph">{p.platform.placeholder}</span>
          )}
          <SmileyIcon size={20} style={{ color: p.theme.meta }} />
        </div>
        <span
          className="circle"
          style={{
            width: 36,
            height: 36,
            background: p.barText ? p.theme.accent : p.theme.inputBg,
            color: p.barText ? "#fff" : p.theme.meta,
          }}
        >
          <SendIcon size={17} style={{ marginLeft: 1 }} />
        </span>
      </div>
      <HomeIndicator platform={p.platform} />
    </>
  );
}
