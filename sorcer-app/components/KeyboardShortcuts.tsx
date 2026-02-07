"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface KeyboardShortcutsProps {
  onCloseSidebar?: () => void;
}

const NAV_ROUTES = ["/", "/ledger", "/map", "/profile", "/scheduler"];

export function KeyboardShortcuts({ onCloseSidebar }: KeyboardShortcutsProps) {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd+K or / → Focus SpellBar
      if ((meta && e.key === "k") || (e.key === "/" && !isInputFocused())) {
        e.preventDefault();
        const spellBar = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          "[data-spellbar]"
        );
        spellBar?.focus();
        return;
      }

      // Cmd+1 through Cmd+5 → Navigate to sidebar sections
      if (meta && e.key >= "1" && e.key <= "5") {
        const idx = parseInt(e.key) - 1;
        if (idx < NAV_ROUTES.length) {
          e.preventDefault();
          router.push(NAV_ROUTES[idx]);
          return;
        }
      }

      // Esc → Close sidebar on mobile
      if (e.key === "Escape") {
        onCloseSidebar?.();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, onCloseSidebar]);

  return null;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || (el as HTMLElement).isContentEditable;
}
