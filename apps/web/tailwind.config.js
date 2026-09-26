/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f0',
          100: '#ffe1df',
          500: '#ff4b3a',
          600: '#e0392a',
          700: '#ba2a1d',
        },
      },
    },
  },
  plugins: [],
};
