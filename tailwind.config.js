/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ces-navy': '#00356C',
        'ces-navy-light': '#004a94',
        'ces-orange': '#F99D1C',
        'ces-orange-light': '#FFF4DC',
        'ces-bg': '#f0f4f8',
        'ces-card': '#fafbff',
        'ces-border': '#dde3f0',
        'ces-text': '#1a1a2e',
        'ces-muted': '#555',
      },
      fontFamily: {
        sans: ['Satoshi', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '8px',
        md: '6px',
        sm: '4px',
      },
    },
  },
  plugins: [],
}
