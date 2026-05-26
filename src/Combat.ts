import type { AttackDef, FighterData, GameState } from './types';
import {
  spawnSparks, spawnSlashArc, spawnShockwave, spawnFloatingText, rand,
} from './utils';

// ── Attack definitions ──

const SLASH_COLOR = '#00e5ff';
const SLASH_COLOR_E = '#ff3d2e';

export const ATTACKS: Record<string, AttackDef> = {
  lightPunch: {
    // Fast jab — low damage, quick recovery, can chain into itself
    name: '轻拳',
    startup: 0.04,
    active: 0.06,
    recovery: 0.08,
    damage: 5,
    knockbackX: 100,
    knockbackY: -30,
    hitStun: 0.15,
    blockStun: 0.10,
    energyCost: 0,
    energyGain: 8,
    screenShake: 1,
    hitFreeze: 0.02,
    slowMo: 0,
    hitboxes: [{ x: 45, y: -30, w: 45, h: 35, knockbackX: 100, knockbackY: -30, damage: 5, hitStun: 0.15, energyGain: 8, screenShake: 1, hitFreeze: 0.02, blockStun: 0.10, slowMo: 0 }],
  },
  heavyPunch: {
    // Weighty but not sluggish — strong knockback
    name: '重拳',
    startup: 0.10,
    active: 0.08,
    recovery: 0.14,
    damage: 10,
    knockbackX: 220,
    knockbackY: -80,
    hitStun: 0.22,
    blockStun: 0.16,
    energyCost: 0,
    energyGain: 14,
    screenShake: 5,
    hitFreeze: 0.05,
    slowMo: 0,
    hitboxes: [{ x: 50, y: -35, w: 50, h: 40, knockbackX: 220, knockbackY: -80, damage: 10, hitStun: 0.22, energyGain: 14, screenShake: 5, hitFreeze: 0.05, blockStun: 0.16, slowMo: 0 }],
  },
  kick: {
    // Mid-range poke
    name: '踢击',
    startup: 0.08,
    active: 0.08,
    recovery: 0.12,
    damage: 7,
    knockbackX: 170,
    knockbackY: -50,
    hitStun: 0.18,
    blockStun: 0.14,
    energyCost: 0,
    energyGain: 10,
    screenShake: 3,
    hitFreeze: 0.03,
    slowMo: 0,
    hitboxes: [{ x: 55, y: -20, w: 55, h: 40, knockbackX: 170, knockbackY: -50, damage: 7, hitStun: 0.18, energyGain: 10, screenShake: 3, hitFreeze: 0.03, blockStun: 0.14, slowMo: 0 }],
  },
  jumpKick: {
    // Aerial — knocks opponent downward
    name: '跳踢',
    startup: 0.04,
    active: 0.12,
    recovery: 0.10,
    damage: 8,
    knockbackX: 180,
    knockbackY: 180,
    hitStun: 0.20,
    blockStun: 0.14,
    energyCost: 0,
    energyGain: 12,
    screenShake: 4,
    hitFreeze: 0.04,
    slowMo: 0,
    hitboxes: [{ x: 40, y: -40, w: 50, h: 50, knockbackX: 180, knockbackY: 180, damage: 8, hitStun: 0.20, energyGain: 12, screenShake: 4, hitFreeze: 0.04, blockStun: 0.14, slowMo: 0 }],
  },
  dashStrike: {
    // Fast lunge — crosses through opponent
    name: '闪击',
    startup: 0.03,
    active: 0.10,
    recovery: 0.12,
    damage: 6,
    knockbackX: 280,
    knockbackY: -20,
    hitStun: 0.18,
    blockStun: 0.12,
    energyCost: 0,
    energyGain: 10,
    screenShake: 4,
    hitFreeze: 0.03,
    slowMo: 0,
    hitboxes: [{ x: 50, y: -25, w: 60, h: 40, knockbackX: 280, knockbackY: -20, damage: 6, hitStun: 0.18, energyGain: 10, screenShake: 4, hitFreeze: 0.03, blockStun: 0.12, slowMo: 0 }],
  },
  uppercut: {
    // Anti-air launcher — pops opponent up for follow-ups
    name: '升龙拳',
    startup: 0.08,
    active: 0.10,
    recovery: 0.16,
    damage: 14,
    knockbackX: 120,
    knockbackY: -420,
    hitStun: 0.28,
    blockStun: 0.20,
    energyCost: 25,
    energyGain: 8,
    screenShake: 7,
    hitFreeze: 0.07,
    slowMo: 0.08,
    hitboxes: [{ x: 30, y: -70, w: 55, h: 75, knockbackX: 120, knockbackY: -420, damage: 14, hitStun: 0.28, energyGain: 8, screenShake: 7, hitFreeze: 0.07, blockStun: 0.20, slowMo: 0.08 }],
  },
  energySlash: {
    // Big horizontal wave — wide hitbox, solid damage
    name: '能量斩',
    startup: 0.12,
    active: 0.16,
    recovery: 0.18,
    damage: 16,
    knockbackX: 300,
    knockbackY: -40,
    hitStun: 0.26,
    blockStun: 0.22,
    energyCost: 40,
    energyGain: 6,
    screenShake: 9,
    hitFreeze: 0.08,
    slowMo: 0.12,
    hitboxes: [{ x: 60, y: -40, w: 100, h: 65, knockbackX: 300, knockbackY: -40, damage: 16, hitStun: 0.26, energyGain: 6, screenShake: 9, hitFreeze: 0.08, blockStun: 0.22, slowMo: 0.12 }],
  },
  ultimate: {
    // 3-hit cinematic combo — ~35 total damage, flashy finish
    name: '终极奥义',
    startup: 0.22,
    active: 0.35,
    recovery: 0.28,
    damage: 35,
    knockbackX: 450,
    knockbackY: -260,
    hitStun: 0.45,
    blockStun: 0.30,
    energyCost: 100,
    energyGain: 0,
    screenShake: 18,
    hitFreeze: 0.12,
    slowMo: 0.25,
    hitboxes: [{ x: 60, y: -50, w: 100, h: 80, knockbackX: 280, knockbackY: -160, damage: 12, hitStun: 0.30, energyGain: 0, screenShake: 10, hitFreeze: 0.06, blockStun: 0.15, slowMo: 0.15 }],
    chain: [
      { delay: 0.10, hitbox: { x: 50, y: -45, w: 85, h: 70, knockbackX: 200, knockbackY: -180, damage: 10, hitStun: 0.25, energyGain: 0, screenShake: 8, hitFreeze: 0.05, blockStun: 0.12, slowMo: 0.12 } },
      { delay: 0.20, hitbox: { x: 70, y: -55, w: 120, h: 90, knockbackX: 450, knockbackY: -260, damage: 13, hitStun: 0.45, energyGain: 0, screenShake: 16, hitFreeze: 0.10, blockStun: 0.25, slowMo: 0.22 } },
    ],
  },
};

// ── Hit detection helpers ──

export function getWorldHitbox(
  fighter: FighterData, box: import('./types').HitBox,
): import('./types').HitBox {
  return {
    x: fighter.x + box.x * fighter.facing,
    y: fighter.y + box.y,
    w: box.w,
    h: box.h,
    knockbackX: box.knockbackX,
    knockbackY: box.knockbackY,
    damage: box.damage,
    hitStun: box.hitStun,
    energyGain: box.energyGain,
    screenShake: box.screenShake,
    hitFreeze: box.hitFreeze,
    blockStun: box.blockStun,
    slowMo: box.slowMo,
  };
}

export function getBodyHitbox(fighter: FighterData): import('./types').HitBox {
  return {
    x: fighter.x - 18,
    y: fighter.y - 65,
    w: 36,
    h: 65,
    knockbackX: 0, knockbackY: 0, damage: 0, hitStun: 0, energyGain: 0,
    screenShake: 0, hitFreeze: 0, blockStun: 0, slowMo: 0,
  };
}

// ── Main hit resolution ──

import { rectsOverlap } from './utils';

export function resolveCombat(state: GameState): void {
  const { player, enemy, particles } = state;
  const actors: { attacker: FighterData; defender: FighterData; side: 'player' | 'enemy' }[] = [
    { attacker: player, defender: enemy, side: 'player' },
    { attacker: enemy, defender: player, side: 'enemy' },
  ];

  for (const { attacker, defender, side } of actors) {
    if (!attacker.attack || attacker.attack.phase !== 'active') continue;

    // Each attack can only deal damage ONCE per use — no per-frame multi-hits
    if (attacker.attack.hitThisUse) continue;

    const def = attacker.attack.def;
    const color = side === 'player' ? SLASH_COLOR : SLASH_COLOR_E;

    // Check all hitboxes
    const allHitboxes = [...def.hitboxes];
    if (def.chain && attacker.attack.chainHits) {
      for (let ci = 0; ci < def.chain.length; ci++) {
        if (!attacker.attack.chainHits[ci] && attacker.attack.timer >= def.chain[ci].delay) {
          allHitboxes.push(def.chain[ci].hitbox);
          attacker.attack.chainHits[ci] = true;
        }
      }
    }

    for (const hb of allHitboxes) {
      const worldHb = getWorldHitbox(attacker, hb);
      const bodyHb = getBodyHitbox(defender);

      if (rectsOverlap(worldHb, bodyHb)) {
        attacker.attack.hitThisUse = true;

        const isBlocking = defender.state === 'blocking' && isFacingOpponent(defender, attacker);

        if (isBlocking) {
          // Block hit
          const pushback = hb.knockbackX * 0.3;
          defender.vx = attacker.facing * pushback;
          defender.stunTimer = hb.blockStun;
          defender.state = 'blocking';
          defender.blockTimer = hb.blockStun;
          defender.hp -= Math.floor(hb.damage * 0.15);
          spawnSparks(
            defender.x + attacker.facing * 25, defender.y - 40,
            8, '#ffffff', particles,
          );
          spawnFloatingText(
            defender.x, defender.y - 60,
            '防御', '#aaaaaa', particles,
          );

          // Parry check
          if (defender.blockTimer < 0.1 && defender.parryWindow > 0) {
            defender.justParried = true;
            defender.parryWindow = 0;
            attacker.stunTimer = 0.25;
            attacker.attack = null;
            attacker.state = 'hitStun';
            defender.energy = Math.min(defender.energy + 20, 100);
            spawnShockwave(defender.x, defender.y - 40, '#ffffff', particles);
            spawnFloatingText(defender.x, defender.y - 70, '完美格挡!', '#ffdd00', particles);
          }
        } else {
          // Hit!
          const damage = hb.damage;
          defender.hp -= damage;
          defender.stunTimer = hb.hitStun;
          defender.state = 'hitStun';
          defender.vx = attacker.facing * hb.knockbackX;
          defender.vy = hb.knockbackY;
          defender.attack = null;

          // Attacker gains energy
          attacker.energy = Math.min(attacker.energy + hb.energyGain, 100);

          // Effects
          const hitX = defender.x;
          const hitY = defender.y - 45;
          spawnSparks(hitX, hitY, 15, color, particles);
          spawnSlashArc(hitX, hitY, attacker.facing, color, particles);
          if (hb.screenShake >= 6) {
            spawnShockwave(hitX, hitY - 10, color, particles);
          }
          spawnFloatingText(hitX + rand(-20, 20), hitY - 10, `${damage}`, color, particles);

          // Screen shake & hit freeze
          if (hb.screenShake > state.screenShake.intensity) {
            state.screenShake.intensity = hb.screenShake;
            state.screenShake.duration = 0.2;
            state.screenShake.timer = 0.2;
          }
          if (hb.hitFreeze > 0) {
            state.hitFreeze.duration = hb.hitFreeze;
            state.hitFreeze.timer = hb.hitFreeze;
          }
          if (hb.slowMo > 0) {
            state.slowMo.factor = 0.3;
            state.slowMo.duration = hb.slowMo;
            state.slowMo.timer = hb.slowMo;
          }

          // Combo
          state.combo++;
          if (state.combo >= 3) {
            spawnFloatingText(
              defender.x, defender.y - 85,
              `${state.combo} 连击!`,
              state.combo >= 10 ? '#ff4081' : '#ffab00',
              particles,
            );
          }
        }
        break; // One hit per active frame per attacker
      }
    }
  }
}

function isFacingOpponent(self: FighterData, opponent: FighterData): boolean {
  return (self.facing === 1 && self.x < opponent.x) || (self.facing === -1 && self.x > opponent.x);
}
