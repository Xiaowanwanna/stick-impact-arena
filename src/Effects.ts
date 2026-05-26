import type { GameState, Particle } from './types';
import { rand } from './utils';

export function tickTimers(state: GameState, realDt: number): void {
  if (state.screenShake.timer > 0) state.screenShake.timer -= realDt;
  if (state.hitFreeze.timer > 0) state.hitFreeze.timer -= realDt;
  if (state.slowMo.timer > 0) {
    state.slowMo.timer -= realDt;
  } else {
    state.slowMo.factor = 1;
  }
  if (state.announcementTimer > 0) state.announcementTimer -= realDt;
}

export function updateEffects(state: GameState, dt: number): void {
  // Update particles (follow game time for visual sync with freeze)
  state.particles = state.particles.filter((p) => {
    p.life -= dt;
    return p.life > 0;
  });

  for (const p of state.particles) {
    switch (p.type) {
      case 'spark':
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 400 * dt;
        p.radius *= 0.98;
        break;
      case 'slash':
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        break;
      case 'shockwave':
        p.radius += 600 * dt;
        break;
      case 'text':
        p.y += p.vy * dt;
        p.x += p.vx * dt;
        p.vy *= 0.98;
        break;
      case 'trail':
        p.radius *= 0.95;
        break;
    }
  }
}

export function spawnTrail(
  x: number, y: number, color: string, particles: Particle[],
): void {
  particles.push({
    x: x + rand(-3, 3),
    y: y + rand(-3, 3),
    vx: 0, vy: 0,
    life: 0.15,
    maxLife: 0.15,
    radius: rand(4, 8),
    color,
    type: 'trail',
  });
}

export function announce(msg: string, state: GameState): void {
  state.announcement = msg;
  state.announcementTimer = 1.5;
}
