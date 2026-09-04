"use client";

import React from "react";
import { ChatProps, HomeIndicator, StatusBar, other, useStickToBottom } from "./parts";
import { ChevronLeft, GifIcon, HashIcon, ImageIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { dayLabel, initials, nameColor, timeOfDay } from "@/lib/util";

/** Discord has no bubbles — grouped rows with an avatar, name and timestamp. */
export default function Discord(p: ChatProps) {
  const o = other(p.thread, p.pov);
  const me = p.pov === "me" ? p.thread.myName || "You" : p.thread.name;
  const bodyRef = useStickToBottom(p.rows);

  return (
    <>
      <StatusBar platform={p.platform} settings={p.settings} />
      <div className="hdr dc">
        <span className="back" style={{ color: p.theme.headerFg }}>
          <ChevronLeft size={22} />
        </span>
        <HashIcon size={20} style={{ color: p.theme.headerSub }} />
        <div className="hdr-name" style={{ flex: 1 }}>
          {o.name}
        </div>
        <div className="hdr-actions" style={{ color: p.theme.headerSub }}>
          <SearchIcon size={19} />
        </div>
      </div>

      <div className="body" ref={bodyRef}>
        <div className="grow" />
        {p.rows.map((r) => {
          const name = r.side === "out" ? me : o.name;
          const src = r.side === "out" ? (p.pov === "me" ? p.thread.myAvatar : p.thread.avatar) : o.avatar;
          return (
            <React.Fragment key={r.msg.id}>
              {r.divider && <div className="dc-divider">{dayLabel(r.msg.ts)}</div>}
              <div className={`dc-msg ${r.first ? "" : "grouped"}`}>
                {r.first ? (
                  <div className="dc-av" style={{ background: src ? undefined : nameColor(name) }}>
                    {src ? <img src={src} alt="" /> : initials(name)}
                  </div>
                ) : (
                  <div />
                )}
                <div style={{ minWidth: 0 }}>
                  {r.first && (
                    <div className="dc-head">
                      <span
                        className="dc-name"
                        style={{ color: r.side === "out" ? "#F0B232" : "#58A6FF" }}
                      >
                        {name}
                      </span>
                      <span className="dc-time">
                        {dayLabel(r.msg.ts)} at {timeOfDay(r.msg.ts, p.settings.hour24)}
                      </span>
                    </div>
                  )}
                  {r.msg.image && (
                    <img
                      src={r.msg.image}
                      alt=""
                      style={{ maxWidth: "80%", borderRadius: 8, margin: "4px 0", display: "block" }}
                    />
                  )}
                  <div className="dc-text" data-draft-bubble={r.msg.id === "__draft" ? "1" : undefined}>
                    {r.msg.text}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="bar">
        <div className="pill">
          <PlusIcon size={20} style={{ color: p.theme.meta }} />
          {p.barText ? (
            <span className="typed">{p.barText}</span>
          ) : (
            <span className="ph">{`${p.platform.placeholder} @${o.name}`}</span>
          )}
          <GifIcon size={20} style={{ color: p.theme.meta }} />
          <ImageIcon size={20} style={{ color: p.theme.meta }} />
        </div>
      </div>
      <HomeIndicator platform={p.platform} />
    </>
  );
}
