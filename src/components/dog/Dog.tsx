import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettings } from '../../hooks/useSettings';
import { DogCanvas } from './DogCanvas';
import '../../styles/dog/dog_pet.css';

export const Dog: React.FC = () => {
  const { settings } = useSettings();

  const handleOpenSettings = async () => {
    try {
      await invoke('open_settings_window');
    } catch (err) {
      console.warn('Failed to invoke open_settings_window:', err);
    }
  };

  const handleQuit = async () => {
    try {
      await invoke('quit_app');
    } catch {
      window.close();
    }
  };

  return (
    <div className="fd-pet-root" data-tauri-drag-region>
      <DogCanvas
        coat={settings.dog.coat}
        interactive={true}
        soundEnabled={true}
        soundVolume={0.6}
        patrolEnabled={settings.patrol.enabled && settings.dog.wanderEnabled}
        patrolSpeed={Math.max(1, Math.min(5, Math.round(settings.dog.animationSpeed)))}
        width={220}
        height={220}
        onOpenSettings={handleOpenSettings}
        onQuit={handleQuit}
      />
    </div>
  );
};
