import React, { useState } from 'react';
import { DogCoat, DogSettings as DogSettingsModel } from '../../models/settings';
import { Toggle } from '../common/Toggle';
import { Slider } from '../common/Slider';
import { DogCanvas } from '../dog/DogCanvas';
import { DogClipId } from '../../dog/animation/AnimationClip';

interface DogSettingsProps {
  dog: DogSettingsModel;
  onChange: (partial: Partial<DogSettingsModel>) => void;
}

interface ActionCategory {
  title: string;
  actions: Array<{ id: DogClipId; label: string; icon: string }>;
}

export const DogSettings: React.FC<DogSettingsProps> = ({ dog, onChange }) => {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewAction, setPreviewAction] = useState<DogClipId>('idle');

  const coats: Array<{ id: DogCoat; name: string; desc: string }> = [
    {
      id: 'cream',
      name: 'Cream',
      desc: 'The classic golden-cream puppy with soft floppy ears.',
    },
    {
      id: 'white',
      name: 'White',
      desc: 'Pure crisp silver-white with royal blue collar.',
    },
    {
      id: 'black',
      name: 'Black',
      desc: 'Midnight charcoal with warm tan markings & emerald collar.',
    },
  ];

  const categories: ActionCategory[] = [
    {
      title: 'LOCOMOTION',
      actions: [
        { id: 'walk', label: 'Walk Cycle (8f)', icon: '🐾' },
        { id: 'walk-start', label: 'Walk Start (3f)', icon: '🏃' },
        { id: 'walk-stop', label: 'Walk Stop (3f)', icon: '🛑' },
        { id: 'turn-left', label: 'Turn Left (6f)', icon: '↩️' },
        { id: 'turn-right', label: 'Turn Right (6f)', icon: '↪️' },
      ],
    },
    {
      title: 'REST & POSTURE',
      actions: [
        { id: 'idle', label: 'Idle Breathe (6f)', icon: '🌬️' },
        { id: 'sit', label: 'Sit Down (5f)', icon: '🪑' },
        { id: 'sit-idle', label: 'Sitting Idle (4f)', icon: '🐕' },
        { id: 'stand-up', label: 'Stand Up (4f)', icon: '🧍' },
        { id: 'lie-down', label: 'Lie Down (5f)', icon: '🛌' },
        { id: 'sleep', label: 'Deep Sleep (6f)', icon: '💤' },
        { id: 'wake-up', label: 'Wake Up (6f)', icon: '🌅' },
        { id: 'stretch', label: 'Downward Stretch (6f)', icon: '🧘' },
        { id: 'yawn', label: 'Sleepy Yawn (6f)', icon: '🥱' },
      ],
    },
    {
      title: 'CANINE ACTIONS',
      actions: [
        { id: 'sniff', label: 'Ground Sniff (6f)', icon: '👃' },
        { id: 'scratch-ear', label: 'Ear Scratch (6f)', icon: '🪮' },
        { id: 'shake-body', label: 'Body Shake (6f)', icon: '💦' },
        { id: 'jump', label: 'Real Jump (8f)', icon: '🦘' },
        { id: 'roll-over', label: 'Belly-Up Roll (8f)', icon: '🔄' },
        { id: 'play-bow', label: 'Play Bow (6f)', icon: '🎀' },
        { id: 'paw-wave', label: 'Paw Wave (6f)', icon: '👋' },
        { id: 'happy', label: 'Joyful Hop (6f)', icon: '✨' },
        { id: 'landing', label: 'Landing Squash (4f)', icon: '💥' },
        { id: 'dragged', label: 'Picked Up (4f)', icon: '🤏' },
      ],
    },
  ];

  return (
    <div className="fd-settings-section">
      <div className="fd-section-header">
        <h2>The Dog</h2>
        <p className="fd-section-subtitle">
          Customize your desktop companion’s coat, personality, and animation behaviors.
        </p>
      </div>

      <div className="fd-settings-card">
        <h3>Coat Appearance</h3>
        <p className="fd-card-desc">
          Choose a coat style for FocusDog. Each coat preserves identical anatomy, scale, and animation timing.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'center',
            marginTop: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Live Coat Preview in Settings */}
          <div
            style={{
              width: '180px',
              height: '180px',
              background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(15,18,25,0.8) 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              flexShrink: 0,
            }}
          >
            <DogCanvas
              coat={dog.coat}
              interactive={false}
              fixedAction="idle"
              width={180}
              height={180}
            />
          </div>

          <div className="fd-coat-grid" style={{ flex: 1 }}>
            {coats.map((coat) => (
              <div
                key={coat.id}
                className={`fd-coat-card ${dog.coat === coat.id ? 'active' : ''}`}
                onClick={() => onChange({ coat: coat.id })}
              >
                <div className="fd-coat-header">
                  <span className="fd-coat-name">{coat.name}</span>
                  {dog.coat === coat.id && <span className="fd-badge">Selected</span>}
                </div>
                <p className="fd-coat-desc">{coat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fd-settings-card">
        <h3>Movement & Animation</h3>
        <div className="fd-setting-row">
          <div className="fd-setting-info">
            <span className="fd-setting-title">Animation Playback Speed</span>
            <span className="fd-setting-desc">
              Controls walk-cycle stride cadence and gesture speed multiplier.
            </span>
          </div>
          <Slider
            label="Playback Speed"
            value={dog.animationSpeed}
            min={0.5}
            max={2.5}
            step={0.1}
            unit="x"
            onChange={(val) => onChange({ animationSpeed: val })}
          />
        </div>

        <div className="fd-setting-row">
          <div className="fd-setting-info">
            <span className="fd-setting-title">Free Roaming Patrol</span>
            <span className="fd-setting-desc">
              Allows the dog to naturally wander along the bottom of your desktop.
            </span>
          </div>
          <Toggle
            label="Free Roaming Patrol"
            checked={dog.wanderEnabled}
            onChange={(checked) => onChange({ wanderEnabled: checked })}
          />
        </div>

        <div className="fd-setting-row">
          <div className="fd-setting-info">
            <span className="fd-setting-title">Quiet Rests Between Wanders</span>
            <span className="fd-setting-desc">
              Gives the dog peaceful quiet idle periods (8–18s) between walking spells.
            </span>
          </div>
          <Toggle
            label="Quiet Rests Between Wanders"
            checked={dog.dozeBetweenWanders}
            onChange={(checked) => onChange({ dozeBetweenWanders: checked })}
          />
        </div>
      </div>

      {/* Animation Studio Modal & Action Triggers */}
      <div className="fd-settings-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Animation Studio (True 2D Frame-by-Frame)</h3>
            <p className="fd-card-desc">
              Inspect and test every multi-frame animation sequence in the 2D raster engine.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {categories.map((category) => (
            <div key={category.title}>
              <h4
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.06em',
                  marginBottom: '8px',
                }}
              >
                {category.title}
              </h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {category.actions.map((act) => (
                  <button
                    key={act.id}
                    onClick={() => {
                      setPreviewAction(act.id);
                      setShowPreviewModal(true);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#E2E8F0',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    }}
                  >
                    <span>{act.icon}</span>
                    <span>{act.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Animation Studio Preview Modal */}
      {showPreviewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            style={{
              background: '#1A1E29',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '20px',
              padding: '24px',
              width: '360px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
                {previewAction.toUpperCase()}
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                width: '240px',
                height: '240px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(10,12,18,0.9) 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <DogCanvas
                coat={dog.coat}
                interactive={false}
                fixedAction={previewAction}
                width={220}
                height={220}
              />
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 24px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Done Previewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};