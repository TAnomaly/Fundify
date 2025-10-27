import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        ui: ["var(--font-space-grotesk)", "var(--font-inter)", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-primary": "linear-gradient(135deg, #e0c084 0%, #a67a3b 100%)",
        "gradient-secondary": "linear-gradient(135deg, #39415a 0%, #161a27 100%)",
        "gradient-success": "linear-gradient(135deg, #90c3a2 0%, #426e5b 100%)",
        "gradient-hero": "linear-gradient(140deg, rgba(224,192,132,0.9) 0%, rgba(108,134,189,0.85) 52%, rgba(29,34,54,0.95) 100%)",
        "gradient-card": "linear-gradient(160deg, rgba(34,38,54,0.85) 0%, rgba(18,21,31,0.7) 100%)",
      },
      boxShadow: {
        "glow-sm": "0 0 18px rgba(224, 192, 132, 0.3)",
        "glow-md": "0 0 28px rgba(180, 140, 86, 0.34)",
        "glow-lg": "0 0 38px rgba(138, 101, 54, 0.4)",
        "card": "0 22px 38px -26px rgba(5, 7, 15, 0.85), 0 20px 58px -28px rgba(8, 10, 20, 0.6)",
        "card-hover": "0 30px 62px -26px rgba(5, 7, 15, 0.9)",
        "inner-glow": "inset 0 0 28px rgba(224, 192, 132, 0.14)",
        soft: "0 26px 58px -32px rgba(5, 7, 15, 0.82), 0 18px 44px -30px rgba(8, 10, 20, 0.6)",
        "soft-hover": "0 34px 78px -30px rgba(5, 7, 15, 0.88), 0 22px 56px -32px rgba(8, 10, 20, 0.65)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "fade-up": "fadeUp 0.6s ease-out",
        "slide-in": "slideIn 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "bounce-slow": "bounce 3s infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
        "gradient": "gradient 8s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "spotlight": "spotlight 2s ease .75s 1 forwards",
        "marquee-horizontal": "marquee-horizontal var(--duration) linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        spotlight: {
          "0%": {
            opacity: "0",
            transform: "translate(-72%, -62%) scale(0.5)",
          },
          "100%": {
            opacity: "1",
            transform: "translate(-50%,-40%) scale(1)",
          },
        },
        "marquee-horizontal": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
