import { sharedFocusEngine, sharedEnforcementController, FocusDogBridge } from '../../focus';
import React, { useEffect, useRef, useState } from 'react';
import { DogCoat } from '../../models/settings';
import { DogClipId } from '../../dog/animation/AnimationClip';
import { DogPetEngine } from '../../dog/engine/DogPetEngine';
import { DogContextMenu } from './DogContextMenu';
import { DogInteractionController } from '../../dog/interaction/DogInteractionController';

export interface DogCanvasProps {
  coat?: DogCoat;
  fixedAction?: DogClipId;
  facingDirection?: 'left' | 'right';
  interactive?: boolean;
  soundEnabled?: boolean;
  soundVolume?: number;
  patrolEnabled?: boolean;
  patrolSpeed?: number;
  width?: number;
  height?: number;
  onOpenSettings?: () => void;
  onQuit?: () => void;
}

export const DogCanvas: React.FC<DogCanvasProps> = ({
  coat = 'cream',
  fixedAction,
  interactive = true,
  soundEnabled = true,
  soundVolume = 0.6,
  patrolEnabled = true,
  patrolSpeed = 2,
  width = 220,
  height = 220,
  onOpenSettings,
  onQuit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<DogPetEngine | null>(null);
  const interactionRef = useRef<DogInteractionController | null>(null);

  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isPaused, setIsPaused] = useState(!patrolEnabled);

  // Initialize decoupled DogPetEngine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new DogPetEngine(canvas, {
      coat,
      speed: 1.0,
      soundEnabled,
      soundVolume,
      patrolEnabled,
      patrolSpeed,
      fixedClip: fixedAction,
      interactive,
      onContextMenu: (x, y) => setContextMenuPos({ x, y }),
    });

    engineRef.current = engine;
    engine.start();

    let bridge: FocusDogBridge | null = null;
    if (interactive) {
      interactionRef.current = new DogInteractionController(
        engine.getPersonality(),
        engine.getAnimController(),
        engine.getSoundController(),
        {
          onContextMenu: (x, y) => setContextMenuPos({ x, y }),
          onEmoteSpawn: (type) => engine.spawnEmote(type),
        }
      );

      // Connect FocusDogBridge to receive FocusEngine telemetry
      bridge = new FocusDogBridge(sharedFocusEngine, engine, engine.getPersonality(), sharedEnforcementController);
      sharedEnforcementController.updatePolicy({}); // sync initial
    }

    return () => {
      if (bridge) {
        bridge.destroy();
      }
      engine.stop();
      engineRef.current = null;
    };
  }, []); // Mounts once to prevent React render loops

  // Update dynamic properties on the engine
  useEffect(() => {
    engineRef.current?.updateOptions({
      coat,
      soundEnabled,
      soundVolume,
      patrolEnabled,
      patrolSpeed,
      fixedClip: fixedAction,
    });
    setIsPaused(!patrolEnabled);
  }, [coat, soundEnabled, soundVolume, patrolEnabled, patrolSpeed, fixedAction]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    engineRef.current?.getDragController()?.handlePointerDown(e);
    interactionRef.current?.handlePointerDown(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interactive) return;

    // Pupil glance towards cursor
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const dx = Math.max(-1, Math.min(1, (mouseX - 135) / 60));
      const dy = Math.max(-1, Math.min(1, (mouseY - 108) / 50));
      engineRef.current?.setPupilOffset(dx, dy);
    }

    engineRef.current?.getDragController()?.handlePointerMove(e);
  };

  const handlePointerUp = () => {
    if (!interactive) return;
    const { wasDragging } = engineRef.current?.getDragController()?.handlePointerUp() || { wasDragging: false };
    interactionRef.current?.handlePointerUp(wasDragging);
    if (engineRef.current) {
      setIsSleeping(engineRef.current.getPersonality().getStats().isSleeping);
    }
  };

  const handlePointerLeave = () => {
    engineRef.current?.setPupilOffset(0, 0);
    if (interactive && engineRef.current?.getDragController()?.getIsDragging()) {
      engineRef.current.getDragController()?.handlePointerUp();
    }
  };

  // Context Menu Actions
  const handlePet = () => {
    interactionRef.current?.triggerPetCelebration();
    if (engineRef.current) {
      setIsSleeping(engineRef.current.getPersonality().getStats().isSleeping);
    }
  };

  const handleToggleSleep = () => {
    if (engineRef.current) {
      if (engineRef.current.getPersonality().getStats().isSleeping) {
        interactionRef.current?.triggerSingleClickReaction();
      } else {
        interactionRef.current?.triggerLongPressSleep();
      }
      setIsSleeping(engineRef.current.getPersonality().getStats().isSleeping);
    }
  };

  const handleTogglePause = () => {
    if (engineRef.current) {
      const cur = engineRef.current.getPersonality().getStats().isPaused;
      engineRef.current.getPersonality().setPaused(!cur);
      setIsPaused(!cur);
      if (!cur) {
        engineRef.current.getAnimController().play('sit');
      } else {
        engineRef.current.getAnimController().play('idle');
      }
    }
  };

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'block',
          cursor: interactive ? 'grab' : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(e) => {
          if (interactive) {
            e.preventDefault();
            setContextMenuPos({ x: e.clientX, y: e.clientY });
          }
        }}
      />

      {contextMenuPos && (
        <DogContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          isSleeping={isSleeping}
          isPaused={isPaused}
          onPet={handlePet}
          onToggleSleep={handleToggleSleep}
          onTogglePause={handleTogglePause}
          onOpenSettings={() => {
            if (onOpenSettings) onOpenSettings();
          }}
          onQuit={() => {
            if (onQuit) onQuit();
          }}
          onClose={() => setContextMenuPos(null)}
        />
      )}
    </div>
  );
};
