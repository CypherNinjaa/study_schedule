/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        study: 'rgb(var(--c-study) / <alpha-value>)',
        code: 'rgb(var(--c-code) / <alpha-value>)',
        college: 'rgb(var(--c-college) / <alpha-value>)',
        rel: 'rgb(var(--c-rel) / <alpha-value>)',
        sleep: 'rgb(var(--c-sleep) / <alpha-value>)',
        exercise: 'rgb(var(--c-exercise) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        ok: 'rgb(var(--c-ok) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { card: '14px', ctl: '10px' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 1px 3px rgb(0 0 0 / 0.06)',
        pop: '0 10px 30px -8px rgb(0 0 0 / 0.25), 0 2px 8px rgb(0 0 0 / 0.08)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'xp-float': {
          '0%': { opacity: '0', transform: 'translateY(4px) scale(0.96)' },
          '15%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '80%': { opacity: '1', transform: 'translateY(-10px) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-18px) scale(0.98)' },
        },
        pop: {
          '0%': { transform: 'scale(0.94)', opacity: '0' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out both',
        'slide-up': 'slide-up .2s ease-out both',
        'xp-float': 'xp-float 1.6s ease-out both',
        pop: 'pop .22s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};
