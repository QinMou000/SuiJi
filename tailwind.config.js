/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* 番茄钟三种模式的语义色 */
        focus: {
          DEFAULT: "hsl(var(--focus) / <alpha-value>)",
          foreground: "hsl(var(--focus-foreground))",
          soft: "hsl(var(--focus-soft) / <alpha-value>)",
        },
        short: {
          DEFAULT: "hsl(var(--short-break) / <alpha-value>)",
          foreground: "hsl(var(--short-break-foreground))",
          soft: "hsl(var(--short-break-soft) / <alpha-value>)",
        },
        long: {
          DEFAULT: "hsl(var(--long-break) / <alpha-value>)",
          foreground: "hsl(var(--long-break-foreground))",
          soft: "hsl(var(--long-break-soft) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 12px)",
        "4xl": "calc(var(--radius) + 20px)",
        card: "1.5rem",
        panel: "1.75rem",
      },
      boxShadow: {
        float: "0 18px 50px -22px hsl(var(--glass-shadow) / 0.45)",
        lift: "0 24px 60px -30px hsl(var(--glass-shadow) / 0.55)",
        dock: "0 18px 50px -18px hsl(var(--glass-shadow) / 0.35)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.94)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-down": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        "word-in": {
          from: { opacity: "0", transform: "translateY(0.65em)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "word-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(-0.65em)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.55" },
          "50%": { transform: "scale(1.06)", opacity: "0.95" },
        },
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -8px, 0)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "bar-grow": {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
        "ping-soft": {
          "0%": { transform: "scale(1)", opacity: "0.45" },
          "80%, 100%": { transform: "scale(1.45)", opacity: "0" },
        },
        "aurora-1": {
          "0%": { transform: "translate3d(-6%, -4%, 0) scale(1) rotate(0deg)" },
          "50%": { transform: "translate3d(8%, 6%, 0) scale(1.15) rotate(12deg)" },
          "100%": { transform: "translate3d(-2%, 10%, 0) scale(0.95) rotate(-8deg)" },
        },
        "aurora-2": {
          "0%": { transform: "translate3d(4%, 8%, 0) scale(1.05) rotate(0deg)" },
          "50%": { transform: "translate3d(-10%, -6%, 0) scale(0.92) rotate(-14deg)" },
          "100%": { transform: "translate3d(6%, -2%, 0) scale(1.12) rotate(10deg)" },
        },
        "page-in": {
          "0%": { opacity: "0", transform: "translateY(10px)", filter: "blur(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        "reveal-up": {
          "0%": { opacity: "0", transform: "translateY(26px)", filter: "blur(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "orb-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        sheen: {
          "0%": { transform: "translateX(-130%) skewX(-18deg)" },
          "100%": { transform: "translateX(230%) skewX(-18deg)" },
        },
        "float-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-7px)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.25s ease-out both",
        "scale-in": "scale-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-up": "slide-up 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-down": "slide-down 0.24s ease-in both",
        "word-in": "word-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
        "word-out": "word-out 0.28s ease-in both",
        breathe: "breathe 5s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        "spin-slow": "spin-slow 26s linear infinite",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "bar-grow": "bar-grow 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "ping-soft": "ping-soft 2.4s cubic-bezier(0, 0, 0.2, 1) infinite",
        "aurora-1": "aurora-1 24s ease-in-out infinite alternate",
        "aurora-2": "aurora-2 30s ease-in-out infinite alternate",
        "page-in": "page-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "reveal-up": "reveal-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) both",
        marquee: "marquee 34s linear infinite",
        "orb-spin": "orb-spin 9s linear infinite",
        sheen: "sheen 1.1s ease-in-out",
        "float-soft": "float-soft 6s ease-in-out infinite",
        "gradient-shift": "gradient-shift 12s ease-in-out infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        380: "380ms",
        420: "420ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
}
