import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths: works regardless of the directory the app is uploaded to
  base: './',
  plugins: [react()],
})
