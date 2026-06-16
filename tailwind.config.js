/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#eff8ff',
          100: '#dbeffe',
          200: '#bfe3fd',
          300: '#93d1fb',
          400: '#60b7f7',
          500: '#3b97f2',
          600: '#2578e7',
          700: '#1d62d4',
          800: '#1e4fac',
          900: '#1e4488',
          950: '#172b54',
        },
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'pulse-dot': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
      },
      animation: {
        'fade-in':   'fade-in 0.35s ease both',
        'slide-in':  'slide-in 0.25s ease both',
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
