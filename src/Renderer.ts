import type { GameState } from './types';
import { CANVAS_W, CANVAS_H, GROUND_Y } from './types';
import { PLAYER_CFG, ENEMY_CFG } from './Fighter';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private shakeX = 0;
  private shakeY = 0;
  private bgParticles: { x: number; y: number; r: number; speed: number }[] = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    for (let i = 0; i < 40; i++) {
      this.bgParticles.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        r: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 20 + 5,
      });
    }
  }

  render(state: GameState, dt: number): void {
    const ctx = this.ctx;

    // Compute screen shake
    if (state.screenShake.timer > 0) {
      const i = state.screenShake.intensity * (state.screenShake.timer / state.screenShake.duration);
      this.shakeX = (Math.random() - 0.5) * i * 2;
      this.shakeY = (Math.random() - 0.5) * i * 2;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    this.drawBackground(state, dt);
    this.drawArenaFloor();
    this.drawFighter(state.enemy, ENEMY_CFG, state.player);
    this.drawFighter(state.player, PLAYER_CFG, state.enemy);
    this.drawParticles(state);

    ctx.restore();

    // UI is not affected by screen shake
    this.drawHUD(state);
    this.drawAnnouncement(state);

    // Ultimate screen darkening
    if (state.player.attack?.def.name === '终极奥义' && state.player.attack.phase === 'active') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
    if (state.enemy.attack?.def.name === '终极奥义' && state.enemy.attack.phase === 'active') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }

  private drawBackground(state: GameState, dt: number): void {
    const ctx = this.ctx;

    // Dark gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#0a0a14');
    grad.addColorStop(0.5, '#111122');
    grad.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Animated grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const offset = (state.bgOffset % 60);
    for (let x = offset; x < CANVAS_W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GROUND_Y);
      ctx.stroke();
    }
    for (let y = offset; y < GROUND_Y; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_W, y);
      ctx.stroke();
    }

    // Floating background particles
    for (const p of this.bgParticles) {
      p.y -= p.speed * dt;
      if (p.y < 0) { p.y = CANVAS_H; p.x = Math.random() * CANVAS_W; }
      ctx.fillStyle = 'rgba(150,150,200,0.15)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawArenaFloor(): void {
    const ctx = this.ctx;

    // Glowing line
    const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 4);
    floorGrad.addColorStop(0, 'rgba(0,229,255,0.4)');
    floorGrad.addColorStop(0.5, 'rgba(0,229,255,0.15)');
    floorGrad.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 4);

    // Floor reflection
    const reflGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
    reflGrad.addColorStop(0, 'rgba(10,10,20,0.5)');
    reflGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = reflGrad;
    ctx.fillRect(0, GROUND_Y + 4, CANVAS_W, CANVAS_H - GROUND_Y - 4);
  }

  private drawFighter(f: import('./types').FighterData, cfg: import('./types').FighterConfig, _opponent: import('./types').FighterData): void {
    const ctx = this.ctx;
    if (f.hp <= 0 && f.state === 'knockedDown') return;

    const x = f.x;
    const y = f.y;
    const facing = f.facing;

    if (f.invincibleTimer > 0 && Math.floor(f.invincibleTimer * 20) % 2 === 0) return;

    ctx.save();
    ctx.translate(x, y);

    const bob = (f.state === 'idle') ? Math.sin(f.animPhase * 3) * 1.5 : 0;
    const crouchOffset = f.state === 'crouching' ? 15 : 0;
    const atkName = f.attack?.def.name ?? '';
    const phase = f.attack?.phase ?? '';
    const atkTimer = f.attack?.timer ?? 0;
    const atkDef = f.attack?.def;

    // Glow aura while attacking
    if (phase === 'active') {
      ctx.shadowColor = cfg.accentGlow;
      ctx.shadowBlur = 20;
    }

    const color = cfg.accent;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const headY = -70 + bob - crouchOffset;
    const neckY = headY + 14;
    const bodyY = neckY + 35;
    const shoulderY = neckY + 8;

    // Compute pose based on attack type and phase
    const pose = this.computePose(atkName, phase, atkTimer, atkDef, facing);

    // Apply body lean
    const leanX = pose.bodyLean * facing;
    const bodyTopX = leanX * 0.3;
    const bodyBotX = leanX;

    // Head
    ctx.beginPath();
    ctx.arc(leanX * 0.25, headY, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Body (may lean)
    ctx.beginPath();
    ctx.moveTo(bodyTopX, neckY);
    ctx.lineTo(bodyBotX, bodyY);
    ctx.stroke();

    // ── Arms ──
    // Back arm
    const backArm = pose.backArm;
    ctx.beginPath();
    ctx.moveTo(bodyTopX, shoulderY);
    ctx.lineTo(bodyTopX + backArm.x * facing, shoulderY + backArm.y);
    ctx.stroke();

    // Front arm
    const frontArm = pose.frontArm;
    const fistX = bodyTopX + frontArm.x * facing;
    const fistY = shoulderY + frontArm.y;
    ctx.beginPath();
    ctx.moveTo(bodyTopX, shoulderY);
    ctx.lineTo(fistX, fistY);
    ctx.stroke();

    // Fist glow during active phase
    if (phase === 'active' && atkName !== '踢击' && atkName !== '跳踢') {
      ctx.fillStyle = cfg.accentGlow;
      ctx.shadowColor = cfg.accent;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(fistX, fistY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = phase === 'active' ? 20 : 0;
    }

    // ── Legs ──
    const backLeg = pose.backLeg;
    const frontLeg = pose.frontLeg;
    ctx.beginPath();
    ctx.moveTo(bodyBotX, bodyY);
    ctx.lineTo(bodyBotX + backLeg.x * facing, bodyY + backLeg.y + crouchOffset);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bodyBotX, bodyY);
    ctx.lineTo(bodyBotX + frontLeg.x * facing, bodyY + frontLeg.y + crouchOffset);
    ctx.stroke();

    // Foot glow for kicks
    if (phase === 'active' && (atkName === '踢击' || atkName === '跳踢')) {
      const footX = bodyBotX + frontLeg.x * facing;
      const footY = bodyY + frontLeg.y + crouchOffset;
      ctx.fillStyle = cfg.accentGlow;
      ctx.shadowColor = cfg.accent;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(footX, footY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = phase === 'active' ? 20 : 0;
    }

    // Special effects per attack type
    this.drawAttackEffects(atkName, phase, fistX, fistY, facing, cfg, leanX, bodyY);

    // Crouch indicator
    if (f.state === 'crouching') {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 10, 28, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    // Block indicator
    if (f.state === 'blocking') {
      ctx.strokeStyle = 'rgba(200,200,255,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -30, 28, 0, Math.PI * 2);
      ctx.stroke();
      if (f.justParried) {
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffdd00';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, -30, 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // Ultimate energy aura
    if (atkName === '终极奥义' && phase !== '') {
      const auraAlpha = phase === 'startup' ? 0.2 : 0.4;
      ctx.strokeStyle = `rgba(255,255,255,${auraAlpha})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const r = 25 + i * 12 + Math.sin(f.animPhase * 15 + i) * 6;
        ctx.beginPath();
        ctx.arc(0, -40, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ── Pose computer — each attack gets a unique stickman pose ──
  private computePose(
    atkName: string, phase: string, timer: number,
    def: import('./types').AttackDef | undefined, _facing: number,
  ): {
    bodyLean: number;
    frontArm: { x: number; y: number };
    backArm: { x: number; y: number };
    frontLeg: { x: number; y: number };
    backLeg: { x: number; y: number };
  } {
    const armLen = 22;
    const legLen = 28;
    const idle = { bodyLean: 0, frontArm: { x: 8, y: armLen * 0.7 }, backArm: { x: -8, y: armLen * 0.7 }, frontLeg: { x: 6, y: legLen }, backLeg: { x: -6, y: legLen } };
    if (!def || !phase) return idle;

    const dur = def.startup + def.active + def.recovery;
    const progress = Math.min(1, timer / dur);
    const t = progress; // 0→1 over whole attack

    switch (atkName) {
      case '轻拳': {
        // Quick forward jab — arm snaps horizontally, body barely leans
        if (phase === 'startup') {
          // Pull fist back slightly
          const s = t / (def.startup / dur);
          return { bodyLean: -3 * s, frontArm: { x: -5 + s * 2, y: armLen * 0.4 }, backArm: { x: -6, y: armLen * 0.5 }, frontLeg: { x: 6, y: legLen }, backLeg: { x: -6, y: legLen } };
        } else if (phase === 'active') {
          // Snap forward
          return { bodyLean: 5, frontArm: { x: 32, y: -4 }, backArm: { x: -10, y: armLen * 0.3 }, frontLeg: { x: 8, y: legLen }, backLeg: { x: -4, y: legLen } };
        } else {
          const r = 1 - t / ((def.startup + def.active + def.recovery) / dur);
          return { bodyLean: 5 * r, frontArm: { x: 8 + 24 * r, y: -4 * r + armLen * 0.7 * (1 - r) }, backArm: { x: -8 + (1 - r) * 2, y: armLen * 0.5 }, frontLeg: { x: 6, y: legLen }, backLeg: { x: -6, y: legLen } };
        }
      }

      case '重拳': {
        // Big cross punch — body twists, arm swings wide from behind
        if (phase === 'startup') {
          const s = t / (def.startup / dur);
          return { bodyLean: -8 * s, frontArm: { x: -15 * s, y: -10 * s }, backArm: { x: -18 * s, y: -5 * s }, frontLeg: { x: 8, y: legLen }, backLeg: { x: -2, y: legLen } };
        } else if (phase === 'active') {
          return { bodyLean: 12, frontArm: { x: 40, y: -6 }, backArm: { x: -15, y: -8 }, frontLeg: { x: 10, y: legLen }, backLeg: { x: -2, y: legLen } };
        } else {
          const r = 1 - (t - (def.startup + def.active) / dur) / (def.recovery / dur);
          return { bodyLean: 12 * r, frontArm: { x: 12 + 28 * r, y: 4 * r - 6 * (1 - r) }, backArm: { x: -8, y: armLen * 0.3 }, frontLeg: { x: 6, y: legLen }, backLeg: { x: -6, y: legLen } };
        }
      }

      case '踢击': {
        // Front kick — leg extends, body leans back, arms out for balance
        if (phase === 'startup') {
          const s = t / (def.startup / dur);
          return { bodyLean: -3 * s, frontArm: { x: 6 * (1 - s), y: armLen * 0.8 * (1 - s) }, backArm: { x: -8, y: armLen * 0.5 }, frontLeg: { x: 2, y: legLen * 0.6 + legLen * 0.4 * s }, backLeg: { x: -4, y: legLen } };
        } else if (phase === 'active') {
          return { bodyLean: -10, frontArm: { x: -2, y: armLen * 0.3 }, backArm: { x: -12, y: armLen * 0.4 }, frontLeg: { x: 35, y: -8 }, backLeg: { x: -4, y: legLen + 2 } };
        } else {
          const r = 1 - (t - (def.startup + def.active) / dur) / (def.recovery / dur);
          return { bodyLean: -10 * r, frontArm: { x: 6, y: armLen * 0.7 }, backArm: { x: -8, y: armLen * 0.5 }, frontLeg: { x: 6 + 29 * r, y: legLen - 8 * r }, backLeg: { x: -6, y: legLen } };
        }
      }

      case '跳踢': {
        // Aerial kick — both legs forward, body tilted
        return { bodyLean: -14, frontArm: { x: -5, y: armLen * 0.2 }, backArm: { x: -10, y: armLen * 0.3 }, frontLeg: { x: 32, y: -14 }, backLeg: { x: 18, y: -6 } };
      }

      case '闪击': {
        // Dash lunge — body near horizontal, arm spearing forward
        if (phase === 'startup') {
          return { bodyLean: 18, frontArm: { x: 36, y: -10 }, backArm: { x: -5, y: 2 }, frontLeg: { x: 14, y: legLen + 5 }, backLeg: { x: -8, y: legLen - 4 } };
        } else if (phase === 'active') {
          return { bodyLean: 22, frontArm: { x: 44, y: -8 }, backArm: { x: -5, y: 2 }, frontLeg: { x: 18, y: legLen + 5 }, backLeg: { x: -10, y: legLen - 4 } };
        } else {
          return { bodyLean: 8, frontArm: { x: 14, y: 6 }, backArm: { x: -6, y: armLen * 0.5 }, frontLeg: { x: 10, y: legLen }, backLeg: { x: -6, y: legLen } };
        }
      }

      case '升龙拳': {
        // Rising uppercut — crouch low then explode upward
        if (phase === 'startup') {
          const s = t / (def.startup / dur);
          return { bodyLean: 0, frontArm: { x: 2, y: 10 + 8 * s }, backArm: { x: -6, y: 6 }, frontLeg: { x: 8, y: legLen + 8 * s }, backLeg: { x: -6, y: legLen + 8 * s } };
        } else if (phase === 'active') {
          return { bodyLean: -4, frontArm: { x: -2, y: -34 }, backArm: { x: -8, y: -20 }, frontLeg: { x: 4, y: legLen - 6 }, backLeg: { x: -4, y: legLen - 8 } };
        } else {
          return { bodyLean: 0, frontArm: { x: 6, y: armLen * 0.7 }, backArm: { x: -6, y: armLen * 0.5 }, frontLeg: { x: 6, y: legLen }, backLeg: { x: -6, y: legLen } };
        }
      }

      case '能量斩': {
        // Wide two-handed slash — arms rise overhead then sweep down
        if (phase === 'startup') {
          const s = t / (def.startup / dur);
          return { bodyLean: -2, frontArm: { x: -4 * s, y: -armLen * 0.8 * s }, backArm: { x: -8 * s, y: -armLen * 0.9 * s }, frontLeg: { x: 6, y: legLen }, backLeg: { x: -6, y: legLen } };
        } else if (phase === 'active') {
          // Arms sweep from overhead down across the body
          const a = (t - def.startup / dur) / (def.active / dur);
          const sweepAngle = a * Math.PI * 0.8;
          return { bodyLean: 6, frontArm: { x: 10 + 28 * Math.cos(sweepAngle), y: -24 + 20 * Math.sin(sweepAngle) }, backArm: { x: -2 + 28 * Math.cos(sweepAngle + 0.3), y: -20 + 20 * Math.sin(sweepAngle + 0.3) }, frontLeg: { x: 8, y: legLen }, backLeg: { x: -4, y: legLen } };
        } else {
          return { bodyLean: 2, frontArm: { x: 28, y: 10 }, backArm: { x: -8, y: armLen * 0.4 }, frontLeg: { x: 6, y: legLen }, backLeg: { x: -6, y: legLen } };
        }
      }

      case '终极奥义': {
        // Dramatic multi-slash — wild alternating strikes
        if (phase === 'startup') {
          // Power-up pose: arms crossed, body crouching slightly
          const s = t / (def.startup / dur);
          return { bodyLean: -4, frontArm: { x: -(6 + 12 * s), y: -(4 + 10 * s) }, backArm: { x: 4 + 14 * s, y: 2 + 12 * s }, frontLeg: { x: 10, y: legLen + 6 }, backLeg: { x: -8, y: legLen + 6 } };
        } else if (phase === 'active') {
          // Rapid alternating slashes — driven by timer
          const slashPhase = Math.sin(timer * 35);
          const slashPhase2 = Math.cos(timer * 40);
          return { bodyLean: slashPhase * 8, frontArm: { x: 15 + slashPhase * 20, y: -10 + slashPhase * 15 }, backArm: { x: -(5 + slashPhase2 * 18), y: -6 + slashPhase2 * 12 }, frontLeg: { x: 8, y: legLen + 2 }, backLeg: { x: -6, y: legLen - 2 } };
        } else {
          return { bodyLean: 0, frontArm: { x: 8, y: armLen * 0.7 }, backArm: { x: -8, y: armLen * 0.5 }, frontLeg: { x: 6, y: legLen }, backLeg: { x: -6, y: legLen } };
        }
      }

      default:
        // Generic attack pose
        if (phase === 'startup') {
          const s = t / ((def.startup) / dur);
          return { bodyLean: -5 * s, frontArm: { x: -10 * s, y: 5 }, backArm: { x: -8, y: armLen * 0.4 }, frontLeg: { x: 6, y: legLen }, backLeg: { x: -6, y: legLen } };
        } else if (phase === 'active') {
          return { bodyLean: 8, frontArm: { x: 30, y: -2 }, backArm: { x: -10, y: armLen * 0.3 }, frontLeg: { x: 8, y: legLen }, backLeg: { x: -4, y: legLen } };
        } else {
          const r = 1 - (t - (def.startup + def.active) / dur) / (def.recovery / dur);
          return { bodyLean: 8 * r, frontArm: { x: 8 + 22 * r, y: armLen * 0.7 * (1 - r) }, backArm: { x: -8, y: armLen * 0.5 }, frontLeg: { x: 6, y: legLen }, backLeg: { x: -6, y: legLen } };
        }
    }
  }

  // ── Extra visual effects per attack ──
  private drawAttackEffects(
    atkName: string, phase: string,
    fistX: number, fistY: number, _facing: number,
    _cfg: import('./types').FighterConfig, bodyX: number, bodyY: number,
  ): void {
    const ctx = this.ctx;
    if (phase !== 'active') return;

    ctx.save();

    switch (atkName) {
      case '能量斩': {
        // Wide energy arc
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(bodyX, bodyY - 15, 35, -0.8, 1.2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;
      }
      case '升龙拳': {
        // Rising energy trail
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(bodyX, bodyY);
        ctx.lineTo(bodyX + fistX, fistY);
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;
      }
      case '终极奥义': {
        // Energy rings around body
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.ellipse(0, -40, 35 + i * 15, 20 + i * 10, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        break;
      }
    }

    ctx.restore();
  }

  private drawParticles(state: GameState): void {
    const ctx = this.ctx;
    for (const p of state.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();

      switch (p.type) {
        case 'spark':
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'slash':
          ctx.globalAlpha = alpha * 0.6;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 0.05, p.y + p.vy * 0.05);
          ctx.stroke();
          break;

        case 'shockwave': {
          const progress = 1 - alpha;
          ctx.globalAlpha = alpha * 0.5;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3 * (1 - progress);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        case 'text':
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.font = `bold ${p.fontSize || 22}px "Microsoft YaHei", "PingFang SC", sans-serif`;
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 4;
          ctx.fillText(p.text || '', p.x, p.y);
          ctx.shadowBlur = 0;
          // Outline
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.lineWidth = 2;
          ctx.strokeText(p.text || '', p.x, p.y);
          break;

        case 'trail':
          ctx.globalAlpha = alpha * 0.3;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
      ctx.restore();
    }
  }

  private drawHUD(state: GameState): void {
    const ctx = this.ctx;
    const p = state.player;
    const e = state.enemy;

    // Player side (left)
    this.drawHealthBar(30, 30, p.hp, PLAYER_CFG.maxHp, PLAYER_CFG.accent, '玩家', true);
    this.drawEnergyBar(30, 60, p.energy, 100, PLAYER_CFG.accent);

    // Enemy side (right)
    this.drawHealthBar(CANVAS_W - 330, 30, e.hp, ENEMY_CFG.maxHp, ENEMY_CFG.accent, '暗影', false);
    this.drawEnergyBar(CANVAS_W - 330, 60, e.energy, 100, ENEMY_CFG.accent);

    // Combo counter
    if (state.combo >= 2) {
      const comboAlpha = state.combo > 0 ? 1 : 0;
      ctx.save();
      ctx.globalAlpha = comboAlpha;
      ctx.fillStyle = state.combo >= 10 ? '#ff4081' : '#ffab00';
      ctx.font = 'bold 36px "Microsoft YaHei", "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(`${state.combo} COMBO`, CANVAS_W / 2, 120);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Timer
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(state.roundTime).toString(), CANVAS_W / 2, 40);

    // Player wins
    ctx.fillStyle = PLAYER_CFG.accent;
    ctx.font = '16px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i < state.playerWins; i++) {
      ctx.fillText('★', 130 + i * 22, 48);
    }

    // Enemy wins
    ctx.fillStyle = ENEMY_CFG.accent;
    ctx.textAlign = 'right';
    for (let i = 0; i < state.enemyWins; i++) {
      ctx.fillText('★', CANVAS_W - 132 - i * 22, 48);
    }
  }

  private drawHealthBar(
    x: number, y: number, hp: number, maxHp: number, color: string,
    name: string, leftAligned: boolean,
  ): void {
    const ctx = this.ctx;
    const w = 300;
    const h = 16;
    const ratio = Math.max(0, hp / maxHp);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, h);

    // Health bar
    const barGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    barGrad.addColorStop(0, color);
    barGrad.addColorStop(1, ratio < 0.3 ? '#ff0000' : color);
    ctx.fillStyle = barGrad;
    ctx.fillRect(x, y, w * ratio, h);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = leftAligned ? 'left' : 'right';
    ctx.fillText(name, leftAligned ? x : x + w, y - 6);

    // HP text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.max(0, Math.ceil(hp))} / ${maxHp}`, x + w / 2, y + h - 3);
  }

  private drawEnergyBar(x: number, y: number, energy: number, max: number, color: string): void {
    const ctx = this.ctx;
    const w = 300;
    const h = 6;
    const ratio = energy / max;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, w, h);

    const barGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    barGrad.addColorStop(0, color);
    barGrad.addColorStop(1, '#aa80ff');
    ctx.fillStyle = barGrad;
    ctx.fillRect(x, y, w * ratio, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }

  private drawAnnouncement(state: GameState): void {
    if (state.announcementTimer <= 0) return;
    const ctx = this.ctx;
    const alpha = Math.min(1, state.announcementTimer);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText(state.announcement, CANVAS_W / 2, CANVAS_H / 2 - 40);
    ctx.restore();
  }

  drawTitleScreen(): void {
    const ctx = this.ctx;

    // Dark background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Animated grid (static for title)
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GROUND_Y); ctx.stroke();
    }
    for (let y = 0; y < GROUND_Y; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }

    // Floor glow
    ctx.fillStyle = 'rgba(0,229,255,0.15)';
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 3);

    // Title
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 64px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00b8d4';
    ctx.shadowBlur = 30;
    ctx.fillText('STICK IMPACT', CANVAS_W / 2, 220);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ff3d2e';
    ctx.font = 'bold 52px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.shadowColor = '#c62828';
    ctx.shadowBlur = 25;
    ctx.fillText('ARENA', CANVAS_W / 2, 280);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '20px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText('棍之冲击竞技场', CANVAS_W / 2, 320);

    // Decorative stickmen
    const t = performance.now() / 1000;
    this.drawIdleStickman(300, GROUND_Y, '#00e5ff', t);
    this.drawIdleStickman(980, GROUND_Y, '#ff3d2e', t + 0.5);

    // Controls
    const controls = [
      'A/D 移动    W 跳跃    S 蹲防    空格 格挡',
      'J 轻拳    K 重拳    L 踢击',
      'U 闪击    I 能量斩    O 终极奥义',
      'R 重新开始',
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '16px "Microsoft YaHei", "PingFang SC", sans-serif';
    controls.forEach((line, i) => {
      ctx.fillText(line, CANVAS_W / 2, 400 + i * 28);
    });

    // Start prompt
    const pulse = Math.sin(t * 3) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,255,255,${pulse})`;
    ctx.font = 'bold 22px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText('按 ENTER 开始战斗', CANVAS_W / 2, 540);
  }

  private drawIdleStickman(x: number, groundY: number, color: string, phase: number): void {
    const ctx = this.ctx;
    const bob = Math.sin(phase * 3) * 2;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const hY = groundY - 80 + bob;
    ctx.beginPath(); ctx.arc(x, hY, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, hY + 14); ctx.lineTo(x, hY + 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, hY + 22); ctx.lineTo(x - 10, hY + 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, hY + 22); ctx.lineTo(x + 10, hY + 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, hY + 50); ctx.lineTo(x - 8, groundY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, hY + 50); ctx.lineTo(x + 8, groundY); ctx.stroke();
  }

  drawVictoryScreen(state: GameState): void {
    const win = state.player.hp > 0;
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const text = win ? '胜利!' : '败北...';
    const color = win ? '#00e5ff' : '#ff3d2e';
    ctx.fillStyle = color;
    ctx.font = 'bold 72px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2 - 20);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText('按 R 键重新开始', CANVAS_W / 2, CANVAS_H / 2 + 40);
  }
}
