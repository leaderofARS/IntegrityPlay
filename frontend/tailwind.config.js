/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e7efff",
          100: "#c2d4ff",
          200: "#9bb9ff",
          300: "#749eff",
          400: "#4d84ff",
          500: "#356ae6",
          600: "#2852b4",
          700: "#1c3b82",
          800: "#112552",
          900: "#09132a"
        }
      }
    }
  },
  plugins: []
};

