import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

const build = process.env.GITHUB_RUN_NUMBER;
const version = build ? pkg.version.replace(/\.\d+$/, `.${build}`) : `${pkg.version}-dev`;

// Relative base so the same build works on GitHub Pages (/lemon-lane/) and inside the Android app.
// Older Fire tablet WebViews are Chromium-based but can lag behind, so target a conservative baseline.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: { target: ['es2019', 'chrome79'], cssTarget: 'chrome79' },
});
