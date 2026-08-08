import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load frontend/.env so the dev proxy targets the configured backend.
  const env = loadEnv(mode, process.cwd(), '');
  let apiUrl = env.VITE_API_URL || '/api';
  let socketUrl = env.VITE_SOCKET_URL || 'http://localhost:5000';

  // If VITE_API_URL is relative (e.g. '/api'), the browser uses same-origin
  // requests, so the Vite dev proxy must point at the local backend root.
  if (apiUrl.startsWith('/')) apiUrl = 'http://localhost:5000/api';
  if (!socketUrl) socketUrl = 'http://localhost:5000';

  // Strip a trailing '/api' so the proxy target is the backend root.
  const apiTarget = apiUrl.replace(/\/api\/?$/, '');

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: socketUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
})

