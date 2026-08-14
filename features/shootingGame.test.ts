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
 * A pistol hand aiming straight right along y=0.5, with the thumb either
 * raised (hammer up) or dropped onto the knuckle (trigger pulled).
 */
function pistolHand(handedness: Handedness, thumbDropped: boolean, aimY = 0.5): HandObservation {
  // Kept to the left of centre so the muzzle (fingertip, x=0.2 -> 200px) sits
  // in FRONT of a centre-spawned target at 500px when aiming +x.
  const landmarks: NormalizedLandmark[] = [];
  landmarks[LM.WRIST] = lm(0, aimY);
  landmarks[LM.MIDDLE_MCP] = lm(0.1, aimY); // handSize = 0.1
  landmarks[LM.INDEX_MCP] = lm(0.08, aimY);
  landmarks[LM.INDEX_PIP] = lm(0.12, aimY);
  landmarks[LM.INDEX_TIP] = lm(0.2, aimY); // extended, pointing +x
  for (const [pip, tip] of [
    [LM.MIDDLE_PIP, LM.MIDDLE_TIP],
    [LM.RING_PIP, LM.RING_TIP],
    [LM.PINKY_PIP, LM.PINKY_TIP],
  ]) {
    landmarks[pip!] = lm(0.09, aimY);
    landmarks[tip!] = lm(0.085, aimY); // curled: tip nearer the wrist than the pip
  }
  landmarks[LM.THUMB_TIP] = thumbDropped ? lm(0.09, aimY) : lm(0.2, aimY);

  return { handedness, handednessScore: 1, pointer: { x: 0, y: 0 }, gestures: {}, gestureDistances: {}, landmarks };
}

function openHand(handedness: Handedness): HandObservation {
  const hand = pistolHand(handedness, true);
  for (const tip of [LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP]) {
    hand.landmarks[tip] = lm(0.2, 0.5); // everything extended → not a pistol
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
    game.frame([pistolHand('Right', false, 0.5)], W, H);

    // Aim along y=0.9; the target sits at y=500, far off that line.
    vi.setSystemTime(1_000_000 + 200);
    game.frame([pistolHand('Right', true, 0.9)], W, H);
    vi.setSystemTime(1_000_000 + 400);
    game.frame([pistolHand('Right', true, 0.9)], W, H);

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
    expect(aim?.ray?.direction.x).toBeCloseTo(1); // pointing +x
    expect(aim?.ray?.origin.x).toBeCloseTo(200); // fingertip at 0.2 * 1000
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
});
