import type { FighterData, FighterConfig } from './types';
import { GROUND_Y, GRAVITY, STAGE_LEFT, STAGE_RIGHT } from './types';
import { ATTACKS } from './Combat';
import { clamp } from './utils';

export function createFighter(cfg: FighterConfig): FighterData {
  const x = cfg.side === 'left' ? 300 : 980;
  return {
    x, y: GROUND_Y,
    vx: 0, vy: 0,
    hp: cfg.maxHp,
    energy: 0,
    state: 'idle',
    facing: cfg.side === 'left' ? 1 : -1,
    stateTimer: 0,
    attack: null,
    combo: 0,
    blockTimer: 0,
    dashTimer: 0,
    dashCooldownTimer: 0,
    onGround: true,
    stunTimer: 0,
    parryWindow: 0,
    justParried: false,
    invincibleTimer: 0,
    animPhase: 0,
  };
}

export const PLAYER_CFG: FighterConfig = {
  side: 'left', name: '玩家', accent: '#00e5ff', accentGlow: '#00b8d4',
  maxHp: 100, maxEnergy: 100, walkSpeed: 550, jumpForce: -880, dashSpeed: 1100,
  dashDuration: 0.12, dashCooldown: 0.35,
};

export const ENEMY_CFG: FighterConfig = {
  side: 'right', name: '暗影', accent: '#ff3d2e', accentGlow: '#c62828',
  maxHp: 100, maxEnergy: 100, walkSpeed: 420, jumpForce: -780, dashSpeed: 900,
  dashDuration: 0.12, dashCooldown: 0.5,
};

export function startAttack(fighter: FighterData, attackKey: string): boolean {
  const def = ATTACKS[attackKey];
  if (!def) return false;
  if (fighter.energy < def.energyCost) return false;
  if (fighter.state === 'hitStun' || fighter.state === 'knockedDown') return false;
  if (fighter.attack) return false;

  fighter.energy -= def.energyCost;
  fighter.attack = {
    def,
    timer: 0,
    phase: 'startup',
    hitThisUse: false,
    chainHits: def.chain ? new Array(def.chain.length).fill(false) : [],
  };
  fighter.state = 'attacking';
  fighter.vx = 0;
  return true;
}

export function updateFighter(
  fighter: FighterData, cfg: FighterConfig, opponent: FighterData, dt: number,
): void {
  // Auto-face opponent
  if (
    fighter.state === 'idle' || fighter.state === 'walking' ||
    fighter.state === 'blocking' || fighter.state === 'crouching'
  ) {
    fighter.facing = fighter.x < opponent.x ? 1 : -1;
  }

  // Timers
  fighter.stateTimer += dt;
  fighter.animPhase += dt;
  if (fighter.stunTimer > 0) fighter.stunTimer -= dt;
  if (fighter.blockTimer > 0) fighter.blockTimer -= dt;
  if (fighter.dashCooldownTimer > 0) fighter.dashCooldownTimer -= dt;
  if (fighter.invincibleTimer > 0) fighter.invincibleTimer -= dt;
  if (fighter.parryWindow > 0) fighter.parryWindow -= dt;
  if (fighter.justParried) fighter.justParried = false;

  // State-specific updates
  switch (fighter.state) {
    case 'hitStun':
      if (fighter.stunTimer <= 0) {
        if (fighter.hp <= 0) {
          fighter.state = 'knockedDown';
          fighter.stunTimer = 1.5;
          fighter.vy = -200;
          fighter.vx = (fighter.x < opponent.x ? -1 : 1) * 300;
        } else {
          fighter.state = 'idle';
        }
      }
      break;

    case 'knockedDown':
      if (fighter.stunTimer <= 0 && fighter.onGround) {
        if (fighter.hp <= 0) {
          fighter.state = 'defeat';
        } else {
          fighter.state = 'idle';
          fighter.invincibleTimer = 0.5;
        }
      }
      break;

    case 'blocking':
      fighter.parryWindow = 0.15;
      if (fighter.blockTimer <= 0) {
        fighter.state = 'idle';
      }
      break;

    case 'dashing':
      fighter.dashTimer -= dt;
      fighter.vx = fighter.facing * cfg.dashSpeed;
      if (fighter.dashTimer <= 0) {
        fighter.state = 'idle';
        fighter.dashCooldownTimer = cfg.dashCooldown;
      }
      break;
  }

  // Attack state machine
  if (fighter.attack) {
    fighter.attack.timer += dt;
    const def = fighter.attack.def;
    if (fighter.attack.phase === 'startup' && fighter.attack.timer >= def.startup) {
      fighter.attack.phase = 'active';
    }
    if (fighter.attack.phase === 'active' && fighter.attack.timer >= def.startup + def.active) {
      fighter.attack.phase = 'recovery';
    }
    if (fighter.attack.phase === 'recovery' && fighter.attack.timer >= def.startup + def.active + def.recovery) {
      fighter.attack = null;
      fighter.state = 'idle';
    }
  }

  // Apply physics
  fighter.vy += GRAVITY * dt;
  fighter.x += fighter.vx * dt;
  fighter.y += fighter.vy * dt;

  // Ground collision
  if (fighter.y >= GROUND_Y) {
    fighter.y = GROUND_Y;
    fighter.vy = 0;
    fighter.onGround = true;
  } else {
    fighter.onGround = false;
  }

  // Wall bounds
  fighter.x = clamp(fighter.x, STAGE_LEFT, STAGE_RIGHT);

  // Friction — tight stop for responsive feel
  if (fighter.onGround && fighter.state !== 'dashing') {
    fighter.vx *= 0.75;
  }
}
