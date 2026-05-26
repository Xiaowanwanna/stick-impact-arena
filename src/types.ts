// ── 共享类型 ──

export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const GROUND_Y = 600;
export const GRAVITY = 1800;
export const STAGE_LEFT = 50;
export const STAGE_RIGHT = 1230;

export type FighterSide = 'left' | 'right';

export type FighterState =
  | 'idle'
  | 'walking'
  | 'jumping'
  | 'crouching'
  | 'blocking'
  | 'hitStun'
  | 'knockedDown'
  | 'dashing'
  | 'attacking'
  | 'victory'
  | 'defeat';

export interface Vec2 {
  x: number;
  y: number;
}

export interface FighterConfig {
  side: FighterSide;
  name: string;
  accent: string;
  accentGlow: string;
  maxHp: number;
  maxEnergy: number;
  walkSpeed: number;
  jumpForce: number;
  dashSpeed: number;
  dashDuration: number;
  dashCooldown: number;
}

export interface HitBox {
  x: number;
  y: number;
  w: number;
  h: number;
  knockbackX: number;
  knockbackY: number;
  damage: number;
  hitStun: number;
  energyGain: number;
  screenShake: number;
  hitFreeze: number;
  blockStun: number;
  slowMo: number;
}

export interface AttackDef {
  name: string;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  knockbackX: number;
  knockbackY: number;
  hitStun: number;
  blockStun: number;
  energyCost: number;
  energyGain: number;
  screenShake: number;
  hitFreeze: number;
  slowMo: number;
  hitboxes: HitBox[];
  // for ultimate / multi-hit:
  chain?: AttackChainEntry[];
}

export interface AttackChainEntry {
  delay: number; // ms from attack start
  hitbox: HitBox;
}

export interface AttackState {
  def: AttackDef;
  timer: number;
  phase: 'startup' | 'active' | 'recovery';
  hitThisUse: boolean;
  chainHits: boolean[];
}

export interface FighterData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  energy: number;
  state: FighterState;
  facing: 1 | -1;
  stateTimer: number;
  attack: AttackState | null;
  combo: number;
  blockTimer: number;
  dashTimer: number;
  dashCooldownTimer: number;
  onGround: boolean;
  stunTimer: number;
  parryWindow: number;
  justParried: boolean;
  invincibleTimer: number;
  animPhase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  type: 'spark' | 'slash' | 'shockwave' | 'text' | 'trail';
  text?: string;
  fontSize?: number;
}

export interface ScreenShake {
  intensity: number;
  duration: number;
  timer: number;
}

export interface HitFreeze {
  duration: number;
  timer: number;
}

export interface SlowMo {
  factor: number;
  duration: number;
  timer: number;
}

export type GamePhase = 'title' | 'fighting' | 'victory' | 'defeat' | 'pause';

export interface GameState {
  phase: GamePhase;
  player: FighterData;
  enemy: FighterData;
  combo: number;
  timer: number;
  roundTime: number;
  particles: Particle[];
  screenShake: ScreenShake;
  hitFreeze: HitFreeze;
  slowMo: SlowMo;
  playerWins: number;
  enemyWins: number;
  bgOffset: number;
  announcement: string;
  announcementTimer: number;
  comboGraceTimer: number;
}
