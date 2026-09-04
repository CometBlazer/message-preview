"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { PLATFORMS } from "@/lib/platforms";
import Preview from "./Preview";
import Composer from "./Composer";
import Editor from "./Editor";
import ImportPanel from "./ImportPanel";
import SettingsPanel from "./SettingsPanel";
import { Avatar } from "./chat/parts";
import { RedoIcon, UndoIcon } from "./icons";
import type { PlatformId, Sender } from "@/lib/types";

const BADGE: Record<PlatformId, string> = {
  imessage: "#2AC85B",
  whatsapp: "#25D366",
  instagram: "linear-gradient(140deg,#F9CE34,#EE2A7B 55%,#6228D7)",
  hinge: "#55286F",
  telegram: "#2AABEE",
  messenger: "linear-gradient(140deg,#00B2FF,#006AFF 60%,#A033FF)",
  sms: "#1A73E8",
  tinder: "linear-gradient(120deg,#FD267A,#FF6036)",
  discord: "#5865F2",
};

type Tab = "compose" | "edit" | "import" | "setup";

export default function Workbench() {
  const { state, dispatch, thread } = useStore();
  const [tab, setTab] = useState<Tab>("compose");
  const [mobile, setMobile] = useState<"preview" | "tools">("preview");
  const [drawer, setDrawer] = useState(false);
  const [width, setWidth] = useState(378);
  const s = state.settings;

  const setPov = (pov: Sender) => dispatch({ type: "patchSettings", patch: { pov } });
  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  // Ctrl/Cmd+Z anywhere except inside a text field, where the browser's own
  // text undo is the one you actually want.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!(e.ctrlKey || e.metaKey) || (key !== "z" && key !== "y")) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      e.preventDefault();
      dispatch({ type: key === "y" || e.shiftKey ? "redo" : "undo" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  // transient "Undid delete message" toast
  const [toast, setToast] = useState<string | null>(null);
  const noticeAt = state.notice?.at;
  useEffect(() => {
    if (!state.notice) return;
    setToast(`${state.notice.dir === "undo" ? "Undid" : "Redid"} ${state.notice.label}`);
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeAt]);

  return (
    <div className="app" data-tab={mobile}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot">💬</span>
          Message Preview
        </div>

        <button className="btn sm ghost drawer-btn" onClick={() => setDrawer((d) => !d)} title="Chats">
          ☰ Chats
        </button>

        <div className="spacer" />

        <div className="seg" title="Undo (Ctrl+Z) / Redo (Ctrl+Shift+Z)">
          <button onClick={() => dispatch({ type: "undo" })} disabled={!canUndo} aria-label="Undo">
            <UndoIcon />
          </button>
          <button onClick={() => dispatch({ type: "redo" })} disabled={!canRedo} aria-label="Redo">
            <RedoIcon />
          </button>
        </div>

        <div className="seg" title="Whose phone are you looking at?">
          <button data-on={s.pov === "me"} onClick={() => setPov("me")}>
            My phone
          </button>
          <button data-on={s.pov === "them"} onClick={() => setPov("them")}>
            {thread ? `${thread.name}'s phone` : "Their phone"}
          </button>
        </div>

        <input
          type="range"
          min={300}
          max={430}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          style={{ width: 90 }}
          title="Phone size"
        />
      </header>

      <div className="cols">
        <aside className="pane threads" data-open={drawer}>
          <div className="section">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Chats</h3>
              <button
                className="btn sm"
                onClick={() =>
                  dispatch({ type: "newThread", platform: thread?.platform ?? "imessage" })
                }
              >
                + New
              </button>
            </div>
            {state.threads.map((t) => (
              <div key={t.id} style={{ position: "relative" }}>
                <button
                  className="thread-item"
                  data-on={t.id === thread?.id}
                  onClick={() => {
                    dispatch({ type: "setActive", id: t.id });
                    setDrawer(false);
                  }}
                >
                  <Avatar name={t.name} src={t.avatar} className="thread-av" />
                  <span className="thread-meta">
                    <span className="thread-name">{t.name}</span>
                    <span className="thread-sub">
                      {PLATFORMS.find((p) => p.id === t.platform)?.name} ·{" "}
                      {t.messages.length} msg
                    </span>
                  </span>
                </button>
              </div>
            ))}
            {state.threads.length > 1 && thread && (
              <button
                className="btn sm ghost danger"
                style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
                onClick={() => {
                  if (confirm(`Delete the chat with ${thread.name}?`))
                    dispatch({ type: "deleteThread", id: thread.id });
                }}
              >
                Delete this chat
              </button>
            )}
          </div>

          <div className="section">
            <h3>Render as</h3>
            <div className="plat-grid">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  className="plat"
                  data-on={thread?.platform === p.id}
                  onClick={() => thread && dispatch({ type: "patchThread", id: thread.id, patch: { platform: p.id } })}
                >
                  <span className="plat-badge" style={{ background: BADGE[p.id] }}>
                    {p.name[0]}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="stage">
          <div className="stage-inner">
            {state.storageError && <div className="banner">{state.storageError}</div>}
            {thread ? (
              <>
                <Preview width={width} />
                <div className="tiny muted" style={{ textAlign: "center", maxWidth: 380 }}>
                  {s.pov === "me"
                    ? "Your phone. Switch to their phone to see how your draft lands."
                    : `${thread.name}'s phone — your messages are the ones on the left.`}
                </div>
              </>
            ) : (
              <div className="drop" style={{ maxWidth: 300 }}>
                {state.loaded ? "No chats yet." : "Loading…"}
                <div style={{ marginTop: 10 }}>
                  <button
                    className="btn primary"
                    onClick={() => dispatch({ type: "newThread", platform: "imessage" })}
                  >
                    Start a chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="pane tools">
          <div className="tabs">
            {(["compose", "edit", "import", "setup"] as Tab[]).map((t) => (
              <button key={t} data-on={tab === t} onClick={() => setTab(t)}>
                {t === "compose" ? "Draft" : t === "edit" ? "Thread" : t === "import" ? "Import" : "Setup"}
              </button>
            ))}
          </div>
          {tab === "compose" && <Composer />}
          {tab === "edit" && <Editor />}
          {tab === "import" && <ImportPanel />}
          {tab === "setup" && <SettingsPanel />}
        </aside>
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
          {canRedo && (
            <button className="btn sm ghost" onClick={() => dispatch({ type: "redo" })}>
              Redo
            </button>
          )}
        </div>
      )}

      <nav className="mobile-tabs">
        <button data-on={mobile === "preview"} onClick={() => setMobile("preview")}>
          Preview
        </button>
        <button data-on={mobile === "tools"} onClick={() => setMobile("tools")}>
          Draft &amp; edit
        </button>
      </nav>
    </div>
  );
}
