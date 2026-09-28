import { FocusEngine } from '../engine/FocusEngine';
import { DogPetEngine } from '../../dog/engine/DogPetEngine';
import { DogPersonality } from '../../dog/personality/DogPersonality';
import { EnforcementController } from '../enforcement/EnforcementController';
import { EnforcementSession, EnforcementCancelReason } from '../enforcement/EnforcementState';

export class FocusDogBridge {
  private engine: FocusEngine;
  public enforcementController: EnforcementController | null = null;
  private petEngine: DogPetEngine | null = null;
  private personality: DogPersonality | null = null;
  private unsubscribers: Array<() => void> = [];

  constructor(
    engine: FocusEngine,
    petEngine?: DogPetEngine,
    personality?: DogPersonality,
    enforcementController?: EnforcementController
  ) {
    this.engine = engine;
    this.petEngine = petEngine || null;
    this.personality = personality || null;
    this.enforcementController = enforcementController || null;
    this.bindEvents();
  }

  public attachPet(petEngine: DogPetEngine, personality: DogPersonality): void {
    this.petEngine = petEngine;
    this.personality = personality;
  }

  public setEnforcementController(controller: EnforcementController): void {
    this.enforcementController = controller;
  }

  public detachPet(): void {
    this.petEngine = null;
    this.personality = null;
  }

  private bindEvents(): void {
    const bus = this.engine.getEventBus();

    // 1. Focus Started
    this.unsubscribers.push(
      bus.on('SITE_FOCUS_STARTED', () => {
        if (!this.petEngine) return;
        this.petEngine.spawnEmote('question');
      })
    );

    // 2. Focus Warning
    this.unsubscribers.push(
      bus.on('SITE_ALLOWANCE_WARNING', () => {
        if (!this.petEngine || !this.personality) return;
        this.petEngine.spawnEmote('surprise');
        this.personality.setAction('look-around', 3);
        this.petEngine.getAnimController().play('look-around');
      })
    );

    // 3. Allowance Expired
    this.unsubscribers.push(
      bus.on('SITE_ALLOWANCE_EXPIRED', () => {
        if (!this.petEngine || !this.personality) return;
        this.petEngine.spawnEmote('surprise');
        this.petEngine.getSoundController().bark();
        this.personality.setAction('happy', 3);
        this.petEngine.getAnimController().play('happy', {
          onComplete: () => {
            this.personality?.setAction('look-around', 4);
            this.petEngine?.getAnimController().play('look-around');
          },
        });
      })
    );

    // 4. Snooze Started
    this.unsubscribers.push(
      bus.on('SNOOZE_STARTED', () => {
        if (!this.petEngine || !this.personality) return;
        this.petEngine.spawnEmote('sleepZ');
        this.personality.setAction('sit-idle', 6);
        this.petEngine.getAnimController().play('sit');
      })
    );

    // 5. Snooze Ended
    this.unsubscribers.push(
      bus.on('SNOOZE_ENDED', () => {
        if (!this.petEngine || !this.personality) return;
        this.petEngine.spawnEmote('sparkles');
        this.personality.setAction('idle', 5);
        this.petEngine.getAnimController().play('wake-up');
      })
    );
  }

  public handleEnforcementCountdownTick(_remainingSeconds: number, _session: EnforcementSession): void {
    if (!this.petEngine || !this.personality) return;
    this.petEngine.spawnEmote('question');
    this.personality.setAction('look-around', 1);
    this.petEngine.getAnimController().play('look-around');
  }

  public handleEnforcementComplaint(_session: EnforcementSession): void {
    if (!this.petEngine || !this.personality) return;
    this.petEngine.spawnEmote('surprise');
    this.petEngine.getSoundController().bark();
    this.personality.setAction('sit', 5);
    this.petEngine.getAnimController().play('sit');
  }

  public handleEnforcementTabClosed(_session: EnforcementSession): void {
    if (!this.petEngine || !this.personality) return;
    this.petEngine.spawnEmote('sparkles');
    this.personality.setAction('happy', 4);
    this.petEngine.getAnimController().play('happy');
  }

  public handleEnforcementCancelled(_reason: EnforcementCancelReason, _session: EnforcementSession): void {
    if (!this.petEngine || !this.personality) return;
    this.personality.setAction('idle', 3);
    this.petEngine.getAnimController().play('idle');
  }

  public destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }
}
