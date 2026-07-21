import type { Metadata, Viewport } from "next";
import { PwaBootstrap } from "@/components/PwaBootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "听到了咩",
  description: "把口头交代、语音和截图整理成可执行任务。",
  applicationName: "听到了咩",
  icons: {
    icon: [{ url: "/sheep/brand/app-icon.svg", sizes: "any", type: "image/svg+xml" }],
    shortcut: "/sheep/brand/app-icon.svg",
    apple: "/sheep/brand/app-icon.svg",
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
  themeColor: "#FFFFFF",
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
