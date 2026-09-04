"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { PREVIEW_ID } from "./Preview";
import { TIER_COLOR, TIER_LABEL, analyze, notes, splitDraft } from "@/lib/stats";
import type { Sender } from "@/lib/types";

/** How much of their screen the draft bubble actually eats, measured live. */
function useFillPct() {
  const [pct, setPct] = useState(0);

  const measure = React.useCallback(() => {
    const screen = document.getElementById(PREVIEW_ID);
    const bub = screen?.querySelector('[data-draft-bubble="1"]') as HTMLElement | null;
    const body = screen?.querySelector(".body") as HTMLElement | null;
    if (!bub || !body || !screen) {
      setPct((p) => (p === 0 ? p : 0));
      return;
    }
    const bodyBox = body.getBoundingClientRect();
    const screenBox = screen.getBoundingClientRect();
    if (!bodyBox.height || !screenBox.width) {
      setPct((p) => (p === 0 ? p : 0));
      return;
    }
    // On a phone the preview fills the viewport rather than holding a 390×844
    // shape, so measure against the message area a real phone would have at
    // this width. On desktop the two are identical.
    const chrome = screenBox.height - bodyBox.height;
    const reference = Math.max(1, (screenBox.width * 844) / 390 - chrome);
    const next = (bub.getBoundingClientRect().height / reference) * 100;
    setPct((p) => (Math.abs(p - next) < 0.5 ? p : next));
  }, []);

  // Layout is committed by now, so this reads the real height on the same pass.
  React.useLayoutEffect(() => {
    measure();
    // ...and once more after paint, for web-font swaps and image loads.
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  });

  return pct;
}

export default function Composer() {
  const { state, dispatch, thread, draft } = useStore();
  const pct = useFillPct();
  const s = analyze(draft);
  const chunks = splitDraft(draft);
  const hints = notes(s, pct);
  const from: Sender = state.settings.draftFrom;

  if (!thread) return null;

  const setDraft = (text: string) => dispatch({ type: "setDraft", threadId: thread.id, text });

  const send = () => {
    if (!draft.trim()) return;
    dispatch({ type: "addMessage", threadId: thread.id, msg: { from, text: draft.trim() } });
    setDraft("");
  };

  const sendSplit = () => {
    if (chunks.length < 2) return send();
    dispatch({
      type: "addMessages",
      threadId: thread.id,
      msgs: chunks.map((text) => ({ from, text })),
    });
    setDraft("");
  };

  return (
    <div className="section">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <div className="seg">
          {(["me", "them"] as Sender[]).map((v) => (
            <button
              key={v}
              data-on={from === v}
              onClick={() => dispatch({ type: "patchSettings", patch: { draftFrom: v } })}
            >
              {v === "me" ? "Write as me" : `Write as ${thread.name}`}
            </button>
          ))}
        </div>
        <div className="seg">
          <button
            data-on={state.settings.showDraft}
            onClick={() => dispatch({ type: "patchSettings", patch: { showDraft: !state.settings.showDraft } })}
            title="Show the draft as a sent bubble, or as text in the input field"
          >
            {state.settings.showDraft ? "As bubble" : "In input"}
          </button>
        </div>
      </div>

      <textarea
        className="field"
        rows={7}
        placeholder="Type the message you're thinking of sending…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            send();
          }
        }}
      />

      <div className="statgrid">
        <div className="stat">
          <b>{s.chars}</b>
          <span>chars</span>
        </div>
        <div className="stat">
          <b>{s.words}</b>
          <span>words</span>
        </div>
        <div className="stat">
          <b>{pct > 0 ? `${Math.round(pct)}%` : "—"}</b>
          <span>their screen</span>
        </div>
        <div className="stat">
          <b>{s.readingSeconds < 60 ? `${s.readingSeconds}s` : `${Math.round(s.readingSeconds / 60)}m`}</b>
          <span>to read</span>
        </div>
      </div>

      <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <span className="tiny" style={{ color: TIER_COLOR[s.tier], fontWeight: 600 }}>
          {TIER_LABEL[s.tier]}
        </span>
        <span className="tiny muted">{chunks.length > 1 ? `${chunks.length} natural chunks` : ""}</span>
      </div>
      <div className="meter" style={{ marginBottom: 10 }}>
        <i
          style={{
            width: `${Math.min(100, Math.max(pct, (s.chars / 1000) * 100))}%`,
            background: TIER_COLOR[s.tier],
          }}
        />
      </div>

      {hints.map((n) => (
        <div className="note" key={n}>
          {n}
        </div>
      ))}

      <div className="row wrap" style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={send} disabled={!draft.trim()}>
          Add to thread
        </button>
        <button className="btn" onClick={sendSplit} disabled={chunks.length < 2}>
          Split into {Math.max(chunks.length, 2)}
        </button>
        <button
          className="btn ghost danger"
          onClick={() => {
            if (
              confirm(
                "Clear the draft?\n\nCtrl+Z in the box itself will bring the text back, but the undo button won't."
              )
            )
              setDraft("");
          }}
          disabled={!draft}
        >
          Clear draft
        </button>
      </div>
      <div className="tiny muted" style={{ marginTop: 8 }}>
        ⌘/Ctrl + Enter to add. The draft shows live in the preview — flip POV above the phone to
        see it land on their side.
      </div>
    </div>
  );
}
