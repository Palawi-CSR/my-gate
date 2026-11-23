import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// One .env for the whole project lives in the repo root, next to backend/ and frontend/.
const ENV_DIR = '..';

export default defineConfig(({ mode }) => {
  // '' prefix: read every variable here (ports), but only VITE_* ones reach the browser.
  const env = loadEnv(mode, ENV_DIR, '');
  const apiTarget = `http://127.0.0.1:${env.API_PORT || 8001}`;

  return {
    envDir: ENV_DIR,
    plugins: [react(), tailwindcss()],
    server: {
      port: Number(env.WEB_PORT) || 5180,
      strictPort: true, // fail loudly instead of drifting onto another app's port
      host: true, // also reachable from phones on the same Wi-Fi (http://<this-PC-IP>:5180)
      // In development /api and /files are forwarded to the FastAPI server.
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/files': { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
