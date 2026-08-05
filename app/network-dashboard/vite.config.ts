import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    proxy: {
      '/franqueadora': {
        target: 'https://sa-build-platform-org-dev-myfranchise-srv.cfapps.us10.hana.ondemand.com',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
