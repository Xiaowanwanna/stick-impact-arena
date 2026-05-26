import type { FighterData } from './types';
import { ENEMY_CFG, startAttack } from './Fighter';

interface AIState {
  action: 'pursue' | 'attack' | 'retreat' | 'block' | 'special' | 'ultimate' | 'idle';
  timer: number;
  reactionDelay: number;
  decisionCooldown: number;
}

export function createAI(): AIState {
  return {
    action: 'idle',
    timer: 0,
    reactionDelay: 0,
    decisionCooldown: 0,
  };
}

export function updateAI(
  ai: AIState, enemy: FighterData, player: FighterData, dt: number,
): { input: Partial<Record<string, boolean>> } {
  ai.timer += dt;
  ai.decisionCooldown -= dt;

  const dx = player.x - enemy.x;
  const dist = Math.abs(dx);
  const dir = dx > 0 ? 'right' : 'left';

  if (ai.reactionDelay > 0) {
    ai.reactionDelay -= dt;
  }

  const input: Partial<Record<string, boolean>> = {};

  if (ai.decisionCooldown > 0 || enemy.state === 'hitStun' || enemy.state === 'knockedDown') {
    return { input };
  }

  if (ai.timer > 0.15 + Math.random() * 0.2) {
    ai.timer = 0;
    const r = Math.random();

    if (dist > 300) {
      ai.action = 'pursue';
    } else if (dist < 70) {
      // Up close: fight or back off
      if (r < 0.45) ai.action = 'attack';
      else if (r < 0.7) ai.action = 'block';
      else ai.action = 'retreat';
    } else if (dist < 180) {
      // Mid range: mix of aggressive and defensive
      if (r < 0.4) ai.action = 'attack';
      else if (r < 0.65) ai.action = 'pursue';
      else if (r < 0.85) ai.action = 'block';
      else ai.action = 'retreat';
    } else {
      // Far but in range: close distance
      if (r < 0.3) ai.action = 'attack';
      else if (r < 0.8) ai.action = 'pursue';
      else ai.action = 'block';
    }

    // Use specials more aggressively
    if (enemy.energy >= 40 && dist < 250 && Math.random() < 0.5) {
      ai.action = 'special';
    }
    if (enemy.energy >= 100 && dist < 250 && Math.random() < 0.35) {
      ai.action = 'ultimate';
    }

    ai.reactionDelay = 0.03 + Math.random() * 0.1;
  }

  if (ai.reactionDelay > 0) return { input };

  switch (ai.action) {
    case 'pursue':
      if (dir === 'right') input['d'] = true;
      else input['a'] = true;
      break;

    case 'retreat':
      if (dir === 'right') input['a'] = true;
      else input['d'] = true;
      break;

    case 'block':
      input[' '] = true;
      break;

    case 'attack': {
      const attacks = ['j', 'j', 'k', 'l'];
      const atk = attacks[Math.floor(Math.random() * attacks.length)];
      input[atk] = true;
      break;
    }

    case 'special':
      input['i'] = true;
      break;

    case 'ultimate':
      input['o'] = true;
      break;
  }

  return { input };
}

export function applyAIInput(
  enemy: FighterData, input: Partial<Record<string, boolean>>,
): void {
  if (enemy.state === 'hitStun' || enemy.state === 'knockedDown' || enemy.state === 'attacking') return;
  if (enemy.blockTimer > 0) return;

  if (input[' ']) {
    enemy.state = 'blocking';
    enemy.blockTimer = 0.1;
    enemy.parryWindow = 0.15;
    enemy.vx = 0;
    return;
  }

  if (input['a']) enemy.vx = -ENEMY_CFG.walkSpeed * 0.85;
  else if (input['d']) enemy.vx = ENEMY_CFG.walkSpeed * 0.85;
  else if (enemy.state === 'walking') enemy.state = 'idle';

  if ((input['a'] || input['d']) && enemy.state === 'idle') {
    enemy.state = 'walking';
  }

  if (input['j']) startAttack(enemy, 'lightPunch');
  else if (input['k']) startAttack(enemy, 'heavyPunch');
  else if (input['l']) startAttack(enemy, 'kick');
  else if (input['i']) startAttack(enemy, 'energySlash');
  else if (input['o']) startAttack(enemy, 'ultimate');
}
