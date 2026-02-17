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
        gray: {
          500: '#000000',
          600: '#000000',
          700: '#000000',
          800: '#000000',
          900: '#000000',
        },
        primary: {
          50: '#f0f4fa',
          100: '#dde7f4',
          200: '#bfd2eb',
          300: '#94b6e0',
          400: '#5A9CF6', // user Light
          500: '#27549D', // user Dark
          600: '#1f4384',
          700: '#1a3563',
          800: '#172d53',
          900: '#17325E', // user Darkest
          950: '#0e1b36',
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
        sans: ['Mont', 'sans-serif'],
      },
      fontWeight: {
        medium: '350',
        semibold: '450',
        bold: '550',
        extrabold: '650',
      },
    },
  },
  plugins: [],
}
