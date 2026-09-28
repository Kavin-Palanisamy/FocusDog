import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
import { DogMovementController } from './DogMovementController';
import { DogPersonality } from '../personality/DogPersonality';
import { AnimationController } from '../animation/AnimationController';

export class DragController {
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private windowInitialX: number = 0;
  private windowInitialY: number = 0;
  private movedDistance: number = 0;
  private readonly DRAG_THRESHOLD = 6;
  private movement: DogMovementController;
  private personality: DogPersonality;
  private anim: AnimationController;
  private isTauri: boolean = false;

  constructor(
    movement: DogMovementController,
    personality: DogPersonality,
    anim: AnimationController
  ) {
    this.movement = movement;
    this.personality = personality;
    this.anim = anim;
    this.isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  public handlePointerDown(e: React.PointerEvent): void {
    if (e.button !== 0) return; // Only left-click
    this.isDragging = false;
    this.dragStartX = e.screenX;
    this.dragStartY = e.screenY;
    const pos = this.movement.getPosition();
    this.windowInitialX = pos.x;
    this.windowInitialY = pos.y;
    this.movedDistance = 0;
  }

  public handlePointerMove(e: React.PointerEvent): boolean {
    const dx = e.screenX - this.dragStartX;
    const dy = e.screenY - this.dragStartY;
    this.movedDistance = Math.hypot(dx, dy);

    if (!this.isDragging && this.movedDistance > this.DRAG_THRESHOLD) {
      this.isDragging = true;
      this.personality.setDragging(true);
      this.anim.play('dragged');
    }

    if (this.isDragging) {
      const newX = this.windowInitialX + dx;
      const newY = this.windowInitialY + dy;
      this.movement.setPosition(newX, newY);
      this.syncPosition(newX, newY);
      return true;
    }

    return false;
  }

  public handlePointerUp(): { wasDragging: boolean } {
    const wasDrag = this.isDragging;
    if (this.isDragging) {
      this.isDragging = false;
      this.personality.setDragging(false);

      const pos = this.movement.getPosition();
      const groundY = this.movement.getGroundY();

      // If released significantly above the desktop, start smooth physics drop
      if (pos.y < groundY - 15) {
        this.movement.startFall();
      } else {
        // Grounded release: play impact bounce & settle
        this.movement.groundToWorkArea();
        this.movement.syncWindowPosition();
        this.anim.play('landing', {
          onComplete: () => {
            this.personality.setAction('idle', 5);
            this.anim.play('idle');
          },
        });
      }
    }

    this.isDragging = false;
    return { wasDragging: wasDrag };
  }

  public getIsDragging(): boolean {
    return this.isDragging;
  }

  private async syncPosition(x: number, y: number): Promise<void> {
    if (!this.isTauri) return;
    try {
      const win = getCurrentWindow();
      await win.setPosition(new LogicalPosition(Math.round(x), Math.round(y)));
    } catch {
      // Ignore positioning error during drag
    }
  }
}
