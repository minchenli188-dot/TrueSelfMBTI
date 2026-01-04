import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // MBTI Group Colors
      colors: {
        // Analyst Group (NT types: INTJ, INTP, ENTJ, ENTP)
        analyst: {
          DEFAULT: "#88619a",
          50: "#f8f5fa",
          100: "#f0e9f3",
          200: "#e3d5e9",
          300: "#cfb7d8",
          400: "#b690c2",
          500: "#88619a",
          600: "#7a5589",
          700: "#674874",
          800: "#563d61",
          900: "#483551",
          950: "#2d1f32",
        },
        // Diplomat Group (NF types: INFJ, INFP, ENFJ, ENFP)
        diplomat: {
          DEFAULT: "#33a474",
          50: "#f0fdf6",
          100: "#dcfced",
          200: "#bbf7da",
          300: "#86efbe",
          400: "#4ade97",
          500: "#33a474",
          600: "#1d8a5c",
          700: "#1a6e4b",
          800: "#19573d",
          900: "#174834",
          950: "#07281c",
        },
        // Sentinel Group (SJ types: ISTJ, ISFJ, ESTJ, ESFJ)
        sentinel: {
          DEFAULT: "#4298b4",
          50: "#f2f9fb",
          100: "#e1f1f6",
          200: "#c7e4ee",
          300: "#a0d1e2",
          400: "#72b7d1",
          500: "#4298b4",
          600: "#387d9a",
          700: "#32677e",
          800: "#305568",
          900: "#2c4858",
          950: "#1d2f3b",
        },
        // Explorer Group (SP types: ISTP, ISFP, ESTP, ESFP)
        explorer: {
          DEFAULT: "#e2a03f",
          50: "#fdf9ed",
          100: "#f9eecc",
          200: "#f3db94",
          300: "#ecc35c",
          400: "#e2a03f",
          500: "#da8a26",
          600: "#c1691e",
          700: "#a04c1c",
          800: "#833c1d",
          900: "#6c331c",
          950: "#3e190b",
        },
        // UI Colors
        background: {
          DEFAULT: "#0a0a0f",
          secondary: "#121218",
          tertiary: "#1a1a24",
        },
        foreground: {
          DEFAULT: "#fafafa",
          muted: "#a1a1aa",
          subtle: "#71717a",
        },
        border: {
          DEFAULT: "#27272a",
          subtle: "#1f1f23",
        },
      },
      // Custom fonts
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        display: ["var(--font-instrument)", "serif"],
      },
      // Animation timing functions
      transitionTimingFunction: {
        "in-expo": "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
        "in-out-expo": "cubic-bezier(0.87, 0, 0.13, 1)",
      },
      // Custom animations
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gradient-x": "gradientX 15s ease infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      // Backdrop blur
      backdropBlur: {
        xs: "2px",
      },
      // Box shadow for glow effects
      boxShadow: {
        "glow-analyst": "0 0 40px -10px rgba(136, 97, 154, 0.4)",
        "glow-diplomat": "0 0 40px -10px rgba(51, 164, 116, 0.4)",
        "glow-sentinel": "0 0 40px -10px rgba(66, 152, 180, 0.4)",
        "glow-explorer": "0 0 40px -10px rgba(226, 160, 63, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;





