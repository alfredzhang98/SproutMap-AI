import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-soft": "var(--surface-soft)",
        primary: "var(--primary)",
        "primary-dark": "var(--primary-dark)",
        "primary-light": "var(--primary-light)",
        accent: "var(--accent)",
        "text-main": "var(--text-main)",
        "text-muted": "var(--text-muted)",
        border: "var(--border)",
        danger: "var(--danger)",
        warning: "var(--warning)",
      },
      borderRadius: {
        xl: "0.85rem",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(27, 31, 29, 0.06), 0 6px 18px rgba(27, 31, 29, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
