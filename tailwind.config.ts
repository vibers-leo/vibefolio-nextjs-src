// tailwind.config.ts (🚨 파일명은 .ts입니다)
import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    // 🚨 Next.js와 shadcn/ui를 위한 모든 경로를 포함해야 합니다.
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // shadcn/ui의 테마 설정 (이전에 init 시 생성된 CSS 변수 참조)
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shine: {
          "0%": { transform: "translateX(-150%) skewX(-15deg)" },
          "100%": { transform: "translateX(150%) skewX(-15deg)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(2rem)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "spring-up": {
          "0%": { transform: "translateY(40px)", opacity: "0" },
          "60%": { transform: "translateY(-4px)", opacity: "1" },
          "80%": { transform: "translateY(2px)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shine: "shine 1.5s infinite",
        "fade-in-up": "fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        float: "float 4s ease-in-out infinite",
        "spring-up": "spring-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      transitionTimingFunction: {
        'supanova': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      boxShadow: {
        'card': '0 4px 24px -4px rgba(16, 24, 40, 0.06), 0 2px 8px -2px rgba(16, 24, 40, 0.03)',
        'card-hover': '0 20px 60px -15px rgba(16, 24, 40, 0.1), 0 4px 16px -4px rgba(16, 24, 40, 0.06)',
        'tinted': '0 8px 32px -8px rgba(79, 70, 229, 0.12)',
        'indigo': '0 4px 20px -6px rgba(79, 70, 229, 0.3)',
        'indigo-lg': '0 12px 40px -10px rgba(79, 70, 229, 0.25)',
      },
      fontFamily: {
        sans: ["Paperlogy", "Pretendard Variable", "Pretendard", "system-ui", "sans-serif"],
        poppins: ["var(--font-poppins)", "sans-serif"],
        pretendard: ["Pretendard", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

export default config;
