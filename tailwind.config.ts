import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1280px" },
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
        /* ── Named Mediterranean tokens ── */
        paper: {
          DEFAULT: "#F4EFE6",
          2: "#EBE4D6",
          3: "#DDD3BF",
        },
        ink: {
          DEFAULT: "#1A1713",
          2: "#3B342A",
          3: "#6B6152",
        },
        terracotta: {
          DEFAULT: "#B7452B",
          hover: "#9E3A23",
          tint: "#EAD4C9",
        },
        line: {
          DEFAULT: "#C9BFA9",
          2: "#E0D6C0",
        },
        sea: "#1F4E5F",
        /* legacy tokens for AdminUI */
        surface: {
          DEFAULT: "hsl(var(--surface))",
          elevated: "hsl(var(--surface-elevated))",
          soft: "hsl(var(--surface-soft))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        ar: ["Noto Naskh Arabic", "sans-serif"],
      },
      fontSize: {
        "body-lg": ["17px", { lineHeight: "1.55" }],
        body:      ["15px", { lineHeight: "1.5" }],
        label:     ["12px", { lineHeight: "1.4", fontWeight: "500" }],
        hint:      ["12px", { lineHeight: "1.4" }],
        eyebrow:   ["11px", { lineHeight: "1.4", letterSpacing: "0.14em" }],
      },
      borderRadius: {
        xs:   "4px",
        sm:   "8px",
        md:   "12px",
        lg:   "18px",
        xl:   "28px",
        full: "999px",
        /* keep shadcn aliases */
        DEFAULT: "var(--radius)",
      },
      boxShadow: {
        sm:   "var(--shadow-sm)",
        md:   "var(--shadow-md)",
        lg:   "var(--shadow-lg)",
        /* legacy */
        soft: "var(--shadow-sm)",
        card: "var(--shadow-md)",
        glow: "var(--shadow-glow)",
      },
      backgroundImage: {
        "hero-field":   "var(--gradient-hero)",
        "sunset-line":  "var(--gradient-sunset)",
        "admin-panel":  "var(--gradient-admin)",
        "metal":        "var(--gradient-metal)",
      },
      height: {
        header: "72px",
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
        "float-drive": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(-1deg)" },
          "50%":       { transform: "translate3d(10px, -8px, 0) rotate(1deg)" },
        },
        "reveal-up": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "float-drive":    "float-drive 7s ease-in-out infinite",
        "reveal-up":      "reveal-up 0.7s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
