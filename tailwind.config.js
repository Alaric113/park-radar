/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'radar-green':"#00ff99",
        'radar-bg':"#0f172a",
      }
    }
  },
  plugins: [],
}

