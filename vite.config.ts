import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss()],
  // esbuild's dep pre-bundling rewrites onnxruntime-web's dynamic wasm/loader
  // resolution and breaks initWasm() in dev ("no available backend found").
  // Excluding it makes Vite serve the package's own ESM untouched; the
  // production build already handles it correctly and is unaffected.
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
