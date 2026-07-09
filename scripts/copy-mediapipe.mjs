/**
 * Copy MediaPipe runtime assets from node_modules into public/mediapipe/.
 *
 * Why: serving MediaPipe from a CDN is fragile (Module.arguments abort, CORS issues
 * with packed assets). Serving from public/ guarantees same-origin loading, exact
 * version match, and offline work. We don't commit the ~50 MB of binaries into git
 * — this script regenerates them from npm-installed packages.
 *
 * Runs automatically via `postinstall` in package.json.
 */

import { mkdirSync, readdirSync, copyFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGES = ['hands', 'face_mesh', 'camera_utils', 'drawing_utils'];
const SRC_BASE = 'node_modules/@mediapipe';
const DEST_BASE = 'public/mediapipe';

let total = 0;

for (const pkg of PACKAGES) {
  const src = join(SRC_BASE, pkg);
  const dest = join(DEST_BASE, pkg);

  if (!existsSync(src)) {
    console.warn(`[copy-mediapipe] skip ${pkg}: source not found at ${src}`);
    continue;
  }

  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }
  mkdirSync(dest, { recursive: true });

  let count = 0;
  let bytes = 0;
  for (const file of readdirSync(src)) {
    const srcFile = join(src, file);
    const stat = statSync(srcFile);
    if (!stat.isFile()) continue;
    copyFileSync(srcFile, join(dest, file));
    bytes += stat.size;
    count++;
  }
  console.log(`[copy-mediapipe] ${pkg}: ${count} files, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  total += bytes;
}

console.log(`[copy-mediapipe] total: ${(total / 1024 / 1024).toFixed(1)} MB → ${DEST_BASE}/`);
