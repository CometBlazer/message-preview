"use client";

import React, { useRef, useState } from "react";
import { useStore, useTheme } from "@/lib/store";
import { THEME_LABELS, TUNABLE_KEYS } from "@/lib/platforms";
import type { PlatformTheme, ThemeMode } from "@/lib/types";
import { readFileAsDataURL, shrinkImage } from "@/lib/util";
import { PREVIEW_ID } from "./Preview";

export default function SettingsPanel() {
  const { state, dispatch, thread } = useStore();
  const { platform, theme, dark } = useTheme(thread?.platform ?? "imessage");
  const s = state.settings;
  const avatarRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const [avatarFor, setAvatarFor] = useState<"them" | "me">("them");
  const [saving, setSaving] = useState(false);

  if (!thread) return null;

  const patchThread = (p: Partial<typeof thread>) =>
    dispatch({ type: "patchThread", id: thread.id, patch: p });

  const onAvatar = async (file: File) => {
    const url = await shrinkImage(await readFileAsDataURL(file), 240);
    patchThread(avatarFor === "them" ? { avatar: url } : { myAvatar: url });
  };

  const exportPng = async () => {
    const el = document.getElementById(PREVIEW_ID);
    if (!el) return;
    setSaving(true);

    // html-to-image clones the node, and the clone's transcript scrolls back to
    // the top. Shift the first child up by the live scroll offset so the export
    // captures the part of the conversation you're actually looking at.
    const body = el.querySelector<HTMLElement>(".body");
    const first = body?.firstElementChild as HTMLElement | null;
    const scrollTop = body?.scrollTop ?? 0;
    const prevMargin = first?.style.marginTop ?? "";
    const prevOverflow = body?.style.overflow ?? "";
    if (body && first && scrollTop > 0) {
      first.style.marginTop = `-${scrollTop}px`;
      body.style.overflow = "hidden";
    }

    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(el, { pixelRatio: 3, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${thread.name}-${platform.id}.png`;
      a.click();
    } finally {
      if (body && first) {
        first.style.marginTop = prevMargin;
        body.style.overflow = prevOverflow;
        body.scrollTop = scrollTop;
      }
      setSaving(false);
    }
  };

  const exportJson = () => {
    const blob = new Blob(
      [JSON.stringify({ threads: state.threads, settings: state.settings, drafts: state.drafts }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "message-preview-backup.json";
    a.click();
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.threads)) throw new Error("no threads in file");
      dispatch({
        type: "importAll",
        state: {
          threads: parsed.threads,
          activeId: parsed.threads[0]?.id ?? null,
          drafts: parsed.drafts ?? {},
          settings: { ...state.settings, ...(parsed.settings ?? {}) },
        },
      });
    } catch (e: any) {
      alert(`Couldn't read that file: ${e?.message ?? e}`);
    }
  };

  const setOverride = (key: keyof PlatformTheme, value: string | null) =>
    dispatch({ type: "setOverride", platform: platform.id, dark, key, value });

  return (
    <>
      <div className="section">
        <h3>This chat</h3>
        <div className="row" style={{ marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label className="lbl">Their name</label>
            <input className="field" value={thread.name} onChange={(e) => patchThread({ name: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="lbl">Your name</label>
            <input className="field" value={thread.myName} onChange={(e) => patchThread({ myName: e.target.value })} />
          </div>
        </div>
        <label className="lbl">Subtitle / handle</label>
        <input
          className="field"
          placeholder={platform.id === "instagram" ? "instagram" : "phone number, @handle…"}
          value={thread.handle}
          onChange={(e) => patchThread({ handle: e.target.value })}
        />
        {(platform.id === "hinge" || platform.id === "tinder") && (
          <>
            <label className="lbl" style={{ marginTop: 8 }}>
              Match context
            </label>
            <input
              className="field"
              value={thread.matchContext ?? ""}
              placeholder="You liked their prompt: …"
              onChange={(e) => patchThread({ matchContext: e.target.value })}
            />
          </>
        )}
        <div className="row wrap" style={{ marginTop: 10 }}>
          <button
            className="btn sm"
            onClick={() => {
              setAvatarFor("them");
              avatarRef.current?.click();
            }}
          >
            {thread.avatar ? "Change" : "Add"} their photo
          </button>
          {thread.avatar && (
            <button
              className="btn sm ghost danger"
              onClick={() => {
                if (confirm(`Remove ${thread.name}'s photo?`)) patchThread({ avatar: undefined });
              }}
            >
              Remove
            </button>
          )}
          <button
            className="btn sm"
            onClick={() => {
              setAvatarFor("me");
              avatarRef.current?.click();
            }}
          >
            {thread.myAvatar ? "Change" : "Add"} your photo
          </button>
        </div>
        <input
          ref={avatarRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onAvatar(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="section">
        <h3>Phone</h3>
        <div className="row wrap" style={{ marginBottom: 8 }}>
          <div className="seg">
            {(["auto", "light", "dark"] as ThemeMode[]).map((m) => (
              <button key={m} data-on={s.theme === m} onClick={() => dispatch({ type: "patchSettings", patch: { theme: m } })}>
                {m}
              </button>
            ))}
          </div>
          <div className="seg">
            <button data-on={s.showFrame} onClick={() => dispatch({ type: "patchSettings", patch: { showFrame: !s.showFrame } })}>
              Frame
            </button>
            <button
              data-on={s.showStatusBar}
              onClick={() => dispatch({ type: "patchSettings", patch: { showStatusBar: !s.showStatusBar } })}
            >
              Status bar
            </button>
            <button data-on={s.showTyping} onClick={() => dispatch({ type: "patchSettings", patch: { showTyping: !s.showTyping } })}>
              Typing…
            </button>
          </div>
        </div>
        <div className="row wrap">
          <div>
            <label className="lbl">Clock</label>
            <input
              className="field hexbox"
              value={s.clockLabel}
              onChange={(e) => dispatch({ type: "patchSettings", patch: { clockLabel: e.target.value } })}
            />
          </div>
          <div>
            <label className="lbl">Time format</label>
            <div className="seg">
              <button data-on={!s.hour24} onClick={() => dispatch({ type: "patchSettings", patch: { hour24: false } })}>
                12h
              </button>
              <button data-on={s.hour24} onClick={() => dispatch({ type: "patchSettings", patch: { hour24: true } })}>
                24h
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <h3>
          {platform.name} colours · {dark ? "dark" : "light"}
        </h3>
        <div className="tiny muted" style={{ marginBottom: 8 }}>
          My shades are close, not sampled. Hold a real screenshot next to it and nudge anything
          that looks off — it saves per platform and per theme.
        </div>
        {TUNABLE_KEYS.map((k) => {
          const val = theme[k] ?? "";
          const isColor = /^#[0-9a-f]{3,8}$/i.test(val);
          return (
            <div className="swatch-row" key={k}>
              <span className="tiny">{THEME_LABELS[k] ?? k}</span>
              <input
                className="field hexbox"
                value={val}
                onChange={(e) => setOverride(k, e.target.value)}
              />
              <span className="swatch" style={{ background: val }}>
                {isColor && (
                  <input type="color" value={val.slice(0, 7)} onChange={(e) => setOverride(k, e.target.value)} />
                )}
              </span>
            </div>
          );
        })}
        <button
          className="btn sm ghost"
          style={{ marginTop: 8 }}
          onClick={() => {
            if (confirm(`Reset your ${platform.name} colour changes back to the defaults?`))
              dispatch({ type: "resetOverrides", platform: platform.id });
          }}
        >
          Reset {platform.name} colours
        </button>
      </div>

      <div className="section">
        <h3>Export</h3>
        <div className="row wrap">
          <button className="btn" onClick={exportPng} disabled={saving}>
            {saving ? "Rendering…" : "Save preview as PNG"}
          </button>
          <button className="btn" onClick={exportJson}>
            Backup JSON
          </button>
          <button className="btn ghost" onClick={() => jsonRef.current?.click()}>
            Restore
          </button>
        </div>
        <input
          ref={jsonRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importJson(f);
            e.target.value = "";
          }}
        />
        <div className="tiny muted" style={{ marginTop: 8 }}>
          Everything lives in this browser only — nothing is uploaded anywhere.
        </div>
      </div>
    </>
  );
}
