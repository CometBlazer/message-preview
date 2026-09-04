"use client";

import { useEffect } from "react";

/**
 * Registers the offline cache, and reloads once when a new service worker
 * takes over — otherwise an installed PWA keeps running the old build until
 * you force-quit it.
 */
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        // pick up a new build if one shipped while the app was open
        reg.update().catch(() => {});
      } catch {
        /* offline or unsupported: the app still works, just without caching */
      }
    };

    // Only reload for a *replacement* worker, not the very first install.
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    }

    if (document.readyState === "complete") void register();
    else window.addEventListener("load", register);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("load", register);
    };
  }, []);
  return null;
}
