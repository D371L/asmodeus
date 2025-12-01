/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./components/**/*.{ts,tsx}",
    "./utils/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
    "./types.ts",
    "./constants.ts"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
