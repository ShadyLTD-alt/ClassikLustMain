export default {
  plugins: {
    tailwindcss: {
      config: './tailwind.config.ts',
    },
    autoprefixer: {
      from: 'src/index.css', // This is what was missing!
    },
  },
}
