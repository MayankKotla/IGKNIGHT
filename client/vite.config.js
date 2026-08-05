import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // strictPort: fail loudly if 5173 is taken instead of silently switching
  // to 5174+ — that silent switch is what caused the CORS/"nothing happens"
  // bug we hit earlier, since the server only allows the CLIENT_URL origin.
  server: { port: 5173, strictPort: true },
})
