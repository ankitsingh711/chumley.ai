/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Client brand colors
        primary: {
          50: '#e8f0fb',   // Very light blue
          100: '#d1e1f7',  // Light blue
          200: '#a3c3ef',  // Lighter blue
          300: '#75a5e7',  // Light-medium blue
          400: '#5080ce',  // Main blue (client provided)
          500: '#3d6fc2',  // Darker blue (client provided)
          600: '#2f5aa3',  // Dark blue
          700: '#244684',  // Darker blue
          800: '#193165',  // Very dark blue
          900: '#0e1d46',  // Deepest blue
          950: '#070f27',  // Nearly black blue
        },
        accent: {
          50: '#fefff0',   // Very light yellow
          100: '#fdffe0',  // Light yellow
          200: '#fbffc1',  // Lighter yellow
          300: '#f9ffa2',  // Light-medium yellow
          400: '#f5ff63',  // Medium yellow
          500: '#f1ff24',  // Main yellow/lime (client provided)
          600: '#d4e600',  // Darker yellow
          700: '#a8b800',  // Dark yellow-green
          800: '#7c8a00',  // Darker yellow-green
          900: '#505c00',  // Very dark yellow-green
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
