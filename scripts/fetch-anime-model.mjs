/**
 * Download the AnimeGANv2 (Hayao) ONNX generator into public/models/.
 *
 * Deliberately NOT part of postinstall: it needs network access, and a failed
 * fetch must never break `npm install`. Run it explicitly with
 * `npm run fetch-model`. The app degrades gracefully when the file is absent —
 * the Anime scene effect reports "model missing" instead of crashing.
 *
 * Source: https://huggingface.co/vumichien/AnimeGANv2_Hayao (8.2 MB)
 */

import { mkdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const URL_SRC = 'https://huggingface.co/vumichien/AnimeGANv2_Hayao/resolve/main/AnimeGANv2_Hayao.onnx';
const DEST_DIR = 'public/models';
const DEST = join(DEST_DIR, 'animegan-v2-hayao.onnx');

if (existsSync(DEST)) {
  console.log(`[fetch-anime-model] already present (${(statSync(DEST).size / 1024 / 1024).toFixed(1)} MB) — delete it to re-download`);
  process.exit(0);
}

mkdirSync(DEST_DIR, { recursive: true });

console.log('[fetch-anime-model] downloading AnimeGANv2 Hayao …');
const res = await fetch(URL_SRC);
if (!res.ok) {
  console.error(`[fetch-anime-model] failed: HTTP ${res.status}. The Anime effect will be unavailable until this succeeds.`);
  process.exit(1);
}

writeFileSync(DEST, Buffer.from(await res.arrayBuffer()));
console.log(`[fetch-anime-model] ${(statSync(DEST).size / 1024 / 1024).toFixed(1)} MB → ${DEST}`);
