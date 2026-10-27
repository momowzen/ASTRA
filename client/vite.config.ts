import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** Run a git command, returning '' when git or the history is unavailable. */
function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

/**
 * Release version: `<major>.<minor>.<commit count>` — it bumps on every
 * pushed commit. The short commit sha is carried alongside so a release can
 * be identified exactly even if history is rewritten.
 */
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
  version: string;
};
const commitCount = git('rev-list --count HEAD');
const commit = git('rev-parse --short HEAD') || 'dev';
const base = pkg.version.match(/^(\d+\.\d+)/)?.[1] ?? pkg.version;
const appVersion = commitCount ? `${base}.${commitCount}` : pkg.version;

/**
 * Exposes the release to app code as `virtual:astra-release` (works in dev
 * and build, unlike `define`, which Vite only replaces when bundling).
 */
const RELEASE_ID = 'virtual:astra-release';
const RELEASE_MODULE = [
  `export const APP_VERSION = ${JSON.stringify(appVersion)};`,
  `export const APP_COMMIT = ${JSON.stringify(commit)};`,
  '',
].join('\n');

function releasePlugin(): Plugin {
  return {
    name: 'astra-release',
    resolveId(id) {
      return id === RELEASE_ID ? `\0${RELEASE_ID}` : null;
    },
    load(id) {
      return id === `\0${RELEASE_ID}` ? RELEASE_MODULE : null;
    },
  };
}

/**
 * Publishes dist/version.json with each production build; the running app
 * polls it and reloads itself when the deployed release changes.
 * (Dev server doesn't build, so the poll 404s and sync stays inert.)
 */
function versionJsonPlugin(): Plugin {
  return {
    name: 'astra-version-json',
    apply: 'build',
    closeBundle() {
      const payload = {
        version: appVersion,
        commit,
        builtAt: new Date().toISOString(),
      };
      writeFileSync(
        path.join(root, 'dist', 'version.json'),
        `${JSON.stringify(payload, null, 2)}\n`,
        'utf8',
      );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [releasePlugin(), react(), versionJsonPlugin()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
