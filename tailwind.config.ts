import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"]
      },
      colors: {
        cream: "#f6f1ea",
        sand: "#d9c9b7",
        stone: "#bcae9f",
        ink: "#201a17",
        rose: "#eadfd7",
        gold: "#b08d57"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(32, 26, 23, 0.08)",
        card: "0 14px 36px rgba(32, 26, 23, 0.08)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};

export default config;
