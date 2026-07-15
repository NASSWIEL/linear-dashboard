"use client";

import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

// Renders a dropdown menu in a body-level portal so it escapes the kanban
// column's `overflow-hidden` and the board's `overflow-x-auto` (which otherwise
// clip a menu opened from a card near the bottom). Position is fixed to the
// anchor's viewport rect and flips upward when there isn't room below.
export function AnchoredMenu({
  anchorRef,
  menuRef,
  open,
  minWidth = 144,
  children,
  className = "",
}: {
  anchorRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  minWidth?: number;
  children: ReactNode;
  className?: string;
}) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const width = Math.max(r.width, minWidth);
      const gap = 4;
      const spaceBelow = window.innerHeight - r.bottom;
      const openUp = spaceBelow < 260 && r.top > spaceBelow;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setStyle({
        position: "fixed",
        left,
        minWidth: width,
        maxHeight: (openUp ? r.top : spaceBelow) - gap - 8,
        ...(openUp
          ? { bottom: window.innerHeight - r.top + gap }
          : { top: r.bottom + gap }),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef, minWidth]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      style={style}
      className={`z-50 overflow-auto rounded-md border border-border bg-elevated py-1 shadow-lg ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}
