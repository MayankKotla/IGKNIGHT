/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'ucf-gold': '#FFC904',
        'ucf-black': '#000000',
        'app-bg':             '#0d0d11',
        'app-surface':        '#13131b',
        'app-surface-raised': '#181820',
        'app-input':          '#1c1c26',
        'app-elevated':       '#1a1a2e',
        'app-border':         '#26263a',
        'app-border-subtle':  '#1a1a28',
      },
      fontFamily: {
        sans: ['Geist Variable', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
