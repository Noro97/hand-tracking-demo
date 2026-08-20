import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShootingGameController } from './shootingGame';
import { LM } from '../lib/landmarks';
import type { HandObservation, Handedness } from '../lib/recognition';
import type { NormalizedLandmark } from '../types';

const W = 1000;
const H = 1000;

function lm(x: number, y: number): NormalizedLandmark {
  return { x, y, z: 0 };
}

/**
 * A pistol hand whose FINGERTIP sits at (tipX, tipY) in normalized space, with
 * the thumb either raised (hammer up) or dropped onto the knuckle (fired).
 *
 * Aiming is cursor-based, so what matters is where the fingertip lands after
 * mirroring: cursorX = (1 - tipX) * width. tipX 0.5 therefore puts the cursor
 * on a centre-spawned target.
 */
function pistolHand(
  handedness: Handedness,
  thumbDropped: boolean,
  tipX = 0.5,
  tipY = 0.5,
): HandObservation {
  const landmarks: NormalizedLandmark[] = [];
  landmarks[LM.WRIST] = lm(tipX - 0.2, tipY);
  landmarks[LM.MIDDLE_MCP] = lm(tipX - 0.1, tipY); // handSize = 0.1
  landmarks[LM.INDEX_MCP] = lm(tipX - 0.12, tipY);
  landmarks[LM.INDEX_PIP] = lm(tipX - 0.08, tipY);
  landmarks[LM.INDEX_TIP] = lm(tipX, tipY); // reach 0.2 vs pip 0.12 -> extended
  for (const [pip, tip] of [
    [LM.MIDDLE_PIP, LM.MIDDLE_TIP],
    [LM.RING_PIP, LM.RING_TIP],
    [LM.PINKY_PIP, LM.PINKY_TIP],
  ]) {
    landmarks[pip!] = lm(tipX - 0.11, tipY);
    landmarks[tip!] = lm(tipX - 0.115, tipY); // curled: tip nearer the wrist than the pip
  }
  landmarks[LM.THUMB_TIP] = thumbDropped ? lm(tipX - 0.115, tipY) : lm(tipX, tipY);

  return { handedness, handednessScore: 1, pointer: { x: 0, y: 0 }, gestures: {}, gestureDistances: {}, landmarks };
}

function openHand(handedness: Handedness): HandObservation {
  const hand = pistolHand(handedness, true);
  for (const tip of [LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP]) {
    hand.landmarks[tip] = lm(0.5, 0.5); // everything extended → not a pistol
  }
  return hand;
}

function makeController(): ShootingGameController {
  // Fixed RNG puts every target dead centre (500, 500) — on the aim line.
  return new ShootingGameController(
    () => {},
    () => Date.now(),
    () => 0.5,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});

describe('ShootingGameController', () => {
  it('does nothing until started', () => {
    const game = makeController();
    game.frame([pistolHand('Right', true)], W, H);
    expect(game.getState().shots).toBe(0);
    expect(game.getState().targets).toHaveLength(0);
  });

  it('spawns a target on the first frame', () => {
    const game = makeController();
    game.start();
    game.frame([], W, H);
    expect(game.getState().targets).toHaveLength(1);
  });

  it('spawns immediately even when the clock starts at zero', () => {
    // Regression: lastSpawnAt used to anchor at 0, so a zero-origin clock made
    // the first target wait a full spawn interval. Only Date.now()'s magnitude
    // hid it in the other tests.
    let t = 0;
    const game = new ShootingGameController(
      () => {},
      () => t,
      () => 0.5,
    );
    game.start();
    game.frame([], W, H);
    expect(game.getState().targets).toHaveLength(1);
    t = 10;
    game.frame([], W, H);
    expect(game.getState().targets).toHaveLength(1); // and does not immediately spawn a second
  });

  it('fires once per trigger pull, not once per frame held', () => {
    const game = makeController();
    game.start();
    game.frame([pistolHand('Right', false)], W, H); // hammer up

    // Drop the thumb and hold it for many frames past the debounce.
    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(1_000_000 + 100 + i * 30);
      game.frame([pistolHand('Right', true)], W, H);
    }
    expect(game.getState().shots).toBe(1);
  });

  it('fires again after the thumb is raised and dropped once more', () => {
    const game = makeController();
    game.start();
    const step = (dropped: boolean, t: number) => {
      vi.setSystemTime(1_000_000 + t);
      game.frame([pistolHand('Right', dropped)], W, H);
    };
    step(false, 0);
    step(true, 200);
    step(true, 400); // debounce elapsed -> shot 1
    expect(game.getState().shots).toBe(1);
    step(false, 600); // release
    step(false, 800);
    step(true, 1000); // pull again
    step(true, 1200); // debounce elapsed -> shot 2
    expect(game.getState().shots).toBe(2);
  });

  it('scores a hit on a target lying along the aim line', () => {
    const game = makeController();
    game.start();
    game.frame([pistolHand('Right', false)], W, H); // spawns a target at (500,500)
    expect(game.getState().targets).toHaveLength(1);

    vi.setSystemTime(1_000_000 + 200);
    game.frame([pistolHand('Right', true)], W, H); // candidate flips
    vi.setSystemTime(1_000_000 + 400);
    game.frame([pistolHand('Right', true)], W, H); // debounce elapsed -> shot

    const state = game.getState();
    expect(state.hits).toBe(1);
    expect(state.score).toBe(100);
    expect(state.targets).toHaveLength(0); // destroyed
    expect(state.tracers.at(-1)?.hit).toBe(true);
  });

  it('counts a miss when nothing lies along the aim line', () => {
    const game = makeController();
    game.start();
    game.frame([pistolHand('Right', false, 0.5, 0.5)], W, H);

    // Move the cursor to y=0.9 — nowhere near the centre-spawned target.
    vi.setSystemTime(1_000_000 + 200);
    game.frame([pistolHand('Right', true, 0.5, 0.9)], W, H);
    vi.setSystemTime(1_000_000 + 400);
    game.frame([pistolHand('Right', true, 0.5, 0.9)], W, H);

    const state = game.getState();
    expect(state.shots).toBe(1);
    expect(state.hits).toBe(0);
    expect(state.targets).toHaveLength(1); // survived
    expect(state.tracers.at(-1)?.hit).toBe(false);
  });

  it('never fires from a non-pistol hand, even with the thumb down', () => {
    const game = makeController();
    game.start();
    for (let i = 0; i < 10; i++) {
      vi.setSystemTime(1_000_000 + i * 50);
      game.frame([openHand('Right')], W, H);
    }
    const state = game.getState();
    expect(state.shots).toBe(0);
    expect(state.aims[0]?.armed).toBe(false);
  });

  it('reports aim state per hand for the crosshair', () => {
    const game = makeController();
    game.start();
    game.frame([pistolHand('Right', false)], W, H);

    const aim = game.getState().aims[0];
    expect(aim?.armed).toBe(true);
    // Cursor is the fingertip, mirrored once into game-layer space.
    expect(aim?.aim?.cursor.x).toBeCloseTo(500); // (1 - 0.5) * 1000
    expect(aim?.aim?.cursor.y).toBeCloseTo(500);
    // Muzzle stays on the knuckle, mirrored to the opposite side of the cursor.
    expect(aim?.aim?.muzzle.x).toBeCloseTo(620); // (1 - 0.38) * 1000
  });

  it('hits while pointing AT the screen — the pose that broke ray-based aiming', () => {
    // Finger pointing toward the camera collapses knuckle and tip onto nearly
    // the same 2D point. Ray aiming degenerated here; the cursor does not.
    const game = makeController();
    game.start();
    const atScreen = (thumbDropped: boolean): HandObservation => {
      const h = pistolHand('Right', thumbDropped, 0.5, 0.5);
      h.landmarks[LM.INDEX_MCP] = lm(0.5000001, 0.5000001); // knuckle ~ on top of tip
      // The thumb must be measured against the MOVED knuckle, or the trigger
      // can never register in this pose.
      h.landmarks[LM.THUMB_TIP] = thumbDropped ? lm(0.5, 0.5) : lm(0.38, 0.5);
      return h;
    };
    game.frame([atScreen(false)], W, H);
    expect(game.getState().targets).toHaveLength(1);

    vi.setSystemTime(1_000_000 + 200);
    game.frame([atScreen(true)], W, H);
    vi.setSystemTime(1_000_000 + 400);
    game.frame([atScreen(true)], W, H);

    expect(game.getState().hits).toBe(1);
  });

  it('smooths the cursor so landmark jitter does not shake the crosshair', () => {
    const game = makeController();
    game.start();

    // Settle, then feed one noisy frame — a real landmark glitch.
    for (let i = 0; i < 6; i++) {
      vi.setSystemTime(1_000_000 + i * 33);
      game.frame([pistolHand('Right', false, 0.5, 0.5)], W, H);
    }
    const settled = game.getState().aims[0]!.aim!.cursor.x;

    vi.setSystemTime(1_000_000 + 6 * 33);
    game.frame([pistolHand('Right', false, 0.6, 0.5)], W, H); // 100px jump
    const jumped = game.getState().aims[0]!.aim!.cursor.x;

    // Raw would move the full 100px; smoothing must absorb a real share of it.
    expect(Math.abs(jumped - settled)).toBeLessThan(100);
    expect(Math.abs(jumped - settled)).toBeGreaterThan(0);
  });

  it('expires targets that are never shot', () => {
    const game = makeController();
    game.start();
    game.frame([], W, H);
    expect(game.getState().targets).toHaveLength(1);

    vi.setSystemTime(1_000_000 + 5000); // past the 4.2s lifetime
    game.frame([], W, H);
    expect(game.getState().targets.some((t) => t.id === 1)).toBe(false);
  });

  it('stop() clears the world and halts scoring', () => {
    const game = makeController();
    game.start();
    game.frame([pistolHand('Right', false)], W, H);
    game.stop();

    expect(game.getState().running).toBe(false);
    expect(game.getState().targets).toHaveLength(0);

    vi.setSystemTime(1_000_000 + 400);
    game.frame([pistolHand('Right', true)], W, H);
    expect(game.getState().shots).toBe(0);
  });

  it('dispatches sound events on spawn, shoot, hit, miss, and expire', () => {
    const sounds: string[] = [];
    const game = new ShootingGameController(
      () => {},
      () => Date.now(),
      () => 0.5,
      (sound) => sounds.push(sound),
    );

    game.start();
    game.tick(1_000_000, W, H); // spawns target 1
    expect(sounds).toContain('spawn');

    // Hit shot
    sounds.length = 0;
    game.input([pistolHand('Right', false)], W, H, 1_000_000);
    game.input([pistolHand('Right', true)], W, H, 1_000_200);
    game.input([pistolHand('Right', true)], W, H, 1_000_400);
    expect(sounds).toEqual(['shoot', 'hit']);

    // Spawn target 2 and let it expire
    sounds.length = 0;
    game.tick(1_000_000 + 1000, W, H);
    expect(sounds).toContain('spawn');

    sounds.length = 0;
    game.tick(1_000_000 + 6000, W, H);
    expect(sounds).toContain('expire');
  });

  it('runs simulation tick and gesture input independently', () => {
    const game = makeController();
    game.start();

    // Tick advances simulation without camera input
    game.tick(1_000_000, W, H);
    expect(game.getState().targets).toHaveLength(1);

    // Input processes shot without advancing simulation time
    game.input([pistolHand('Right', false)], W, H, 1_000_000);
    game.input([pistolHand('Right', true)], W, H, 1_000_200);
    game.input([pistolHand('Right', true)], W, H, 1_000_400);

    expect(game.getState().hits).toBe(1);
    expect(game.getState().score).toBe(100);
  });
});

