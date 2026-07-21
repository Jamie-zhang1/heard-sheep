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
        paper: "#FFFFFF",
        ink: "#201D18",
        muted: "#929292",
        line: "#ECECEC",
        brand: "#171717",
        "brand-light": "#EEEEEC",
        "surface-2": "#F7F7F7",
        "ink-2": "#5F5F5F",
        "tag-green": "#EEEEEC",
        "tag-amber": "#F2F2F0",
        "tag-red": "#FDECEA",
        "tag-blue": "#EEEEEC"
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
        sheep: "0 18px 40px rgba(88,58,18,0.12)",
        card: "0 8px 28px rgba(88,58,18,0.07)",
        btn: "0 8px 22px rgba(0,0,0,0.18)",
        record: "0 12px 30px rgba(0,0,0,0.22)"
      }
    }
  },
  plugins: []
};

export default config;
