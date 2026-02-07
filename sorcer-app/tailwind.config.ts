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
        /* ── Botanical Journal palette ── */
        parchment: "#F7F3E8",
        "parchment-dark": "#EDE8D6",
        oak: "#6B3710",
        "oak-light": "#8B5E3C",
        moss: "#4B6A4C",
        "moss-light": "#5E8260",
        sage: "#A0A088",
        witchberry: "#B52121",
        topaz: "#DDA059",
        miami: "#59C9F1",
        /* keep legacy tokens so existing chat pages don't break */
        void: "#1A1510",
        mana: "#4B6A4C",
        toxic: "#A0A088",
        blight: "#B52121",
        mist: "#6B3710",
      },
      fontFamily: {
        header: ["var(--font-header)", "cursive"],
        sub: ["var(--font-sub)", "cursive"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-code)", "monospace"],
      },
      borderRadius: {
        botanical: "1.25rem",
      },
      boxShadow: {
        specimen: "0 2px 24px -4px rgba(107,55,16,0.12), 0 1px 4px -1px rgba(107,55,16,0.08)",
        "specimen-hover": "0 8px 32px -4px rgba(107,55,16,0.18), 0 2px 8px -1px rgba(107,55,16,0.10)",
        orb: "0 0 30px rgba(160,160,136,0.4), inset -10px -10px 50px #000",
        vignette: "inset 0 0 120px 40px rgba(26,21,16,0.25)",
      },
      animation: {
        "orb-pulse": "orbPulse 4s ease-in-out infinite",
        "orb-ripple": "orbRipple 0.6s ease-out forwards",
        "float-slow": "floatSlow 6s ease-in-out infinite",
        "leaf-drift": "leafDrift 20s linear infinite",
        "glow-border": "glowBorder 2s ease-in-out infinite alternate",
        "page-turn": "pageTurn 0.4s cubic-bezier(0.4,0,0.2,1)",
      },
      keyframes: {
        orbPulse: {
          "0%, 100%": { boxShadow: "0 0 30px rgba(160,160,136,0.4), inset -10px -10px 50px #000" },
          "50%": { boxShadow: "0 0 50px rgba(160,160,136,0.6), inset -10px -10px 50px #111" },
        },
        orbRipple: {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        leafDrift: {
          "0%": { transform: "translateY(-20px) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "0.6" },
          "90%": { opacity: "0.3" },
          "100%": { transform: "translateY(100vh) rotate(360deg)", opacity: "0" },
        },
        glowBorder: {
          "0%": { boxShadow: "0 0 4px rgba(160,160,136,0.2)" },
          "100%": { boxShadow: "0 0 12px rgba(160,160,136,0.5)" },
        },
        pageTurn: {
          "0%": { transform: "rotateY(-2deg) scale(0.98)", opacity: "0.7" },
          "100%": { transform: "rotateY(0) scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
