/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c1d3fe',
          300: '#93b4fd',
          400: '#6090fa',
          500: '#3a6ef5',
          600: '#244de8',
          700: '#1c3cd4',
          800: '#1c33ac',
          900: '#1c2f88',
          950: '#141f55',
        },
        surface: {
          900: '#0f1629',
          800: '#151e38',
          700: '#1c2847',
          600: '#233257',
          500: '#2c3e6a',
        },
        kids: {
          light: '#fde68a',
          DEFAULT: '#f59e0b',
          dark: '#d97706',
        },
        teens: {
          light: '#a5f3fc',
          DEFAULT: '#06b6d4',
          dark: '#0891b2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
