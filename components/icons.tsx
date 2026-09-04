import React from "react";

type P = { size?: number; className?: string; style?: React.CSSProperties };

const s = (size: number) => ({
  width: size,
  height: size,
  display: "block" as const,
  flex: "none" as const,
});

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const ChevronLeft = ({ size = 22, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke} strokeWidth={2.2}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const ChevronRight = ({ size = 16, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke} strokeWidth={2.4}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const VideoIcon = ({ size = 22, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke}>
    <rect x="2.5" y="6" width="13" height="12" rx="3" />
    <path d="M15.5 11l5-3v8l-5-3z" />
  </svg>
);

export const PhoneIcon = ({ size = 20, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke}>
    <path d="M6.5 3.5l2.5 4-2 2a12 12 0 005.5 5.5l2-2 4 2.5v3a2 2 0 01-2.2 2A17 17 0 013.5 5.7 2 2 0 015.5 3.5z" />
  </svg>
);

export const InfoIcon = ({ size = 20, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.6v.6" />
  </svg>
);

export const PlusIcon = ({ size = 22, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke} strokeWidth={2}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

export const CameraIcon = ({ size = 20, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke}>
    <path d="M3 8.5h3l1.5-2h9L18 8.5h3v10H3z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);

export const MicIcon = ({ size = 20, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke}>
    <rect x="9" y="3" width="6" height="10" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3" />
  </svg>
);

export const ImageIcon = ({ size = 20, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <path d="M3.5 16l4.5-4 4 3.5 3-2.5 5.5 5" />
    <circle cx="8.5" cy="9.5" r="1.4" />
  </svg>
);

export const StickerIcon = ({ size = 20, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke}>
    <path d="M20.5 12a8.5 8.5 0 10-8.5 8.5c1 0 8.5-7.5 8.5-8.5z" />
    <path d="M12.5 20.4c0-4 .5-4.5 4.5-4.5" />
  </svg>
);

export const SmileyIcon = ({ size = 21, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14a4.5 4.5 0 007 0" />
    <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const ClipIcon = ({ size = 20, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke}>
    <path d="M20 11.5l-8 8a5 5 0 01-7-7l8.5-8.5a3.4 3.4 0 015 4.8L10 17.4a1.8 1.8 0 01-2.6-2.5l7.6-7.6" />
  </svg>
);

export const ArrowUp = ({ size = 18, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke} strokeWidth={2.4}>
    <path d="M12 19V6M6 11.5L12 5.5l6 6" />
  </svg>
);

export const SendIcon = ({ size = 19, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} fill="currentColor">
    <path d="M3.4 20.4l18-8.4-18-8.4 0 6.6 12.3 1.8-12.3 1.8z" />
  </svg>
);

export const SearchIcon = ({ size = 20, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </svg>
);

export const MoreIcon = ({ size = 20, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} fill="currentColor">
    <circle cx="12" cy="5" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="12" cy="19" r="1.7" />
  </svg>
);

export const HashIcon = ({ size = 20, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke} strokeWidth={2}>
    <path d="M5 9h14M4 15h14M10 4l-2 16M16 4l-2 16" />
  </svg>
);

export const GifIcon = ({ size = 20, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke}>
    <rect x="3" y="6" width="18" height="12" rx="3" />
    <path d="M10 10.5H8.4a1.4 1.4 0 00-1.4 1.4v.6a1.4 1.4 0 001.4 1.4H10v-1.6M12.5 10.5v3.4M15 13.9v-3.4h2" />
  </svg>
);

/** WhatsApp / Telegram delivery ticks. */
export const Ticks = ({ size = 15, double = true, style }: P & { double?: boolean }) => (
  <svg viewBox="0 0 20 14" style={{ width: size, height: (size * 14) / 20, display: "block", ...style }} {...stroke} strokeWidth={1.9}>
    <path d="M2 7.6l3.2 3.4L11.2 3.4" />
    {double && <path d="M7.6 10.6l.9 1L15 3.4" />}
  </svg>
);

/* ── Status-bar glyphs ─────────────────────────────────────────────────── */

export const Cellular = ({ size = 17, style }: P) => (
  <svg viewBox="0 0 18 12" style={{ width: size, height: (size * 12) / 18, display: "block", ...style }} fill="currentColor">
    <rect x="0" y="7.5" width="3" height="4.5" rx="1" />
    <rect x="4.6" y="5" width="3" height="7" rx="1" />
    <rect x="9.2" y="2.5" width="3" height="9.5" rx="1" />
    <rect x="13.8" y="0" width="3" height="12" rx="1" />
  </svg>
);

export const Wifi = ({ size = 16, style }: P) => (
  <svg viewBox="0 0 18 13" style={{ width: size, height: (size * 13) / 18, display: "block", ...style }} fill="currentColor">
    <path d="M9 12.4l2.4-3a3.6 3.6 0 00-4.8 0z" />
    <path d="M9 6.6c1.5 0 2.9.5 4 1.5l1.5-1.9A8.7 8.7 0 009 4a8.7 8.7 0 00-5.5 2.2L5 8.1A6.4 6.4 0 019 6.6z" />
    <path d="M9 1.6c2.5 0 4.8.9 6.6 2.4L17 2.3A12.4 12.4 0 009 0C6 0 3.2 1 1 2.3l1.4 1.7A10.4 10.4 0 019 1.6z" />
  </svg>
);

export const Battery = ({ size = 26, style }: P) => (
  <svg viewBox="0 0 27 13" style={{ width: size, height: (size * 13) / 27, display: "block", ...style }}>
    <rect x="0.6" y="0.6" width="22" height="11.8" rx="3.4" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />
    <rect x="2.2" y="2.2" width="18.4" height="8.6" rx="2.2" fill="currentColor" />
    <path d="M24.4 4.6v3.8a2.1 2.1 0 000-3.8z" fill="currentColor" fillOpacity="0.45" />
  </svg>
);

export const AndroidNav = ({ style }: P) => (
  <svg viewBox="0 0 120 12" style={{ width: 120, height: 12, ...style }} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M14 2l-6 4 6 4" />
    <circle cx="60" cy="6" r="4.6" />
    <rect x="102" y="2" width="8.5" height="8.5" rx="1.6" />
  </svg>
);

/* ── Editor controls ───────────────────────────────────────────────────── */

export const TrashIcon = ({ size = 17, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke} strokeWidth={1.7}>
    <path d="M4 6.5h16M9.5 6.5V4.8a1 1 0 011-1h3a1 1 0 011 1v1.7" />
    <path d="M6.5 6.5l.9 12.2a1.6 1.6 0 001.6 1.5h6a1.6 1.6 0 001.6-1.5l.9-12.2" />
    <path d="M10.2 10.5v6M13.8 10.5v6" />
  </svg>
);

export const MoveUpIcon = ({ size = 17, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke} strokeWidth={2}>
    <path d="M12 19.5V5M6 11l6-6 6 6" />
  </svg>
);

export const MoveDownIcon = ({ size = 17, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke} strokeWidth={2}>
    <path d="M12 4.5V19M6 13l6 6 6-6" />
  </svg>
);

export const TuneIcon = ({ size = 17, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke} strokeWidth={1.8}>
    <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
    <circle cx="15" cy="8" r="2.1" />
    <circle cx="9" cy="16" r="2.1" />
  </svg>
);

export const UndoIcon = ({ size = 16, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke} strokeWidth={2}>
    <path d="M8 8.5H14.5a4.5 4.5 0 010 9H9" />
    <path d="M10.5 5.5L7.5 8.5l3 3" />
  </svg>
);

export const RedoIcon = ({ size = 16, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...s(size), ...style }} {...stroke} strokeWidth={2}>
    <path d="M16 8.5H9.5a4.5 4.5 0 000 9H15" />
    <path d="M13.5 5.5l3 3-3 3" />
  </svg>
);
