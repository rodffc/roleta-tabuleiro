import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    host: true, // expõe na rede local (acessível por outros dispositivos no mesmo Wi-Fi)
    proxy: {
      // permite a busca na Ludopedia pelo navegador em dev (sem CORS).
      // No app Android o fetch é nativo e não usa este proxy.
      '/lp': {
        target: 'https://ludopedia.com.br',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/lp/, ''),
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      },
    },
  },
})
