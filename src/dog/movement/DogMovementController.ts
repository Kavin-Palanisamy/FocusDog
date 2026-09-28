import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

export interface WorkArea {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export type TurnPhase = 'none' | 'pre_turn' | 'pivot' | 'exit_turn';

export class DogMovementController {
  private currentX: number = 800;
  private currentY: number = 600;
  private targetX: number = 800;
  private facingDirection: 'left' | 'right' = 'right';
  private patrolSpeed: number = 2; // 1 to 5
  private mode: 'free_roam' | 'fixed_spot' | 'follow_cursor' = 'free_roam';
  private boundaryMargin: number = 50;
  private workArea: WorkArea = { left: 0, top: 0, right: 1920, bottom: 1040, width: 1920, height: 1040 };
  private windowWidth: number = 220;
  private isTauri: boolean = false;

  // Grounding anchor: paw line inside 220x220 canvas is at maxY = 189
  // Anchoring at 192 places paws right on the taskbar boundary line with contact shadow at 196
  private readonly GROUND_ANCHOR_Y = 192;

  // Walk physics: acceleration & deceleration
  private currentSpeedFactor: number = 0.3; // 0 to 1

  // Turn management
  private turnPhase: TurnPhase = 'none';
  private turnTimer: number = 0;
  private pendingTurnDirection: 'left' | 'right' | null = null;

  // Fall physics during drag release
  private isFalling: boolean = false;
  private fallVelocityY: number = 0;
  private readonly GRAVITY = 2200; // px/s^2

  constructor(
    mode: 'free_roam' | 'fixed_spot' | 'follow_cursor' = 'free_roam',
    speed: number = 2,
    boundaryMargin: number = 50
  ) {
    this.mode = mode;
    this.patrolSpeed = speed;
    this.boundaryMargin = boundaryMargin;
    this.isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  public async initPosition(): Promise<void> {
    if (!this.isTauri) return;

    try {
      const res = await invoke<[number, number, number, number]>('get_desktop_work_area');
      if (Array.isArray(res) && res.length === 4) {
        const [left, top, width, height] = res;
        this.workArea = {
          left,
          top,
          right: left + width,
          bottom: top + height,
          width,
          height,
        };
        this.currentX = Math.max(this.workArea.left + this.boundaryMargin, this.workArea.right - this.windowWidth - 140);
        this.currentY = this.getGroundY();
        this.pickNewRandomTarget();
        await this.syncWindowPosition();
      }
    } catch {
      this.currentX = 600;
      this.currentY = 600;
      this.targetX = 750;
    }
  }

  public getGroundY(): number {
    return this.workArea.bottom - this.GROUND_ANCHOR_Y;
  }

  public setMode(mode: 'free_roam' | 'fixed_spot' | 'follow_cursor'): void {
    this.mode = mode;
  }

  public setSpeed(speed: number): void {
    this.patrolSpeed = Math.max(1, Math.min(5, speed));
  }

  public getFacingDirection(): 'left' | 'right' {
    return this.facingDirection;
  }

  public setFacingDirection(dir: 'left' | 'right'): void {
    this.facingDirection = dir;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.currentX, y: this.currentY };
  }

  public setPosition(x: number, y: number): void {
    this.currentX = x;
    this.currentY = y;
  }

  public getIsTurning(): boolean {
    return this.turnPhase !== 'none';
  }

  public getTurnPhase(): TurnPhase {
    return this.turnPhase;
  }

  public getIsFalling(): boolean {
    return this.isFalling;
  }

  public startFall(): void {
    this.isFalling = true;
    this.fallVelocityY = 0;
  }

  public async stepFall(deltaTime: number): Promise<{ landed: boolean }> {
    if (!this.isFalling) return { landed: true };

    const groundY = this.getGroundY();
    this.fallVelocityY += this.GRAVITY * deltaTime;
    this.currentY += this.fallVelocityY * deltaTime;

    if (this.currentY >= groundY) {
      this.currentY = groundY;
      this.isFalling = false;
      this.fallVelocityY = 0;
      await this.syncWindowPosition();
      return { landed: true };
    }

    await this.syncWindowPosition();
    return { landed: false };
  }

  public pickNewRandomTarget(): void {
    const minX = this.workArea.left + this.boundaryMargin;
    const maxX = this.workArea.right - this.windowWidth - this.boundaryMargin;
    
    // Pick random spot across desktop with minimum travel distance of 140px
    let attempts = 0;
    let chosenX = this.currentX;
    while (attempts < 6) {
      const randomRatio = 0.12 + Math.random() * 0.76;
      chosenX = Math.round(minX + randomRatio * (maxX - minX));
      if (Math.abs(chosenX - this.currentX) > 140) break;
      attempts++;
    }
    this.targetX = chosenX;

    const desiredDir: 'left' | 'right' = this.targetX > this.currentX ? 'right' : 'left';
    if (desiredDir !== this.facingDirection) {
      this.initiateTurn(desiredDir);
    }
  }

  public initiateTurn(newDir: 'left' | 'right'): void {
    if (this.facingDirection === newDir || this.turnPhase !== 'none') return;
    this.turnPhase = 'pre_turn';
    this.turnTimer = 0;
    this.pendingTurnDirection = newDir;
    this.currentSpeedFactor = 0.2;
  }

  public updateTurn(deltaTime: number): { completed: boolean } {
    if (this.turnPhase === 'none') return { completed: true };

    this.turnTimer += deltaTime;

    // 3-frame turn progression:
    // 1. pre-turn: 0.12s (slow down, plant paws)
    // 2. pivot: 0.14s (weight shift, change direction)
    // 3. exit-turn: 0.12s (step out in new direction)
    if (this.turnPhase === 'pre_turn' && this.turnTimer >= 0.12) {
      this.turnPhase = 'pivot';
      this.turnTimer = 0;
      if (this.pendingTurnDirection) {
        this.facingDirection = this.pendingTurnDirection;
      }
    } else if (this.turnPhase === 'pivot' && this.turnTimer >= 0.14) {
      this.turnPhase = 'exit_turn';
      this.turnTimer = 0;
    } else if (this.turnPhase === 'exit_turn' && this.turnTimer >= 0.12) {
      this.turnPhase = 'none';
      this.turnTimer = 0;
      this.pendingTurnDirection = null;
      this.currentSpeedFactor = 0.3; // Ready to accelerate into walk
      return { completed: true };
    }

    return { completed: false };
  }

  /**
   * Step physical walk displacement with gradual acceleration and deceleration
   */
  public async stepWalk(
    deltaTime: number,
    strideDisplacementPx: number = 10
  ): Promise<{ reachedTarget: boolean; needsTurn: boolean }> {
    if (this.mode === 'fixed_spot' || this.isFalling) {
      return { reachedTarget: false, needsTurn: false };
    }

    // If currently executing a turn, advance turn logic without linear motion
    if (this.turnPhase !== 'none') {
      const { completed } = this.updateTurn(deltaTime);
      return { reachedTarget: false, needsTurn: !completed };
    }

    const minX = this.workArea.left + this.boundaryMargin;
    const maxX = this.workArea.right - this.windowWidth - this.boundaryMargin;

    // Distance to target
    const distToTarget = Math.abs(this.targetX - this.currentX);

    // Gradual deceleration when approaching target (<70px)
    if (distToTarget < 70) {
      this.currentSpeedFactor = Math.max(0.25, this.currentSpeedFactor - deltaTime * 2.2);
    } else {
      // Gradual acceleration up to 1.0
      this.currentSpeedFactor = Math.min(1.0, this.currentSpeedFactor + deltaTime * 2.0);
    }

    // Physical speed: synchronized with stride displacement
    const baseSpeedPxPerSec = strideDisplacementPx * 8 * (0.6 + this.patrolSpeed * 0.2);
    const speed = baseSpeedPxPerSec * this.currentSpeedFactor;
    const distance = speed * deltaTime;

    if (distToTarget < 14) {
      // Reached destination!
      this.currentSpeedFactor = 0.3;
      return { reachedTarget: true, needsTurn: false };
    }

    if (this.facingDirection === 'right') {
      this.currentX += distance;
      if (this.currentX >= maxX) {
        this.currentX = maxX;
        this.initiateTurn('left');
        return { reachedTarget: false, needsTurn: true };
      }
    } else {
      this.currentX -= distance;
      if (this.currentX <= minX) {
        this.currentX = minX;
        this.initiateTurn('right');
        return { reachedTarget: false, needsTurn: true };
      }
    }

    // Keep grounded immediately above the taskbar
    this.currentY = this.getGroundY();
    await this.syncWindowPosition();

    return { reachedTarget: false, needsTurn: false };
  }

  public async syncWindowPosition(): Promise<void> {
    if (!this.isTauri) return;
    try {
      const win = getCurrentWindow();
      await win.setPosition(new LogicalPosition(Math.round(this.currentX), Math.round(this.currentY)));
    } catch {
      // Ignore positioning errors
    }
  }

  public groundToWorkArea(): void {
    this.currentY = this.getGroundY();
  }
}

