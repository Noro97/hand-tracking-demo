import type { AnimeGanRequest, AnimeGanResponse } from '../workers/animeGanWorker';

export type AnimeGanStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Bridges the async AnimeGAN worker to the synchronous per-frame draw path.
 *
 * The scene-effect contract is synchronous (`stylize` must paint something
 * *this* frame), but inference takes tens of milliseconds. So this class never
 * blocks: it keeps the most recent completed frame and hands that back
 * immediately, dispatching a fresh inference only when the worker is idle.
 * The visible result is a stylized image that updates at the model's own rate
 * while the camera keeps running at full speed.
 */
export class AnimeGanStylizer {
  private worker: Worker | null = null;
  private status: AnimeGanStatus = 'idle';
  private errorMessage: string | null = null;
  private backend: string | null = null;
  private busy = false;
  private latest: ImageData | null = null;

  getStatus(): AnimeGanStatus {
    return this.status;
  }

  getError(): string | null {
    return this.errorMessage;
  }

  getBackend(): string | null {
    return this.backend;
  }

  /** Idempotent — safe to call from every frame; only the first call spawns the worker. */
  ensureStarted(): void {
    if (this.worker) return;
    this.status = 'loading';

    this.worker = new Worker(new URL('../workers/animeGanWorker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<AnimeGanResponse>) => this.handleMessage(event.data);
    this.worker.onerror = () => {
      this.status = 'error';
      this.errorMessage = 'Worker failed to start';
    };
  }

  /** Queues `rgba` for inference if the worker is free; ignored otherwise (frames are droppable). */
  submit(rgba: Uint8ClampedArray, width: number, height: number): void {
    if (this.status !== 'ready' || this.busy || !this.worker) return;
    this.busy = true;

    const copy = new Uint8ClampedArray(rgba);
    const message: AnimeGanRequest = { type: 'infer', rgba: copy.buffer, width, height };
    this.worker.postMessage(message, [copy.buffer]);
  }

  /** Most recent completed stylization, or null before the first result arrives. */
  getLatest(): ImageData | null {
    return this.latest;
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.status = 'idle';
    this.latest = null;
    this.busy = false;
  }

  private handleMessage(message: AnimeGanResponse): void {
    switch (message.type) {
      case 'ready':
        this.status = 'ready';
        this.backend = message.backend;
        break;
      case 'error':
        this.status = 'error';
        this.errorMessage = message.message;
        this.busy = false;
        break;
      case 'result':
        this.latest = new ImageData(new Uint8ClampedArray(message.rgba), message.width, message.height);
        this.busy = false;
        break;
    }
  }
}
