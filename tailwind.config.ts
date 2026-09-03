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
        cyber: {
          bg: "#060913",
          card: "rgba(13, 19, 34, 0.85)",
          border: "#1e293b",
          cyan: "#00f0ff",
          green: "#00ff66",
          magenta: "#ff007f",
          amber: "#ffb703",
          red: "#ff2a6d",
          muted: "#64748b",
        },
      },
      fontFamily: {
        mono: ["Consolas", "Monaco", "Courier New", "monospace"],
      },
      backgroundImage: {
        "cyber-grid": "radial-gradient(circle, rgba(0, 240, 255, 0.07) 1px, transparent 1px)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      boxShadow: {
        "cyan-glow": "0 0 15px rgba(0, 240, 255, 0.4)",
        "magenta-glow": "0 0 15px rgba(255, 0, 127, 0.4)",
        "green-glow": "0 0 15px rgba(0, 255, 102, 0.4)",
        "red-glow": "0 0 15px rgba(255, 42, 109, 0.4)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glitch": "glitch 2s infinite",
      },
      keyframes: {
        glitch: {
          "0%, 100%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
