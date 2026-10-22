/** @type {import('tailwindcss').Config} */
// Design tokens: one ink scale (stone), one accent (teal-700), one caution
// tone (amber). System fonts only, so the app makes no third-party font request.
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#f7f7f2',
        ink: { DEFAULT: '#1c1917', muted: '#57534e' },
        accent: { DEFAULT: '#0f766e', strong: '#115e59', soft: '#f0fdfa' },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        display: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', '"SFMono-Regular"', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      maxWidth: { page: '72rem' },
    },
  },
  plugins: [],
}
