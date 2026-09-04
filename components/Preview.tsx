"use client";

import React, { useMemo } from "react";
import { useStore, useTheme } from "@/lib/store";
import { buildRows } from "@/lib/grouping";
import { messagesWithDraft } from "./chat/parts";
import type { ChatProps } from "./chat/parts";
import IMessage from "./chat/IMessage";
import WhatsApp from "./chat/WhatsApp";
import Instagram from "./chat/Instagram";
import Hinge from "./chat/Hinge";
import BubbleChat from "./chat/BubbleChat";
import Discord from "./chat/Discord";

const ENGINE_CLASS: Record<string, string> = {
  imessage: "im",
  whatsapp: "wa",
  instagram: "ig",
  hinge: "hg",
  bubble: "bub",
  discord: "dc",
};

const ENGINES: Record<string, React.ComponentType<ChatProps>> = {
  imessage: IMessage,
  whatsapp: WhatsApp,
  instagram: Instagram,
  hinge: Hinge,
  bubble: BubbleChat,
  discord: Discord,
};

export const PREVIEW_ID = "preview-screen";

export default function Preview({ width = 390 }: { width?: number }) {
  const { state, thread, draft } = useStore();
  const platformId = thread?.platform ?? "imessage";
  const { platform, theme } = useTheme(platformId);
  const s = state.settings;

  const rows = useMemo(() => {
    if (!thread) return [];
    const msgs = s.showDraft
      ? messagesWithDraft(thread.messages, draft, s.draftFrom)
      : thread.messages;
    return buildRows(msgs, s.pov, platform, s.hour24);
  }, [thread, draft, s.showDraft, s.draftFrom, s.pov, s.hour24, platform]);

  if (!thread) return null;

  const Engine = ENGINES[platform.engine] ?? IMessage;

  const vars = {
    "--phone-w": `${width}px`,
    "--bg": theme.bg,
    "--pattern": theme.bgPattern ?? "none",
    "--hdr-bg": theme.headerBg,
    "--hdr-fg": theme.headerFg,
    "--hdr-sub": theme.headerSub,
    "--line": theme.border,
    "--out": theme.out,
    "--out-fg": theme.outFg,
    "--in": theme.in,
    "--in-fg": theme.inFg,
    "--accent": theme.accent,
    "--meta": theme.meta,
    "--meta-out": theme.metaOut,
    "--tick": theme.tick,
    "--bar-bg": theme.barBg,
    "--input-bg": theme.inputBg,
    "--input-fg": theme.inputFg,
    "--input-border": theme.inputBorder,
    "--av-bg": theme.avatarBg,
    "--maxw": `${platform.maxWidth}%`,
    "--fs": `${platform.fontSize}px`,
  } as React.CSSProperties;

  return (
    <div className={`phone ${s.showFrame ? "framed" : ""}`} style={vars}>
      <div
        id={PREVIEW_ID}
        className={`screen ${ENGINE_CLASS[platform.engine]} p-${platform.id}`}
        data-font={platform.font}
      >
        <Engine
          thread={thread}
          rows={rows}
          platform={platform}
          theme={theme}
          settings={s}
          pov={s.pov}
          barText={s.showDraft ? "" : draft}
        />
      </div>
    </div>
  );
}
