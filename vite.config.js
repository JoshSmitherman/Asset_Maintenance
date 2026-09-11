import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The GitHub Pages URL for a project site is https://<user>.github.io/<repo>/
// so the built assets must be requested from "/<repo>/" and not from "/".
// VITE_BASE_PATH is set by the GitHub Actions workflow (.github/workflows/deploy.yml)
// and can be set locally in .env if you want to preview the exact production paths.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH && env.VITE_BASE_PATH.trim() !== '' ? env.VITE_BASE_PATH : '/';

  return {
    base,
    plugins: [react()],
    server: { port: 5173 },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 900
    }
  };
});
