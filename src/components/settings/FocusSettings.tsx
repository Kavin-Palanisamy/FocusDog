import React, { useState } from "react";
import { FocusSettings as FocusSettingsModel } from "../../models/settings";
import { SiteRuleRow } from "../common/SiteRuleRow";
import { useFocusEngine } from "../../focus";

interface FocusSettingsProps {
  focus: FocusSettingsModel;
  onAddSite: (url: string, minutes: number) => void;
  onUpdateSite: (index: number, url: string, minutes: number, enabled?: boolean) => void;
  onRemoveSite: (index: number) => void;
}

export const FocusSettings: React.FC<FocusSettingsProps> = ({
  focus,
  onAddSite,
  onUpdateSite,
  onRemoveSite,
}) => {
  const [newUrl, setNewUrl] = useState("");
  const [newMinutes, setNewMinutes] = useState(15);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDevControls, setShowDevControls] = useState(false);

  // Live Focus Engine state from real browser activity provider
  const {
    activeSite,
    matchingRule,
    remainingSeconds,
    timerStatus,
    isExpired,
    isSnoozed,
    snoozeRemainingSeconds,
    timerStates,
    currentBrowser,
    snooze,
    cancelSnooze,
    devControls,
    enforcementSession,
    } = useFocusEngine(focus.sites);

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    onAddSite(newUrl.trim(), newMinutes);
    setNewUrl("");
    setNewMinutes(15);
    setShowAddForm(false);
  };

  const formatRemaining = (seconds: number | null) => {
    if (seconds === null) return "paused";
    if (seconds <= 0) return "0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' + s : s}s`;
  };

  const getTimerStateForRule = (url: string) => {
    return timerStates.find(t => t.domain === url || t.ruleId === url);
  };

  // Browser display name
  const getInFrontOfYouText = () => {
    if (!activeSite) return "Desktop / Standby";
    if (currentBrowser === "chrome") return "Google Chrome";
    if (currentBrowser === "edge") return "Microsoft Edge";
    return "Browser";
  };

  return (
    <div className="fd-section">
      <div className="fd-section-header">
        <h2 className="fd-section-title">Focus</h2>
        <p className="fd-section-desc">
          Name the sites you keep losing time to, and say how long you actually need on each.
          The dog monitors your active browser tabs and helps you stay accountable.
        </p>
      </div>

      {/* Right Now Status */}
      <div className="fd-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 className="fd-card-title" style={{ margin: 0 }}>Right Now</h3>
            <p className="fd-card-desc" style={{ margin: 0 }}>Active browser activity and countdown telemetry.</p>
          </div>
          {isSnoozed ? (
            <button
              className="fd-btn fd-btn-subtle fd-btn-sm"
              onClick={() => cancelSnooze()}
              style={{ color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.4)' }}
            >
              Cancel Snooze
            </button>
          ) : (
            <button
              className="fd-btn fd-btn-secondary fd-btn-sm"
              onClick={() => snooze(15)}
            >
              Snooze 15m
            </button>
          )}
        </div>

        <div className="fd-status-grid">
          {/* Watching */}
          <div className="fd-status-card">
            <div className="fd-status-label">WATCHING</div>
            <div
              className={`fd-status-value ${matchingRule ? 'fd-status-active' : 'fd-status-muted'}`}
              style={{
                color: matchingRule ? '#34D399' : '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {matchingRule && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isExpired ? '#EF4444' : '#10B981',
                    boxShadow: isExpired ? '0 0 8px #EF4444' : '0 0 8px #10B981',
                  }}
                />
              )}
              <span>{matchingRule ? `${matchingRule.domain}${matchingRule.path || ''}` : 'not right now'}</span>
            </div>
            <div className="fd-status-sub">
              {matchingRule ? `Allowance: ${matchingRule.allowanceMinutes} min` : 'Site untracked or browser idle'}
            </div>
          </div>

          {/* Time Left & Patrol */}
          <div className="fd-status-card">
            <div className="fd-status-label">TIME LEFT & PATROL</div>
            <div
              className="fd-status-value"
              style={{
                color: enforcementSession && enforcementSession.status === "COUNTDOWN"
                  ? "#EF4444"
                  : isExpired
                  ? "#EF4444"
                  : isSnoozed
                  ? "#F59E0B"
                  : timerStatus === "ACTIVE"
                  ? "#38BDF8"
                  : "#94A3B8",
                fontWeight: 700,
              }}
            >
              {enforcementSession && enforcementSession.status === "COUNTDOWN"
                ? `🚨 Closing in ${enforcementSession.remainingCountdownSeconds}s`
                : enforcementSession && enforcementSession.status === "COMPLETED" && enforcementSession.action === "complain"
                ? "🐶 Complaining"
                : isExpired
                ? "EXPIRED"
                : isSnoozed
                ? `Snoozed (${Math.ceil(snoozeRemainingSeconds / 60)}m)`
                : formatRemaining(remainingSeconds)}
            </div>
            <div className="fd-status-sub">
              {enforcementSession && enforcementSession.status === "COUNTDOWN"
                ? "Pre-flight safety active"
                : enforcementSession && enforcementSession.status === "CANCELLED"
                ? `Cancelled (${enforcementSession.cancelReason})`
                : isExpired
                ? "Allowance reached"
                : isSnoozed
                ? "Enforcement temporarily paused"
                : timerStatus === "ACTIVE"
                ? "Counting down"
                : "Timer paused"}
            </div>
          </div>
          {/* In front of you */}
          <div className="fd-status-card">
            <div className="fd-status-label">IN FRONT OF YOU</div>
            <div
              className="fd-status-value fd-status-active"
              style={{
                fontSize: '14px',
                color: activeSite ? '#F8FAFC' : '#94A3B8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {getInFrontOfYouText()}
            </div>
            <div
              className="fd-status-sub"
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={activeSite || undefined}
            >
              {activeSite ? activeSite : 'FocusDog Standby'}
            </div>
          </div>
        </div>

        {/* Developer Mode Simulator Toggle */}
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="fd-btn fd-btn-subtle fd-btn-sm"
            style={{ fontSize: '11px', color: '#64748B', padding: '2px 8px' }}
            onClick={() => setShowDevControls(!showDevControls)}
          >
            {showDevControls ? 'Hide Simulator ▲' : '🧪 Developer Simulator ▼'}
          </button>
        </div>

        {/* Collapsible Developer Simulator */}
        {showDevControls && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#94A3B8', width: '90px' }}>Simulate Site:</span>
              <button
                type="button"
                className="fd-btn fd-btn-subtle fd-btn-sm"
                onClick={() => devControls.simulateSite('https://www.youtube.com')}
              >
                Chrome: YouTube
              </button>
              <button
                type="button"
                className="fd-btn fd-btn-subtle fd-btn-sm"
                onClick={() => devControls.simulateSite('https://www.youtube.com/shorts/trending')}
              >
                Chrome: Shorts
              </button>
              <button
                type="button"
                className="fd-btn fd-btn-subtle fd-btn-sm"
                onClick={() => devControls.simulateSite('https://reddit.com/r/programming')}
              >
                Edge: Reddit
              </button>
              <button
                type="button"
                className="fd-btn fd-btn-subtle fd-btn-sm"
                onClick={() => devControls.simulateSite(null)}
              >
                Desktop (Unfocused)
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#94A3B8', width: '90px' }}>Time Travel:</span>
              <button
                type="button"
                className="fd-btn fd-btn-secondary fd-btn-sm"
                onClick={() => devControls.advanceTime(30)}
              >
                +30s
              </button>
              <button
                type="button"
                className="fd-btn fd-btn-secondary fd-btn-sm"
                onClick={() => devControls.advanceTime(60)}
              >
                +1m
              </button>
              <button
                type="button"
                className="fd-btn fd-btn-secondary fd-btn-sm"
                onClick={() => devControls.triggerExpiry()}
              >
                Trigger Expiry
              </button>
              <button
                type="button"
                className="fd-btn fd-btn-secondary fd-btn-sm"
                onClick={() => devControls.triggerWarning()}
              >
                Trigger Warning
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Site Allowance Editor */}
      <div className="fd-card">
        <div className="fd-site-list-header">
          <span className="fd-site-header-col" style={{ flex: '0 0 26px' }}></span>
          <span className="fd-site-header-col" style={{ flex: 2 }}>Site</span>
          <span className="fd-site-header-col" style={{ flex: 1 }}>You get</span>
          <span className="fd-site-header-col" style={{ flex: '0 0 80px' }}>Remaining</span>
          <span className="fd-site-header-col fd-col-action"></span>
        </div>

        <div className="fd-site-list">
          {focus.sites.map((rule, idx) => {
            const st = getTimerStateForRule(rule.url);
            return (
              <SiteRuleRow
                key={idx}
                rule={rule}
                index={idx}
                remainingSeconds={st ? st.remainingSeconds : rule.minutes * 60}
                status={st ? st.status : undefined}
                onUpdate={onUpdateSite}
                onRemove={onRemoveSite}
              />
            );
          })}

          {focus.sites.length === 0 && (
            <div className="fd-empty-state">
              No site allowances added yet. Click &quot;+ Add a site&quot; below to configure.
            </div>
          )}
        </div>

        {showAddForm ? (
          <form onSubmit={handleAddNew} className="fd-add-site-form">
            <input
              type="text"
              autoFocus
              className="fd-input fd-site-url-input"
              placeholder="e.g. reddit.com or youtube.com/shorts"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            <div className="fd-site-minutes-wrap">
              <input
                type="number"
                min="0"
                max="1440"
                className="fd-input fd-site-minutes-input"
                value={newMinutes}
                onChange={(e) => setNewMinutes(parseInt(e.target.value, 10) || 0)}
              />
              <span className="fd-site-unit">min</span>
            </div>
            <button type="submit" className="fd-btn fd-btn-primary fd-btn-sm">
              Add
            </button>
            <button
              type="button"
              className="fd-btn fd-btn-subtle fd-btn-sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="fd-add-action-wrap">
            <button
              type="button"
              className="fd-btn fd-btn-secondary"
              onClick={() => setShowAddForm(true)}
            >
              + Add a site
            </button>
          </div>
        )}

        {/* Guidance Notes */}
        <div className="fd-guidance-notes">
          <p className="fd-note-item">
            <strong>0 minutes</strong> closes it the moment it appears — that is the old stop-me-immediately behaviour, rather than an allowance you spend down.
          </p>
          <p className="fd-note-item">
            <strong>Every site keeps its own clock</strong>, and it only runs while that site is in front of you — switch to something else and it pauses where it is.
          </p>
          <p className="fd-note-item">
            <strong>Editing a row</strong> starts that row&apos;s time over and leaves the others alone.
          </p>
          <p className="fd-note-item">
            <strong>Quitting</strong> also resets the current in-memory budgets.
          </p>
          <p className="fd-note-item fd-note-priority">
            <em>Rule: The first matching row has priority. Path-specific rules (like <code>youtube.com/shorts</code>) should be placed above root domains.</em>
          </p>
        </div>
      </div>
    </div>
  );
};
