"use client";

import { useEffect } from "react";

function shouldReloadForError(error: unknown): boolean {
  if (!error) return false;
  const message = typeof error === "string" ? error : (error as any)?.message || "";
  const name = (error as any)?.name || "";
  const stack = (error as any)?.stack || "";
  const text = `${name} ${message} ${stack}`;
  if (!text) return false;
  const patterns = [
    /Loading chunk \d+ failed/i,
    /ChunkLoadError/i,
    /Failed to fetch dynamically imported module/i,
    /Importing a module script failed/i,
    /Script error for/i,
  ];
  return patterns.some((p) => p.test(text));
}

function safeReloadOnce(windowRef: Window) {
  try {
    const key = "__last_chunk_reload_ts__";
    const now = Date.now();
    const last = Number(windowRef.sessionStorage.getItem(key) || "0");
    if (now - last < 10000) {
      return; // avoid reload loops
    }
    windowRef.sessionStorage.setItem(key, String(now));
  } catch {
    // ignore storage errors
  }
  windowRef.location.reload();
}

export default function ChunkErrorReload() {
  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      if (shouldReloadForError(event?.error || event?.message)) {
        safeReloadOnce(window);
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = (event && (event as any).reason) || undefined;
      if (shouldReloadForError(reason)) {
        safeReloadOnce(window);
      }
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}