import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "听到了咩",
  description: "以录音为主入口的 AI 语音任务助手",
  icons: {
    icon: [
      { url: "/sheep/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/sheep/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/sheep/apple-touch-icon.png",
  },
  manifest: "/sheep/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "听到了咩",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

