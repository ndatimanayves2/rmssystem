/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#1d4ed8', light: '#3b82f6', dark: '#1e3a8a' },
        success:   { DEFAULT: '#16a34a', light: '#22c55e' },
        warning:   { DEFAULT: '#d97706', light: '#f59e0b' },
        danger:    { DEFAULT: '#dc2626', light: '#ef4444' },
        sidebar:   { DEFAULT: '#0f172a', hover: '#1e293b' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
