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
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        // Apple-inspired color palette
        brand: {
          primary: "#007AFF", // Apple Blue
          secondary: "#5AC8FA", // Light Blue
          accent: "#FF9500", // Orange
          success: "#34C759", // Green
          warning: "#FF9500", // Orange
          danger: "#FF3B30", // Red
          gray: "#8E8E93", // Apple Gray
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#007AFF",
          foreground: "#ffffff",
          50: "#f0f8ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#007AFF",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        secondary: {
          DEFAULT: "#5AC8FA",
          foreground: "#ffffff",
          50: "#f0fdff",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#5AC8FA",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
        accent: {
          DEFAULT: "#FF9500",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#FF3B30",
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
        lg: "12px", // Apple-like border radius
        md: "8px",
        sm: "6px",
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
