import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the app under /<repo-name>/
  base: '/tilgungsrechner/',
  plugins: [react()],
})
