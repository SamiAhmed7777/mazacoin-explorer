/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'maza-blue': '#1e40af',
        'maza-dark': '#0f172a',
        'maza-gray': '#1e293b',
      }
    },
  },
  plugins: [],
}
