import React from "react";
import { SiteRule } from "../../models/settings";

interface SiteRuleRowProps {
  rule: SiteRule;
  index: number;
  remainingSeconds?: number;
  status?: string;
  onUpdate: (index: number, url: string, minutes: number, enabled?: boolean) => void;
  onRemove: (index: number) => void;
}

export const SiteRuleRow: React.FC<SiteRuleRowProps> = ({
  rule,
  index,
  remainingSeconds,
  status,
  onUpdate,
  onRemove,
}) => {
  const isEnabled = rule.enabled !== false;

  const formatRemaining = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className={`fd-site-row ${!isEnabled ? 'fd-site-row-disabled' : ''}`}>
      {/* Enable / Disable Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', marginRight: '10px' }}>
        <input
          type="checkbox"
          id={`rule_enable_${index}`}
          checked={isEnabled}
          title={isEnabled ? 'Rule enabled' : 'Rule disabled'}
          onChange={(e) => onUpdate(index, rule.url, rule.minutes, e.target.checked)}
          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#38BDF8' }}
        />
      </div>

      {/* URL / Domain Input */}
      <div className="fd-site-url-wrap" style={{ flex: 2 }}>
        <input
          type="text"
          className="fd-input fd-site-url-input"
          value={rule.url}
          placeholder="domain or url (e.g. youtube.com/shorts)"
          disabled={!isEnabled}
          onChange={(e) => onUpdate(index, e.target.value, rule.minutes, isEnabled)}
        />
      </div>

      {/* Allowance Minutes Input */}
      <div className="fd-site-minutes-wrap" style={{ flex: 1 }}>
        <input
          type="number"
          min="0"
          max="1440"
          className="fd-input fd-site-minutes-input"
          value={rule.minutes}
          disabled={!isEnabled}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            onUpdate(index, rule.url, isNaN(val) ? 0 : val, isEnabled);
          }}
        />
        <span className="fd-site-unit">min</span>
      </div>

      {/* Remaining Budget Badge */}
      {remainingSeconds !== undefined && isEnabled && (
        <div
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 600,
            background:
              status === 'EXPIRED'
                ? 'rgba(239, 68, 68, 0.2)'
                : status === 'ACTIVE'
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(255, 255, 255, 0.08)',
            color:
              status === 'EXPIRED'
                ? '#F87171'
                : status === 'ACTIVE'
                ? '#34D399'
                : '#94A3B8',
            border:
              status === 'EXPIRED'
                ? '1px solid rgba(239, 68, 68, 0.4)'
                : status === 'ACTIVE'
                ? '1px solid rgba(16, 185, 129, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.1)',
            whiteSpace: 'nowrap',
          }}
        >
          {status === 'EXPIRED' ? 'EXPIRED' : formatRemaining(remainingSeconds)}
        </div>
      )}

      {/* Remove Button */}
      <button
        type="button"
        className="fd-btn-icon fd-btn-remove"
        title="Remove site rule"
        aria-label="Remove site rule"
        onClick={() => onRemove(index)}
      >
        ✕
      </button>
    </div>
  );
};
