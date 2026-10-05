import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

// The commit and time this build was made, for the Release Notes footer. In
// GitHub Actions the commit comes from GITHUB_SHA; locally from git, if it is
// there at all.
function buildSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

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
    define: {
      'import.meta.env.VITE_BUILD_SHA': JSON.stringify(buildSha()),
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString())
    },
    server: { port: 5173 },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 900
    }
  };
});
