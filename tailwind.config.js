/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aspect brand colors - matching logo
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#27549D', // Aspect logo blue (exact match)
          600: '#1e4078', // Darker blue
          700: '#1a3563', // Deep blue
          800: '#152a4e',
          900: '#0f1f39',
          950: '#0a1424',
        },
        accent: {
          50: '#fefff0',
          100: '#feffd9',
          200: '#feffb3',
          300: '#feff8c',
          400: '#f3ff58',
          500: '#F1FF24', // Aspect logo yellow (exact match)
          600: '#d4e000',
          700: '#a8b300',
          800: '#7c8600',
          900: '#505900',
          950: '#2d3300',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
