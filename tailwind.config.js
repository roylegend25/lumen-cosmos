/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cosmos: {
          void: '#050508',
          deep: '#0a0a12',
          night: '#0f0f1a',
          slate: '#1a1a2e',
          mist: '#2a2a40',
          silver: '#a0a0b8',
          soft: '#c8c8d8',
          pure: '#f0f0f8',
          accent: '#7c6aff',
          glow: '#9b8cff',
          nebula: '#c084fc',
          star: '#e0d4ff',
          gold: '#f5d78e',
          cyan: '#67e8f9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        'display-md': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display-sm': ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
      },
      backgroundImage: {
        'cosmos-gradient': 'radial-gradient(ellipse at 50% 0%, rgba(124, 106, 255, 0.15) 0%, transparent 60%)',
        'hero-glow': 'radial-gradient(ellipse at center, rgba(124, 106, 255, 0.25) 0%, transparent 70%)',
        'card-glow': 'linear-gradient(135deg, rgba(124, 106, 255, 0.1) 0%, rgba(192, 132, 252, 0.05) 100%)',
        'premium-gradient': 'linear-gradient(135deg, #7c6aff 0%, #c084fc 50%, #67e8f9 100%)',
      },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(124, 106, 255, 0.15)',
        'glow-md': '0 0 40px rgba(124, 106, 255, 0.2)',
        'glow-lg': '0 0 60px rgba(124, 106, 255, 0.25)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'premium': '0 8px 32px rgba(124, 106, 255, 0.3), 0 0 0 1px rgba(124, 106, 255, 0.2)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'twinkle': 'twinkle 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
