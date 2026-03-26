/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#020617",
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          600: "#475569",
        },
        cyan: {
          // keep defaults, just adding glow alias
          glow: "rgba(6,182,212,0.35)",
        },
      },
      boxShadow: {
        "glow-cyan": "0 0 20px rgba(6,182,212,0.25), 0 0 40px rgba(6,182,212,0.10)",
        "glow-red":  "0 0 20px rgba(239,68,68,0.30),  0 0 40px rgba(239,68,68,0.10)",
        "glow-green":"0 0 16px rgba(52,211,153,0.25)",
        "panel":     "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      backgroundImage: {
        "grid-dark":
          "linear-gradient(rgba(51,65,85,0.2) 1px,transparent 1px)," +
          "linear-gradient(to right,rgba(51,65,85,0.2) 1px,transparent 1px)",
        "radial-glow":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(6,182,212,0.08), transparent)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "spin-slow":  "spin 3s linear infinite",
        "fade-in":    "fadeIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
