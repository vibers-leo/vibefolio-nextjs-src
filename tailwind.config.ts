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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shine: "shine 1.5s infinite",
      },
      transitionTimingFunction: {
        'supanova': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      boxShadow: {
        'card': '0 4px 24px -4px rgba(16, 24, 40, 0.06), 0 2px 8px -2px rgba(16, 24, 40, 0.03)',
        'card-hover': '0 20px 60px -15px rgba(16, 24, 40, 0.1), 0 4px 16px -4px rgba(16, 24, 40, 0.06)',
        'tinted': '0 8px 32px -8px rgba(22, 163, 74, 0.12)',
      },
      fontFamily: {
        sans: ["Pretendard", "var(--font-poppins)", "-apple-system", "BlinkMacSystemFont", "system-ui", "Apple SD Gothic Neo", "sans-serif"],
        poppins: ["var(--font-poppins)", "sans-serif"],
        pretendard: ["Pretendard", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

export default config;
