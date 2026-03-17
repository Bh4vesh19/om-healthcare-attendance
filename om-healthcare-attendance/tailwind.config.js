/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0D1117',
        card: '#161B22',
        cardHover: '#1C2128',
        surface: '#11161d',
        border: '#30363D',
        blue: '#58A6FF',
        green: '#3FB950',
        amber: '#D29922',
        red: '#F85149',
        textPrimary: '#E6EDF3',
        textSecondary: '#8B949E',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        panel: '0 24px 80px rgba(0, 0, 0, 0.32)',
        soft: '0 12px 40px rgba(0, 0, 0, 0.22)',
      },
      backgroundImage: {
        'mesh-dark': 'radial-gradient(circle at top left, rgba(88,166,255,0.16), transparent 30%), radial-gradient(circle at top right, rgba(210,153,34,0.12), transparent 26%), linear-gradient(180deg, #0D1117 0%, #0A1017 100%)',
      },
      animation: {
        'pulse-green': 'pulseGreen 2s infinite',
        'pulse-red': 'pulseRed 2s infinite',
        'fade-in': 'fadeIn 0.3s ease',
      },
      keyframes: {
        pulseGreen: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 8px #3FB950' },
          '50%': { opacity: '0.5' },
        },
        pulseRed: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 8px #F85149' },
          '50%': { opacity: '0.5' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
