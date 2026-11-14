/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        sidebar: 'var(--sidebar)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
        },
        text: {
          DEFAULT: 'var(--text)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: 'var(--border)',
        divider: 'var(--divider)',
        sage: 'var(--sage)',
        lavender: 'var(--lavender)',
        blue: 'var(--blue)',
        peach: 'var(--peach)',
        error: 'var(--error)',
        focus: 'var(--focus)',
      },
      fontFamily: {
        sans: ['"Geist Sans"', 'sans-serif'],
        serif: ['Newsreader', 'serif'],
      },
    },
  },
  plugins: [],
};
