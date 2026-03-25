import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { runFrontendSystemCheck } from "./ed/systemCheck.js";

await runFrontendSystemCheck();

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
