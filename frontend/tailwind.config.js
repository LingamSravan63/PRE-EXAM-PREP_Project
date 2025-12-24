/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'navy-dark': '#0a192f',    // Main Background
        'navy-light': '#112240',   // Card Background
        'navy-lightest': '#233554',// Hover, Borders
        'slate-light': '#a8b2d1',  // Lighter Text
        'slate-dark': '#8892b0',   // Regular Text
        'cyan-glow': '#64ffda',    // Accent & Glow Color
        'pastel-success': '#859900', // Kept for success states
        'pastel-error': '#dc322f',   // Kept for error states
      },
      keyframes: {
        'fade-in': {
            '0%': { opacity: '0', transform: 'translateY(10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
          'fade-in': 'fade-in 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
}