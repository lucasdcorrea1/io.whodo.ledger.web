import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        // financial semantic
        income: '#10b981',
        'income-soft': 'rgba(16, 185, 129, 0.12)',
        expense: '#f43f5e',
        'expense-soft': 'rgba(244, 63, 94, 0.12)',
        warning: '#f59e0b',
        'warning-soft': 'rgba(245, 158, 11, 0.14)',
        success: '#10b981',

        // 5-level elevation:
        //   background (chrome) → surface (workspace) → card → surface-hover → elevated (chip)
        background: 'hsl(225 22% 3%)',      // chrome: sidebar + topbar (outer frame)
        surface: 'hsl(225 18% 8%)',         // workspace area (the content "platform")
        'surface-hover': 'hsl(225 14% 16%)',
        elevated: 'hsl(225 14% 22%)',       // chips & badges inside cards
        foreground: 'hsl(0 0% 98%)',
        border: 'hsl(225 14% 16%)',
        'border-strong': 'hsl(225 12% 30%)',
        ring: 'hsl(263 85% 65%)',

        muted: {
          DEFAULT: 'hsl(225 14% 16%)',
          foreground: 'hsl(225 14% 78%)',
        },
        primary: {
          DEFAULT: 'hsl(263 85% 65%)',
          foreground: 'hsl(0 0% 100%)',
          soft: 'rgba(168, 85, 247, 0.16)',
          glow: 'rgba(168, 85, 247, 0.4)',
        },
        card: {
          DEFAULT: 'hsl(225 16% 12%)',      // raised card ON the workspace
          foreground: 'hsl(0 0% 98%)',
        },
      },
      backgroundImage: {
        'hero-gradient':
          'radial-gradient(120% 80% at 0% 0%, rgba(168, 85, 247, 0.28) 0%, rgba(168, 85, 247, 0) 60%), linear-gradient(140deg, hsl(225 16% 15%) 0%, hsl(225 16% 11%) 100%)',
        'card-gradient': 'linear-gradient(180deg, hsl(225 16% 13%) 0%, hsl(225 16% 11%) 100%)',
        'page-glow':
          'radial-gradient(80% 50% at 50% -10%, rgba(168, 85, 247, 0.12) 0%, rgba(168, 85, 247, 0) 70%)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(168, 85, 247, 0.3), 0 8px 32px -8px rgba(168, 85, 247, 0.4)',
        card: '0 1px 0 0 hsla(0,0%,100%,0.03) inset, 0 1px 1px 0 rgba(0,0,0,0.2)',
        elevated: '0 8px 24px -8px rgba(0, 0, 0, 0.6), 0 1px 0 0 hsla(0,0%,100%,0.04) inset',
      },
      fontFeatureSettings: {
        tnum: '"tnum","ss01","cv11"',
      },
    },
  },
} satisfies Config
