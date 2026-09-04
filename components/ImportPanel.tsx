"use client";

import React, { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { assignSpeaker, parsePaste, type ParsedLine } from "@/lib/parse";
import { linesToMessages, ocrImage } from "@/lib/ocr";
import { limitWidth, readFileAsDataURL, shrinkImage } from "@/lib/util";
import type { Sender } from "@/lib/types";
import { TrashIcon } from "@/components/icons";

type Draft = { text: string; from: Sender; ts?: number };

export default function ImportPanel() {
  const { dispatch, thread } = useStore();
  const [mode, setMode] = useState<"paste" | "shot">("paste");
  const [raw, setRaw] = useState("");
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [rows, setRows] = useState<Draft[]>([]);
  const [shot, setShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Ctrl+V a screenshot straight into the panel.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        setMode("shot");
        void handleImage(file);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  if (!thread) return null;

  const parse = (text: string) => {
    setRaw(text);
    const res = parsePaste(text);
    setSpeakers(res.speakers);
    setRows(res.lines.map((l: ParsedLine) => ({ text: l.text, from: l.from, ts: l.ts })));
  };

  const pickSpeaker = (name: string) => {
    const res = parsePaste(raw);
    const lines = assignSpeaker(res.lines, name);
    setRows(lines.map((l) => ({ text: l.text, from: l.from, ts: l.ts })));
  };

  async function handleImage(file: File) {
    setErr(null);
    setBusy(true);
    setPct(0);
    try {
      // keep full width for OCR; the thumbnail can be small
      const dataUrl = await limitWidth(await readFileAsDataURL(file), 1200);
      setShot(await shrinkImage(dataUrl, 700));
      const { lines, width, height } = await ocrImage(dataUrl, {
        onProgress: (p, s) => {
          setPct(p);
          setStatus(s);
        },
      });
      const found = linesToMessages(lines, width, height);
      if (!found.length) setErr("No text found. Try a tighter crop, or type it in the Paste tab.");
      setRows((prev) => [...prev, ...found.map((f) => ({ text: f.text, from: f.from }))]);
    } catch (e: any) {
      setErr(
        `OCR failed: ${e?.message ?? e}. If you're offline and haven't run "npm run setup-ocr", use the Paste tab instead.`
      );
    } finally {
      setBusy(false);
    }
  }

  const commit = (replace: boolean) => {
    const msgs = rows
      .filter((r) => r.text.trim())
      .map((r) => ({ from: r.from, text: r.text.trim(), ts: r.ts }));
    if (!msgs.length) return;
    dispatch({ type: "addMessages", threadId: thread.id, msgs, replace });
    setRows([]);
    setRaw("");
    setShot(null);
  };

  return (
    <div className="section">
      <div className="seg" style={{ marginBottom: 10 }}>
        <button data-on={mode === "paste"} onClick={() => setMode("paste")}>
          Paste text
        </button>
        <button data-on={mode === "shot"} onClick={() => setMode("shot")}>
          Screenshot
        </button>
      </div>

      {mode === "paste" ? (
        <>
          <label className="lbl">Paste a conversation</label>
          <textarea
            className="field"
            rows={7}
            placeholder={"Sam: hey\nMe: hi\n\nAlso works with WhatsApp exports, or one message per line."}
            value={raw}
            onChange={(e) => parse(e.target.value)}
          />
          {speakers.length > 1 && (
            <div className="row wrap" style={{ marginTop: 8 }}>
              <span className="tiny muted">Which one is you?</span>
              {speakers.map((sp) => (
                <button key={sp} className="btn sm" onClick={() => pickSpeaker(sp)}>
                  {sp}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div
            className="drop"
            data-over={over}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void handleImage(f);
            }}
            onClick={() => fileRef.current?.click()}
          >
            Drop a chat screenshot, click to choose, or just Ctrl+V it.
            <div className="tiny" style={{ marginTop: 6 }}>
              Bubbles hugging the right edge are read as yours, left as theirs.
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImage(f);
              e.target.value = "";
            }}
          />
          {busy && (
            <div style={{ marginTop: 10 }}>
              <div className="progress">
                <i style={{ width: `${pct}%` }} />
              </div>
              <div className="tiny muted" style={{ marginTop: 4 }}>
                {status} {Math.round(pct)}%
              </div>
            </div>
          )}
          {shot && !busy && (
            <img className="shot" src={shot} alt="screenshot" style={{ marginTop: 10, maxHeight: 220, objectFit: "contain" }} />
          )}
        </>
      )}

      {err && <div className="note" style={{ borderLeftColor: "#e0463c", marginTop: 10 }}>{err}</div>}

      {rows.length > 0 && (
        <>
          <div className="row" style={{ justifyContent: "space-between", margin: "14px 0 8px" }}>
            <h3 style={{ margin: 0 }}>Review · {rows.length}</h3>
            <button
              className="btn sm ghost"
              onClick={() => setRows(rows.map((r) => ({ ...r, from: r.from === "me" ? "them" : "me" })))}
            >
              Swap all sides
            </button>
          </div>

          {rows.map((r, i) => (
            <div className="ed-row" key={i}>
              <button
                className="who"
                data-who={r.from}
                onClick={() =>
                  setRows(rows.map((x, j) => (j === i ? { ...x, from: x.from === "me" ? "them" : "me" } : x)))
                }
              >
                {r.from === "me" ? "Me" : "Them"}
              </button>
              <textarea
                rows={Math.min(6, Math.ceil(r.text.length / 46) || 1)}
                value={r.text}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              />
              <button
                className="icon-btn danger"
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
                title="Drop this line"
                aria-label="Drop this line"
              >
                <TrashIcon />
              </button>
            </div>
          ))}

          <div className="row wrap" style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={() => commit(false)}>
              Append to thread
            </button>
            <button className="btn" onClick={() => commit(true)}>
              Replace thread
            </button>
            <button
              className="btn ghost danger"
              onClick={() => {
                if (confirm(`Discard all ${rows.length} lines without importing them?`)) setRows([]);
              }}
            >
              Discard
            </button>
          </div>
        </>
      )}
    </div>
  );
}
