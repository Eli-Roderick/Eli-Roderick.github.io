/*******************
 Tailwind CSS Config
********************/

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        serpBlue: '#1a0dab',
        serpGreen: '#006621',
        serpAd: '#f1f8ff',
        serpAdBorder: '#c6dafc'
      }
    },
  },
  plugins: [],
}
