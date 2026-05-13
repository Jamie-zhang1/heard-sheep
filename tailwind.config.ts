import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FAF8F5",
        ink: "#1A1916",
        muted: "#9C9489",
        line: "#E8E4DF",
        brand: "#7C6FF7",
        "brand-light": "#EEE9FF",
        "surface-2": "#F0EDE8",
        "ink-2": "#5C574F",
        "tag-green": "#E8F7EE",
        "tag-amber": "#FEF3E2",
        "tag-red": "#FDECEA",
        "tag-blue": "#E8F1FD"
      },
      fontFamily: {
        sans: [
          "Noto Sans SC",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      },
      boxShadow: {
        sheep: "0 18px 40px rgba(26,25,22,0.10)",
        card: "0 2px 12px rgba(26,25,22,0.06)",
        btn: "0 4px 20px rgba(124,111,247,0.28)",
        record: "0 8px 40px rgba(124,111,247,0.35)"
      }
    }
  },
  plugins: []
};

export default config;
