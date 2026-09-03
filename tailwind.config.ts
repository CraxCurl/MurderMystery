import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        murdle: {
          paper: "#fbfbf9",
          manila: "#fff5e2",
          ink: "#000000",
          charcoal: "#1a1a1a",
          crimson: "#A30B37",
          "crimson-dark": "#85082c",
          muted: "#6b7280",
          faded: "#888888",
          gray: "#f5f5f5",
          "border-gray": "#e5e5e5",
        },
      },
      fontFamily: {
        mono: [
          "'Courier Prime'",
          "'Courier New'",
          "Courier",
          "'Lucida Console'",
          "Monaco",
          "monospace",
        ],
        typewriter: [
          "'Courier Prime'",
          "'Courier New'",
          "Courier",
          "'Lucida Console'",
          "Monaco",
          "monospace",
        ],
      },
      boxShadow: {
        "murdle-sm": "2px 2px 0px #000000",
        murdle: "3px 3px 0px #000000",
        "murdle-md": "4px 4px 0px #000000",
        "murdle-lg": "6px 6px 0px #000000",
        "murdle-crimson": "3px 3px 0px #A30B37",
      },
    },
  },
  plugins: [],
};

export default config;
