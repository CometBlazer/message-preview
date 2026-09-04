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
import { CameraIcon, ChevronLeft, ClipIcon, MicIcon, PhoneIcon, SendIcon, SmileyIcon, Ticks, VideoIcon } from "@/components/icons";
import { timeOfDay } from "@/lib/util";

export default function WhatsApp(p: ChatProps) {
  const o = other(p.thread, p.pov);
  const bodyRef = useStickToBottom(p.rows);

  return (
    <>
      <StatusBar platform={p.platform} settings={p.settings} />
      <div className="hdr inline">
        <span className="back" style={{ marginRight: -2 }}>
          <ChevronLeft size={24} />
        </span>
        <Avatar name={o.name} src={o.avatar} style={{ width: 36, height: 36 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hdr-name">{o.name}</div>
          <div className="hdr-sub">online</div>
        </div>
        <div className="hdr-actions">
          <VideoIcon size={21} />
          <PhoneIcon size={19} />
        </div>
      </div>

      <div className="body" ref={bodyRef}>
        <div className="grow" />
        {p.rows.map((r) => {
          const isOut = r.side === "out";
          const status = r.msg.status ?? "read";
          return (
            <React.Fragment key={r.msg.id}>
              {r.divider && <Divider text={r.divider.toUpperCase()} chip />}
              <div className={`mrow ${r.side} ${r.first ? "gap" : ""}`}>
                <Bubble row={r} platform={p.platform}>
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
                </Bubble>
              </div>
            </React.Fragment>
          );
        })}
        {p.settings.showTyping && <TypingBubble platform={p.platform} />}
      </div>

      <div className="bar">
        <div className="pill">
          <SmileyIcon size={22} style={{ color: p.theme.meta }} />
          {p.barText ? (
            <span className="typed">{p.barText}</span>
          ) : (
            <span className="ph">{p.platform.placeholder}</span>
          )}
          <ClipIcon size={20} style={{ color: p.theme.meta, transform: "rotate(-45deg)" }} />
          {!p.barText && <CameraIcon size={20} style={{ color: p.theme.meta }} />}
        </div>
        <span className="circle" style={{ width: 38, height: 38, background: p.theme.accent }}>
          {p.barText ? <SendIcon size={18} style={{ marginLeft: 2 }} /> : <MicIcon size={19} />}
        </span>
      </div>
      <HomeIndicator platform={p.platform} />
    </>
  );
}
