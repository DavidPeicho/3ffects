import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '3ffects': path.resolve('../src/index.ts')
    },
  },
  plugins: [],
  server: {
    strictPort: true,
    port: 8080
  }
});
