"use client";

import { useEffect } from "react";
import { APP_BASE_PATH, withBasePath } from "@/lib/api-path";

export function PwaBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(withBasePath("/sw.js"), {
          scope: `${APP_BASE_PATH}/`,
        });

        registration.update().catch(() => undefined);
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[PWA] service worker registration failed", error);
        }
      }
    };

    if (document.readyState === "complete") {
      void register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
