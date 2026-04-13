import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/content/**/*.{md,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0f1b33",
          50: "#f1f3f8",
          100: "#dde2ed",
          200: "#b6c0d6",
          300: "#8a9bbd",
          400: "#5d75a3",
          500: "#3d5685",
          600: "#1e2d52",
          700: "#162040",
          800: "#0f1b33",
          900: "#0a1224",
        },
        accent: {
          DEFAULT: "#2563eb",
          50: "#eff5ff",
          100: "#dbe7fe",
          200: "#bfd4fe",
          300: "#93b4fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        brand: {
          DEFAULT: "#3eb1e5",
          light: "#7dcdf0",
        },
        surface: "#f8fafc",
        ink: "#1e293b",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
      boxShadow: {
        card: "0 4px 24px -8px rgba(27, 42, 74, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
