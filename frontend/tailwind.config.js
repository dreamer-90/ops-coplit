/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
        colors: {
          "primary": "#06B6D4",
          "background-dark": "#060A14",
          "tactical-surface": "rgba(255, 255, 255, 0.03)",
          "tactical-border": "rgba(148, 163, 184, 0.08)",
          "status-success": "#10B981",
          "status-warning": "#F59E0B",
          "status-danger": "#EF4444",
          "muted": "#CBD5E1",
        },
        fontFamily: {
          sans: ["Space Grotesk", "sans-serif"],
        },
    },
  },
  plugins: [],
}
