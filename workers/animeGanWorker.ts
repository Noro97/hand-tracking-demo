/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web';

import { rgbaToTensor, tensorToRgba } from '../lib/animeGanTensor';

/**
 * Runs AnimeGANv2 inference off the main thread. Inference is tens of
 * milliseconds even at our small buffer size — enough to visibly stutter the
 * ~30 Hz camera loop if run inline, hence the worker.
 */

const MODEL_URL = '/models/animegan-v2-hayao.onnx';
const INPUT_NAME = 'generator_input:0';
const OUTPUT_NAME = 'generator/G_MODEL/out_layer/Tanh:0';

// NOTE: deliberately no `ort.env.wasm.wasmPaths`. Vite resolves onnxruntime-web's
// wasm/loader through the module graph and emits them as hashed assets. Pointing
// wasmPaths at a public/ copy instead makes ORT *import* from public/, which Vite
// rejects ("should not be imported from source code").

export interface AnimeGanRequest {
  type: 'infer';
  rgba: ArrayBuffer;
  width: number;
  height: number;
}

export type AnimeGanResponse =
  | { type: 'ready'; backend: string }
  | { type: 'error'; message: string }
  | { type: 'result'; rgba: ArrayBuffer; width: number; height: number };

let session: ort.InferenceSession | null = null;

/** WebGPU when available, WASM otherwise — the model runs acceptably on both at this resolution. */
async function loadSession(): Promise<{ session: ort.InferenceSession; backend: string }> {
  const providers: Array<'webgpu' | 'wasm'> = 'gpu' in navigator ? ['webgpu', 'wasm'] : ['wasm'];
  let lastError: unknown = null;

  for (const provider of providers) {
    try {
      const created = await ort.InferenceSession.create(MODEL_URL, { executionProviders: [provider] });
      return { session: created, backend: provider };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not create an inference session');
}

const post = (message: AnimeGanResponse, transfer: Transferable[] = []) =>
  (self as DedicatedWorkerGlobalScope).postMessage(message, transfer);

void (async () => {
  try {
    const loaded = await loadSession();
    session = loaded.session;
    post({ type: 'ready', backend: loaded.backend });
  } catch (error) {
    post({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to load the AnimeGAN model',
    });
  }
})();

self.onmessage = async (event: MessageEvent<AnimeGanRequest>) => {
  const { rgba, width, height } = event.data;
  if (!session) return;

  try {
    const input = new ort.Tensor('float32', rgbaToTensor(new Uint8ClampedArray(rgba), width, height), [
      1,
      height,
      width,
      3,
    ]);
    const output = await session.run({ [INPUT_NAME]: input });
    const data = output[OUTPUT_NAME]?.data as Float32Array | undefined;
    if (!data) return;

    const result = tensorToRgba(data, width, height);
    post({ type: 'result', rgba: result.buffer, width, height }, [result.buffer]);
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : 'Inference failed' });
  }
};
