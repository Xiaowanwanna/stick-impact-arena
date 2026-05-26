export class Input {
  private keys = new Map<string, boolean>();
  private justPressed = new Map<string, boolean>();
  private prevKeys = new Map<string, boolean>();

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.key, true);
      e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.set(e.key, false);
      e.preventDefault();
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  isDown(key: string): boolean {
    return this.keys.get(key) === true;
  }

  justWentDown(key: string): boolean {
    return this.justPressed.get(key) === true;
  }

  update(): void {
    this.justPressed.clear();
    for (const [key, down] of this.keys) {
      if (down && !this.prevKeys.get(key)) {
        this.justPressed.set(key, true);
      }
      this.prevKeys.set(key, down);
    }
  }

  // Direction helpers
  get left(): boolean { return this.isDown('a') || this.isDown('ArrowLeft'); }
  get right(): boolean { return this.isDown('d') || this.isDown('ArrowRight'); }
  get up(): boolean { return this.isDown('w') || this.isDown('ArrowUp'); }
  get down(): boolean { return this.isDown('s') || this.isDown('ArrowDown'); }

  // Action helpers with just-pressed variants
  get lightPunch(): boolean { return this.justWentDown('j'); }
  get heavyPunch(): boolean { return this.justWentDown('k'); }
  get kick(): boolean { return this.justWentDown('l'); }
  get dash(): boolean { return this.justWentDown('u'); }
  get special(): boolean { return this.justWentDown('i'); }
  get ultimate(): boolean { return this.justWentDown('o'); }
  get block(): boolean { return this.isDown(' '); }
  get crouch(): boolean { return this.isDown('s') || this.isDown('ArrowDown'); }
  get restart(): boolean { return this.justWentDown('r'); }
  get start(): boolean { return this.justWentDown('Enter') || this.justWentDown(' '); }
}
