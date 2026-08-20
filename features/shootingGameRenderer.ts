import type { SpriteAtlas } from '../lib/spriteSheet';
import type { ShootingGameState } from './shootingGame';

const TRACER_LIFETIME_MS = 140;

/**
 * Draws the game world onto its own stacked canvas. Kept apart from
 * {@link ShootingGameController} so the game's state machine stays DOM-free
 * and unit-testable while this handles only pixels.
 *
 * Rendered on an un-mirrored canvas (`transform: none`) with coordinates
 * mapped via `mirrorX()`, so text, sprites, and asymmetrical shapes render correctly.
 */
export function renderShootingGame(
  ctx: CanvasRenderingContext2D,
  state: ShootingGameState,
  now: number,
  atlas?: SpriteAtlas | null,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!state.running) return;

  for (const target of state.targets) {
    // Shrinks as its lifetime runs out, so "about to expire" is readable at a glance.
    const remaining = Math.max(0, target.expiresAt - now);
    const total = target.expiresAt - target.bornAt;
    const life = total > 0 ? remaining / total : 0;
    const radius = target.radius * (0.55 + 0.45 * life);

    ctx.save();
    ctx.translate(target.center.x, target.center.y);

    const spriteDrawn = atlas?.draw(ctx, 'target', -radius, -radius, radius * 2, radius * 2) ?? false;
    if (!spriteDrawn) {
      ctx.strokeStyle = life < 0.25 ? '#ef5350' : '#fdd835';
      ctx.fillStyle = 'rgba(253, 216, 53, 0.14)';
      ctx.lineWidth = 3;
      for (const scale of [1, 0.62, 0.24]) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * scale, 0, Math.PI * 2);
        if (scale === 1) ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  for (const tracer of state.tracers) {
    const age = (now - tracer.firedAt) / TRACER_LIFETIME_MS;
    if (age >= 1) continue;

    ctx.save();
    ctx.globalAlpha = 1 - age;
    ctx.strokeStyle = tracer.hit ? '#66bb6a' : '#ffffff';
    ctx.lineWidth = tracer.hit ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(tracer.from.x, tracer.from.y);
    ctx.lineTo(tracer.to.x, tracer.to.y);
    ctx.stroke();

    if (tracer.hit) {
      ctx.beginPath();
      ctx.arc(tracer.to.x, tracer.to.y, 10 + age * 30, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const aim of state.aims) {
    if (!aim.armed || !aim.aim) continue;
    // The crosshair sits ON the fingertip — no projection, so it cannot drift
    // away from the hand or amplify jitter.
    const crosshair = aim.aim.cursor;

    ctx.save();
    ctx.strokeStyle = 'rgba(102, 187, 106, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(crosshair.x, crosshair.y, 14, 0, Math.PI * 2);
    ctx.moveTo(crosshair.x - 22, crosshair.y);
    ctx.lineTo(crosshair.x - 6, crosshair.y);
    ctx.moveTo(crosshair.x + 6, crosshair.y);
    ctx.lineTo(crosshair.x + 22, crosshair.y);
    ctx.moveTo(crosshair.x, crosshair.y - 22);
    ctx.lineTo(crosshair.x, crosshair.y - 6);
    ctx.moveTo(crosshair.x, crosshair.y + 6);
    ctx.lineTo(crosshair.x, crosshair.y + 22);
    ctx.stroke();

    ctx.globalAlpha = 0.35;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.moveTo(aim.aim.muzzle.x, aim.aim.muzzle.y);
    ctx.lineTo(crosshair.x, crosshair.y);
    ctx.stroke();
    ctx.restore();
  }
}
