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
        sans: ['"Instrument Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Newsreader"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { card: '14px', ctl: '10px' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.05), 0 1px 3px rgb(0 0 0 / 0.08)',
        pop: '0 8px 24px -4px rgb(0 0 0 / 0.25)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        tongue: {
          '0%, 100%': { transform: 'scaleX(0.2)', opacity: '0' },
          '40%, 60%': { transform: 'scaleX(1.3)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out both',
        tongue: 'tongue 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
