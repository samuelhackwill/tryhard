/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './client/*.{js,html}',
    './client/components/*.{js,html}',
    './client/components/*/*.{js,html}',
    './client/pages/*.{js,html}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        cursor: "url('/cursor.png')",
        pointer: "url('/pointer.png')",
        folder: "url('/folder.png')",
        samuel: "url('/samuel.png')",
        samuelSad: "url('/samuel_sad.png')",
        samuelSmile: "url('/samuel_smile.png')",
      },
      transitionProperty: {
        'opacity-colors': 'opacity, background-color, border-color, color, fill, stroke',
      },

      keyframes: {
        fall: {
          '0%': { transform: 'translateY(0vh)' },
          '100%': { transform: 'translateY(200vh)' },
        },
      },
      animation: {
        fall: 'fall 4s ease-in forwards',
      },
    },
  },
  plugins: [],
}
