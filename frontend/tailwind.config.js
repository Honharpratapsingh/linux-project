/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        paper: {
          DEFAULT: 'var(--paper)',
          dark: 'var(--paper-dark)',
        },
        surface: 'var(--surface)',
        sidebar: 'var(--sidebar)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
        },
        marigold: {
          DEFAULT: 'var(--marigold)',
          tint: 'var(--marigold-tint)',
        },
        teal: 'var(--teal)',
        violet: {
          DEFAULT: 'var(--violet)',
          tint: 'var(--violet-tint)',
        },
        pink: 'var(--pink)',
        sky: {
          DEFAULT: 'var(--sky)',
          tint: 'var(--sky-tint)',
        },
        lime: 'var(--lime)',
        coral: 'var(--coral)',
        error: 'var(--error)',
        focus: 'var(--focus)',
        border: 'var(--border)',
        divider: 'var(--divider)',
        background: 'var(--background)',
        text: {
          DEFAULT: 'var(--text)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        // Backwards compatibility mappings for tests
        sage: 'var(--sage)',
        lavender: 'var(--lavender)',
        blue: 'var(--blue)',
        peach: 'var(--peach)',
      },
      fontFamily: {
        sans: ['"Space Grotesk Variable"', '"Space Grotesk"', 'sans-serif'],
        display: ['"Fraunces Variable"', '"Fraunces"', 'serif'],
        serif: ['"Fraunces Variable"', '"Fraunces"', 'serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      boxShadow: {
        hard: '5px 5px 0 0 #1B1410',
        'hard-hover': '7px 7px 0 0 #1B1410',
        'hard-sm': '3px 3px 0 0 #1B1410',
        'hard-xs': '2px 2px 0 0 #1B1410',
      },
    },
  },
  plugins: [],
};
