import React, { useEffect, useRef } from 'react';

interface DogContextMenuProps {
  x: number;
  y: number;
  isSleeping: boolean;
  isPaused: boolean;
  onPet: () => void;
  onToggleSleep: () => void;
  onTogglePause: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
  onClose: () => void;
}

export const DogContextMenu: React.FC<DogContextMenuProps> = ({
  x,
  y,
  isSleeping,
  isPaused,
  onPet,
  onToggleSleep,
  onTogglePause,
  onOpenSettings,
  onQuit,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Constrain inside window
  const clampedX = Math.min(Math.max(8, x), 110);
  const clampedY = Math.min(Math.max(8, y), 80);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        left: clampedX,
        top: clampedY,
        zIndex: 9999,
        background: 'rgba(23, 25, 35, 0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        padding: '6px 4px',
        minWidth: '135px',
        color: '#F1F5F9',
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
        fontSize: '12px',
        userSelect: 'none',
      }}
    >
      <button
        onClick={() => { onPet(); onClose(); }}
        style={menuItemStyle}
      >
        <span>🐾</span> Pet Dog
      </button>

      <button
        onClick={() => { onToggleSleep(); onClose(); }}
        style={menuItemStyle}
      >
        <span>{isSleeping ? '☀️' : '💤'}</span> {isSleeping ? 'Wake Up' : 'Go to Sleep'}
      </button>

      <button
        onClick={() => { onTogglePause(); onClose(); }}
        style={menuItemStyle}
      >
        <span>{isPaused ? '▶️' : '⏸️'}</span> {isPaused ? 'Resume Patrol' : 'Pause Patrol'}
      </button>

      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 6px' }} />

      <button
        onClick={() => { onOpenSettings(); onClose(); }}
        style={menuItemStyle}
      >
        <span>⚙️</span> Settings
      </button>

      <button
        onClick={() => { onQuit(); onClose(); }}
        style={{ ...menuItemStyle, color: '#F87171' }}
      >
        <span>❌</span> Quit
      </button>
    </div>
  );
};

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 8px',
  background: 'transparent',
  border: 'none',
  borderRadius: '6px',
  color: 'inherit',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.15s ease',
};
