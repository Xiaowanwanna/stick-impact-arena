import type { Vec2, HitBox, Particle } from './types';

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function rectsOverlap(a: HitBox, b: HitBox): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function spawnSparks(
  x: number, y: number, count: number, color: string, arr: Particle[],
): void {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(200, 700);
    arr.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(0.15, 0.5),
      maxLife: 0.5,
      radius: rand(1.5, 4),
      color,
      type: 'spark',
    });
  }
}

export function spawnSlashArc(
  x: number, y: number, facing: number, color: string, arr: Particle[],
): void {
  for (let i = 0; i < 18; i++) {
    const angle = -Math.PI / 2 + (Math.PI * i) / 18 + (facing > 0 ? 0 : Math.PI);
    const speed = rand(300, 600);
    arr.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(0.1, 0.3),
      maxLife: 0.3,
      radius: rand(2, 5),
      color,
      type: 'slash',
    });
  }
}

export function spawnShockwave(
  x: number, y: number, color: string, arr: Particle[],
): void {
  arr.push({
    x, y,
    vx: 0, vy: 0,
    life: 0.4,
    maxLife: 0.4,
    radius: 20,
    color,
    type: 'shockwave',
  });
}

export function spawnFloatingText(
  x: number, y: number, text: string, color: string, arr: Particle[],
): void {
  arr.push({
    x, y,
    vx: rand(-50, 50),
    vy: -rand(150, 350),
    life: 0.8,
    maxLife: 0.8,
    radius: 0,
    color,
    type: 'text',
    text,
    fontSize: 22,
  });
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t - 1) * (2 * Math.PI) / 0.3) + 1;
}
