/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        comus: {
          bg: '#F2F0EB',
          surface: '#FAF8F5',
          card: '#FFFFFF',
          navy: {
            DEFAULT: '#1E3A5F',
            dark: '#132640',
            light: '#2E5380',
            subtle: '#E8EEF5',
          },
          copper: {
            DEFAULT: '#C0674F',
            dark: '#9E4F39',
            light: '#D4836E',
            subtle: '#FAEDE9',
          },
          sage: {
            DEFAULT: '#5A826D',
            dark: '#3E5C4C',
            light: '#7DA690',
            subtle: '#EAF2ED',
          },
          sand: {
            DEFAULT: '#8C827A',
            dark: '#635B55',
            light: '#B8AEA6',
            subtle: '#F7F5F2',
          },
          amber: {
            DEFAULT: '#D97706',
            subtle: '#FEF3C7',
          }
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Lora', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(30, 58, 95, 0.06), 0 2px 6px -1px rgba(30, 58, 95, 0.04)',
        'soft-lg': '0 10px 30px -4px rgba(30, 58, 95, 0.08), 0 4px 12px -2px rgba(30, 58, 95, 0.05)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
