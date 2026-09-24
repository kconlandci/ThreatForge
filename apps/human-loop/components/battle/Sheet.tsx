"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import s from "./battle.module.css";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** id of the element that names the dialog. */
  labelledBy: string;
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Focused when the sheet opens (defaults to the close button). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Where focus goes when the sheet closes, if the opener is gone. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  closeLabel?: string;
}

/**
 * Bottom sheet dialog (centered card on wider screens). Modal: traps focus, closes on Escape
 * or a backdrop tap, and returns focus to whatever opened it.
 */
export function Sheet({
  open,
  onClose,
  labelledBy,
  header,
  children,
  footer,
  initialFocusRef,
  returnFocusRef,
  closeLabel = "Close",
}: SheetProps) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Keep the sheet mounted for its closing animation.
  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (!rendered) return;
    setClosing(true);
    const t = window.setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, 190);
    return () => window.clearTimeout(t);
  }, [open, rendered]);

  // Focus in on open, back out on close.
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const target = initialFocusRef?.current ?? closeRef.current ?? panelRef.current;
      target?.focus({ preventScroll: true });
    }, 30);
    return () => {
      window.clearTimeout(t);
      const back = openerRef.current;
      window.setTimeout(() => {
        if (back && back.isConnected && !back.closest("[aria-hidden='true']")) back.focus({ preventScroll: true });
        // The fallback should be whatever the ref points at *after* closing (e.g. a re-rendered button).
        // eslint-disable-next-line react-hooks/exhaustive-deps
        else returnFocusRef?.current?.focus({ preventScroll: true });
      }, 0);
    };
  }, [open, initialFocusRef, returnFocusRef]);

  if (!rendered || typeof document === "undefined") return null;
  const host = document.getElementById("hl-game-root") ?? document.body;

  return createPortal(
    <div
      className={`${s.sheetRoot} ${closing ? s.sheetClosing : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCloseRef.current();
          return;
        }
        if (e.key !== "Tab" || !panelRef.current) return;
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => el.offsetParent !== null || el === document.activeElement,
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
    >
      <div className={s.sheetBackdrop} aria-hidden="true" onClick={() => onCloseRef.current()} />
      <div
        ref={panelRef}
        className={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        <div className={s.grabber} aria-hidden="true" />
        <div className={s.sheetHeader}>
          <div className="min-w-0 flex-1 pt-1">{header}</div>
          <button ref={closeRef} type="button" className={s.closeBtn} onClick={() => onCloseRef.current()} aria-label={closeLabel}>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        {/* Focusable so keyboard users can scroll long content. */}
        <div className={s.sheetScroll} tabIndex={0}>
          {children}
        </div>
        {footer ? <div className={s.sheetFooter}>{footer}</div> : null}
      </div>
    </div>,
    host,
  );
}
