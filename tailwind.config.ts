import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "450px",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          primary: "#E11D74",
          secondary: "#F7A8C8",
          accent: "#E11D74",
          success: "#12B76A",
          warning: "#F79009",
          danger: "#F04438",
          gray: "#8A8A8E",
        },
        canvas: "#F3F1EF",
        ink: "#141414",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#E11D74",
          foreground: "#ffffff",
          50: "#FFF1F6",
          100: "#FFE4EE",
          200: "#FECDD9",
          300: "#FDA4BB",
          400: "#FB718A",
          500: "#E11D74",
          600: "#C91863",
          700: "#A1104F",
          800: "#881044",
          900: "#6B1239",
        },
        secondary: {
          DEFAULT: "#F6F5F3",
          foreground: "#141414",
        },
        accent: {
          DEFAULT: "#E11D74",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#F04438",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "1.25rem",
        md: "0.9rem",
        sm: "0.6rem",
      },
      boxShadow: {
        apple: "0 4px 16px rgba(0, 0, 0, 0.1)",
        "apple-lg": "0 8px 32px rgba(0, 0, 0, 0.12)",
        "apple-sm": "0 2px 8px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
}

export default config
