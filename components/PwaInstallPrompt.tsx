"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { SheepVisual } from "./SheepVisual";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export const PWA_INSTALL_DISMISSED_KEY = "heard-sheep-pwa-install-dismissed";
export const PWA_INSTALL_REQUEST_EVENT = "heard-sheep:request-install";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  const isIos = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);

  const requestInstall = useCallback(async () => {
    window.localStorage.removeItem(PWA_INSTALL_DISMISSED_KEY);

    if (!deferredPrompt) {
      setVisible(true);
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (choice.outcome === "accepted") {
      window.localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, "1");
      setVisible(false);
    }
  }, [deferredPrompt]);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (standalone) {
      setInstalled(true);
      setVisible(false);
      return;
    }

    const dismissed = window.localStorage.getItem(PWA_INSTALL_DISMISSED_KEY) === "1";

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (!dismissed) setVisible(true);
    };

    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      window.localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, "1");
    };

    const onRequestInstall = () => {
      void requestInstall();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(PWA_INSTALL_REQUEST_EVENT, onRequestInstall);

    if (isIos && !dismissed) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(PWA_INSTALL_REQUEST_EVENT, onRequestInstall);
    };
  }, [isIos, requestInstall]);

  if (installed || !visible) return null;

  function dismiss() {
    window.localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, "1");
    setVisible(false);
  }

  return (
    <section className="mb-5 rounded-2xl border border-brand-light bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
          <SheepVisual variant="cheer" size="sm" decorative motion="bounce" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-black text-ink">安装到手机</h2>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition active:bg-surface-2"
              aria-label="关闭安装提示"
            >
              <X size={15} />
            </button>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">
            添加到主屏幕后，可以像普通 App 一样打开《听到了咩》，适合手机真机长期自测。
          </p>
          {deferredPrompt ? (
            <button
              type="button"
              onClick={() => void requestInstall()}
              className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand px-4 text-xs font-bold text-white shadow-btn transition active:scale-[0.99]"
            >
              <Download size={14} />
              立即安装
            </button>
          ) : (
            <div className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-xs font-semibold leading-5 text-ink-2">
              <span className="inline-flex items-center gap-1 text-brand">
                <Share2 size={13} />
                iPhone Safari
              </span>
              ：点击分享按钮，再选择“添加到主屏幕”。
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
