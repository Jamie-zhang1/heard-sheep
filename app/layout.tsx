import type { Metadata, Viewport } from "next";
import { PwaBootstrap } from "@/components/PwaBootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "听到了咩",
  description: "把口头交代、语音和截图整理成可执行任务。",
  applicationName: "听到了咩",
  icons: {
    icon: [
      { url: "/sheep/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/sheep/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/sheep/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/sheep/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/sheep/apple-touch-icon.png",
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
