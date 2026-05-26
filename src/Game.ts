import type { GameState } from './types';
import { CANVAS_W, CANVAS_H } from './types';
import { Input } from './Input';
import {
  createFighter, updateFighter, startAttack,
  PLAYER_CFG, ENEMY_CFG,
} from './Fighter';
import { resolveCombat } from './Combat';
import { createAI, updateAI, applyAIInput } from './EnemyAI';
import { updateEffects, tickTimers, spawnTrail, announce } from './Effects';
import { Renderer } from './Renderer';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: Input;
  private renderer: Renderer;
  private state!: GameState;
  private ai = createAI();
  private lastTime = 0;
  private running = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.input = new Input();
    this.renderer = new Renderer(this.ctx);

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.initState();
    this.loop(performance.now());
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = CANVAS_W * dpr;
    this.canvas.height = CANVAS_H * dpr;
    const container = this.canvas.parentElement!;
    const maxW = container.clientWidth;
    const maxH = container.clientHeight;
    const scale = Math.min(maxW / CANVAS_W, maxH / CANVAS_H);
    this.canvas.style.width = (CANVAS_W * scale) + 'px';
    this.canvas.style.height = (CANVAS_H * scale) + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private initState(): void {
    this.state = {
      phase: 'title',
      player: createFighter(PLAYER_CFG),
      enemy: createFighter(ENEMY_CFG),
      combo: 0,
      timer: 0,
      roundTime: 99,
      particles: [],
      screenShake: { intensity: 0, duration: 0, timer: 0 },
      hitFreeze: { duration: 0, timer: 0 },
      slowMo: { factor: 1, duration: 0, timer: 0 },
      playerWins: 0,
      enemyWins: 0,
      bgOffset: 0,
      announcement: '',
      announcementTimer: 0,
      comboGraceTimer: 0,
    };
  }

  private resetRound(): void {
    const pw = this.state.playerWins;
    const ew = this.state.enemyWins;
    this.state.player = createFighter(PLAYER_CFG);
    this.state.enemy = createFighter(ENEMY_CFG);
    this.state.combo = 0;
    this.state.roundTime = 99;
    this.state.particles = [];
    this.state.screenShake = { intensity: 0, duration: 0, timer: 0 };
    this.state.hitFreeze = { duration: 0, timer: 0 };
    this.state.slowMo = { factor: 1, duration: 0, timer: 0 };
    this.state.playerWins = pw;
    this.state.enemyWins = ew;
    this.state.announcement = '';
    this.state.announcementTimer = 0;
    this.state.comboGraceTimer = 0;
    this.state.phase = 'fighting';
    this.ai = createAI();
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);

    let rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Clamp dt
    rawDt = Math.min(rawDt, 0.05);

    // Always tick effect timers with real time so hit-freeze & slow-mo can expire
    this.tickEffectTimers(rawDt);

    // Apply hit freeze and slow-mo to game dt
    const gameDt = (this.state.hitFreeze.timer > 0 ? 0 : rawDt) * this.state.slowMo.factor;

    this.input.update();
    this.update(gameDt);
    this.render(gameDt);
  };

  private tickEffectTimers(realDt: number): void {
    tickTimers(this.state, realDt);
  }

  private update(dt: number): void {
    const s = this.state;

    // Animated background
    s.bgOffset += dt * 30;

    // Update effects
    updateEffects(s, dt);

    // Handle restart
    if (this.input.restart) {
      if (s.phase === 'victory' || s.phase === 'defeat') {
        this.resetRound();
        return;
      }
    }

    // Title screen
    if (s.phase === 'title') {
      if (this.input.start) {
        s.phase = 'fighting';
        this.lastTime = performance.now();
        announce('战斗开始!', s);
      }
      return;
    }

    // Fighting phase
    if (s.phase !== 'fighting') {
      // In victory/defeat, still render but don't update combat
      updateFighter(s.player, PLAYER_CFG, s.enemy, dt);
      updateFighter(s.enemy, ENEMY_CFG, s.player, dt);
      return;
    }

    // Timer
    s.roundTime -= dt;
    if (s.roundTime <= 0) {
      s.roundTime = 0;
      const ph = s.player.hp;
      const eh = s.enemy.hp;
      if (ph > eh) {
        s.playerWins++;
        s.phase = 'victory';
        s.player.state = 'victory';
        s.enemy.state = 'defeat';
      } else if (eh > ph) {
        s.enemyWins++;
        s.phase = 'defeat';
        s.enemy.state = 'victory';
        s.player.state = 'defeat';
      } else {
        s.playerWins++;
        s.phase = 'victory';
        s.player.state = 'victory';
        s.enemy.state = 'defeat';
      }
      return;
    }

    // ── Player input ──
    const p = s.player;

    if (p.state === 'hitStun' || p.state === 'knockedDown') {
      // Cannot act
    } else if (p.state === 'dashing') {
      // Continue dash
    } else if (p.state === 'attacking') {
      // Allow slight movement during attack recovery for fluidity
      if (this.input.left) p.vx = -PLAYER_CFG.walkSpeed * 0.3;
      else if (this.input.right) p.vx = PLAYER_CFG.walkSpeed * 0.3;
    } else {
      // Blocking
      if (this.input.block && p.onGround) {
        p.state = 'blocking';
        p.blockTimer = 0.1;
        p.parryWindow = 0.12;
        p.vx = 0;
      }
      // Crouching
      else if (this.input.crouch && p.onGround && !this.input.block) {
        p.state = 'crouching';
        p.vx = 0;
      }
      // Air control — responsive mid-air movement
      else if (!p.onGround && (p.state === 'jumping' || p.state === 'idle')) {
        if (this.input.left) p.vx = -PLAYER_CFG.walkSpeed * 0.6;
        else if (this.input.right) p.vx = PLAYER_CFG.walkSpeed * 0.6;
      }
      // Ground movement
      else if (this.input.left) {
        p.vx = -PLAYER_CFG.walkSpeed;
        if (p.state === 'idle') p.state = 'walking';
      } else if (this.input.right) {
        p.vx = PLAYER_CFG.walkSpeed;
        if (p.state === 'idle') p.state = 'walking';
      } else {
        if (p.state === 'walking') p.state = 'idle';
      }

      // Jump
      if (this.input.up && p.onGround && p.state !== 'blocking' && p.state !== 'crouching') {
        p.vy = PLAYER_CFG.jumpForce;
        p.onGround = false;
        p.state = 'jumping';
      }

      // Jump kick — can start mid-air
      if (this.input.kick && !p.onGround) {
        startAttack(p, 'jumpKick');
      }
      // Dash
      else if (this.input.dash && p.onGround && p.dashCooldownTimer <= 0) {
        p.state = 'dashing';
        p.dashTimer = PLAYER_CFG.dashDuration;
        p.vx = p.facing * PLAYER_CFG.dashSpeed;
        startAttack(p, 'dashStrike');
      }
      // Attacks (ground) — can be pressed during movement
      else if (this.input.lightPunch) startAttack(p, 'lightPunch');
      else if (this.input.heavyPunch) startAttack(p, 'heavyPunch');
      else if (this.input.kick && p.onGround) startAttack(p, 'kick');
      else if (this.input.special) startAttack(p, 'energySlash');
      else if (this.input.ultimate) startAttack(p, 'ultimate');
    }

    // ── Enemy AI ──
    const aiResult = updateAI(this.ai, s.enemy, s.player, dt);
    applyAIInput(s.enemy, aiResult.input);

    // ── Updates ──
    updateFighter(s.player, PLAYER_CFG, s.enemy, dt);
    updateFighter(s.enemy, ENEMY_CFG, s.player, dt);

    // Combo decay — reset when both fighters are idle and no one is in stun
    if (s.player.state !== 'hitStun' && s.enemy.state !== 'hitStun' &&
        !s.player.attack && !s.enemy.attack &&
        s.player.state !== 'knockedDown' && s.enemy.state !== 'knockedDown') {
      s.comboGraceTimer += dt;
      if (s.comboGraceTimer > 0.4) {
        s.combo = 0;
        s.comboGraceTimer = 0;
      }
    } else {
      s.comboGraceTimer = 0;
    }

    // Resolve combat hits
    resolveCombat(s);

    // Spawn player trails during attacks
    if (s.player.attack?.phase === 'active') {
      spawnTrail(s.player.x + s.player.facing * 30, s.player.y - 45,
        PLAYER_CFG.accent, s.particles);
    }
    if (s.enemy.attack?.phase === 'active') {
      spawnTrail(s.enemy.x + s.enemy.facing * 30, s.enemy.y - 45,
        ENEMY_CFG.accent, s.particles);
    }

    // Check victory/defeat
    if (s.player.hp <= 0 && s.player.state !== 'knockedDown' && s.player.state !== 'defeat') {
      s.enemyWins++;
      s.phase = 'defeat';
      s.player.state = 'defeat';
      s.enemy.state = 'victory';
      announce('败北...', s);
    }
    if (s.enemy.hp <= 0 && s.enemy.state !== 'knockedDown' && s.enemy.state !== 'defeat') {
      s.playerWins++;
      s.phase = 'victory';
      s.player.state = 'victory';
      s.enemy.state = 'defeat';
      announce('胜利!', s);
    }
  }

  private render(_dt: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    switch (this.state.phase) {
      case 'title':
        this.renderer.drawTitleScreen();
        break;
      case 'fighting':
      case 'victory':
      case 'defeat':
        this.renderer.render(this.state, _dt);
        if (this.state.phase === 'victory' || this.state.phase === 'defeat') {
          this.renderer.drawVictoryScreen(this.state);
        }
        break;
    }
  }
}
