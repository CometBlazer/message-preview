"use client";

import React, { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { DeliveryStatus, Message } from "@/lib/types";
import { readFileAsDataURL, shrinkImage, timeOfDay } from "@/lib/util";
import { CheckIcon, CopyIcon, MoveDownIcon, MoveUpIcon, TrashIcon, TuneIcon } from "@/components/icons";
import { copyText, transcriptText } from "@/lib/clipboard";

const REACTIONS = ["", "❤️", "😂", "👍", "👎", "‼️", "❓"];
const STATUSES: DeliveryStatus[] = ["sent", "delivered", "read"];

/**
 * A textarea that grows with its content. The sizing is done in CSS — an
 * invisible copy of the text in `.ed-text::after` sets the row height — rather
 * than by measuring scrollHeight: on a phone this panel is display:none until
 * you switch to it, and a measured height would come back zero and leave every
 * row blank.
 */
function AutoTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="ed-text" data-value={value}>
      <textarea
        rows={1}
        value={value}
        placeholder="Empty message"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function Editor() {
  const { state, dispatch, thread } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageFor, setImageFor] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!thread) return null;

  const patch = (id: string, p: Partial<Message>) =>
    dispatch({ type: "patchMessage", threadId: thread.id, id, patch: p });

  const setTime = (m: Message, hhmm: string) => {
    const [h, min] = hhmm.split(":").map(Number);
    const d = new Date(m.ts);
    d.setHours(h || 0, min || 0, 0, 0);
    patch(m.id, { ts: d.getTime() });
  };

  const shiftDay = (m: Message, days: number) => patch(m.id, { ts: m.ts + days * 86400000 });

  const onPickImage = async (file: File) => {
    if (!imageFor) return;
    const raw = await readFileAsDataURL(file);
    patch(imageFor, { image: await shrinkImage(raw, 900) });
    setImageFor(null);
  };

  const removeMessage = (m: Message) => {
    const preview = m.text.trim().slice(0, 60) || "this empty message";
    if (!confirm(`Delete "${preview}"?\n\nCtrl+Z undoes it if you change your mind.`)) return;
    dispatch({ type: "deleteMessage", threadId: thread.id, id: m.id });
  };

  const copyOne = async (m: Message) => {
    if (!m.text.trim()) return;
    const ok = await copyText(m.text.trim());
    setCopiedId(ok ? m.id : null);
    dispatch({ type: "notice", label: ok ? "Message copied" : "Couldn't reach the clipboard" });
    if (ok) setTimeout(() => setCopiedId((id) => (id === m.id ? null : id)), 1400);
  };

  const copyAll = async () => {
    const text = transcriptText(thread.messages, thread.myName || "Me", thread.name);
    if (!text) return;
    const ok = await copyText(text);
    dispatch({
      type: "notice",
      label: ok ? "Whole thread copied" : "Couldn't reach the clipboard",
    });
  };

  const clearAll = () => {
    if (!thread.messages.length) return;
    if (
      !confirm(
        `Delete all ${thread.messages.length} messages in this chat?\n\nCtrl+Z undoes it if you change your mind.`
      )
    )
      return;
    dispatch({ type: "clearMessages", threadId: thread.id });
  };

  return (
    <div className="section">
      <h3>Transcript · {thread.messages.length} messages</h3>
      <div className="tiny muted" style={{ marginBottom: 10 }}>
        Tap a message in the preview to copy it.
      </div>

      {thread.messages.length === 0 && (
        <div className="tiny muted" style={{ marginBottom: 10 }}>
          Empty thread. Add messages below, or paste/screenshot history in the Import tab.
        </div>
      )}

      {thread.messages.map((m, i) => {
        const open = openId === m.id;
        return (
          <div className="ed-row" key={m.id} data-open={open}>
            <div className="ed-top">
              <button
                className="who"
                data-who={m.from}
                onClick={() => patch(m.id, { from: m.from === "me" ? "them" : "me" })}
                title="Swap sender"
              >
                {m.from === "me" ? "Me" : "Them"}
              </button>
              <AutoTextarea value={m.text} onChange={(v) => patch(m.id, { text: v })} />
            </div>

            {m.image && (
              <div className="ed-image">
                <img src={m.image} alt="" />
                <button
                  className="btn sm ghost"
                  onClick={() => {
                    if (confirm("Remove the image from this message?")) patch(m.id, { image: undefined });
                  }}
                >
                  Remove image
                </button>
              </div>
            )}

            <div className="ed-foot">
              <span className="tiny muted">{timeOfDay(m.ts, state.settings.hour24)}</span>
              <span style={{ flex: 1 }} />
              <button
                className="icon-btn"
                onClick={() => dispatch({ type: "moveMessage", threadId: thread.id, id: m.id, dir: -1 })}
                disabled={i === 0}
                title="Move up"
                aria-label="Move up"
              >
                <MoveUpIcon />
              </button>
              <button
                className="icon-btn"
                onClick={() => dispatch({ type: "moveMessage", threadId: thread.id, id: m.id, dir: 1 })}
                disabled={i === thread.messages.length - 1}
                title="Move down"
                aria-label="Move down"
              >
                <MoveDownIcon />
              </button>
              <button
                className="icon-btn"
                onClick={() => void copyOne(m)}
                disabled={!m.text.trim()}
                title="Copy this message"
                aria-label="Copy this message"
              >
                {copiedId === m.id ? <CheckIcon /> : <CopyIcon />}
              </button>
              <button
                className="icon-btn"
                data-on={open}
                onClick={() => setOpenId(open ? null : m.id)}
                title="Time, reaction, image, status"
                aria-label="More options"
              >
                <TuneIcon />
              </button>
              <span className="ed-sep" />
              <button
                className="icon-btn danger"
                onClick={() => removeMessage(m)}
                title="Delete message"
                aria-label="Delete message"
              >
                <TrashIcon />
              </button>
            </div>

            {open && (
              <div className="ed-more">
                <div className="row wrap">
                  <input
                    className="field hexbox"
                    style={{ width: 100 }}
                    type="time"
                    value={new Date(m.ts).toTimeString().slice(0, 5)}
                    onChange={(e) => setTime(m, e.target.value)}
                  />
                  <button className="btn sm" onClick={() => shiftDay(m, -1)}>
                    −1 day
                  </button>
                  <button className="btn sm" onClick={() => shiftDay(m, 1)}>
                    +1 day
                  </button>
                  <button
                    className="btn sm"
                    onClick={() => {
                      setImageFor(m.id);
                      fileRef.current?.click();
                    }}
                  >
                    {m.image ? "Replace image" : "Add image"}
                  </button>
                </div>
                <div className="row wrap" style={{ marginTop: 8 }}>
                  <span className="tiny muted" style={{ width: 58 }}>
                    Reaction
                  </span>
                  <div className="seg">
                    {REACTIONS.map((r) => (
                      <button
                        key={r || "none"}
                        data-on={(m.reaction ?? "") === r}
                        onClick={() => patch(m.id, { reaction: r || undefined })}
                      >
                        {r || "none"}
                      </button>
                    ))}
                  </div>
                </div>
                {m.from === "me" && (
                  <div className="row wrap" style={{ marginTop: 8 }}>
                    <span className="tiny muted" style={{ width: 58 }}>
                      Status
                    </span>
                    <div className="seg">
                      {STATUSES.map((st) => (
                        <button
                          key={st}
                          data-on={(m.status ?? "read") === st}
                          onClick={() => patch(m.id, { status: st })}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPickImage(f);
          e.target.value = "";
        }}
      />

      <div className="row wrap" style={{ marginTop: 12 }}>
        <button
          className="btn"
          onClick={() =>
            dispatch({ type: "addMessage", threadId: thread.id, msg: { from: "them", text: "" } })
          }
        >
          + Their message
        </button>
        <button
          className="btn"
          onClick={() =>
            dispatch({ type: "addMessage", threadId: thread.id, msg: { from: "me", text: "" } })
          }
        >
          + My message
        </button>
        <span style={{ flex: 1 }} />
        <button
          className="btn"
          onClick={() => void copyAll()}
          disabled={!thread.messages.some((m) => m.text.trim())}
          title="Copy the whole thread as plain text"
        >
          <CopyIcon size={15} />
          Copy all
        </button>
        <button
          className="btn ghost danger"
          onClick={clearAll}
          disabled={!thread.messages.length}
          title="Delete every message in this chat"
        >
          <TrashIcon size={15} />
          Clear all
        </button>
      </div>
    </div>
  );
}
