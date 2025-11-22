/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Dark Green Theme
        bg: '#05110d',        // Very dark green/black background
        surface: '#0d231e',   // Slightly lighter green for cards/sidebar
        'surface-hover': '#14332c', // Hover state
        primary: '#22c55e',   // Bright Neon Green (Tailwind green-500)
        secondary: '#eab308', // Yellow/Gold for accents (Tailwind yellow-500)
        text: '#f0fdf4',      // Off-white/mint for text
        'text-muted': '#86efac', // Muted green text
        border: '#1f4b3f',    // Dark green border
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
