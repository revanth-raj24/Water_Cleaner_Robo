/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        robot: {
          dark: "#0f172a",
          panel: "#1e293b",
          border: "#334155",
          accent: "#0ea5e9",
          success: "#22c55e",
          warning: "#f59e0b",
          danger: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
