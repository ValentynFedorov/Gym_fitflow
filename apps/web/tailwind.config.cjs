/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#020617',
        surface: '#111827',
        accent: {
          blue: '#38bdf8',
          emerald: '#10b981',
        },
      },
    },
  },
  plugins: [],
};
