/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    theme: {
      extend: {
        colors: {
          'custom-yellow': '#F6F9CD',
        },
        borderRadius: {
          'custom': '30px',
        },
        dropShadow: {
          'custom': '-5px 10px 0 rgba(0,0,0,1)',
        },
      },
    },
  },
  plugins: [],
}
