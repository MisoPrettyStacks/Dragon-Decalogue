/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        magenta: "#ff2ea6",
        lime: "#c8ff3d",
        ink: "#0a0a0a",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        hard: "6px 6px 0 0 #0a0a0a",
        "hard-sm": "3px 3px 0 0 #0a0a0a",
        "hard-magenta": "6px 6px 0 0 #ff2ea6",
      },
    },
  },
  plugins: [],
};
