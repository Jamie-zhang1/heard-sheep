import type { Metadata, Viewport } from "next";
import { PwaBootstrap } from "@/components/PwaBootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "听到了咩",
  description: "把口头交代、语音和截图整理成可执行任务。",
  applicationName: "听到了咩",
  icons: {
    icon: [
      { url: "/sheep/favicon.ico?v=20260515-sheep", sizes: "any" },
      { url: "/sheep/favicon.png?v=20260515-sheep", sizes: "64x64", type: "image/png" },
      { url: "/sheep/favicon-16x16.png?v=20260515-sheep", sizes: "16x16", type: "image/png" },
      { url: "/sheep/favicon-32x32.png?v=20260515-sheep", sizes: "32x32", type: "image/png" },
      { url: "/sheep/icons/icon-192.png?v=20260515-sheep", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/sheep/favicon.ico?v=20260515-sheep",
    apple: "/sheep/apple-touch-icon.png?v=20260515-sheep",
  },
  manifest: "/sheep/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "听到了咩",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#8B78FF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <PwaBootstrap />
      </body>
    </html>
  );
}
