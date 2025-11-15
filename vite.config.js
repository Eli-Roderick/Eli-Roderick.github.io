import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // For user/organization pages (username.github.io), the base must be '/'
  base: '/',
  server: { 
    port: 5173, 
    strictPort: true,
    // Enable client-side routing fallback
    historyApiFallback: true
  },
  build: { 
    outDir: 'dist',
    // Generate a fallback for client-side routing
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
})
