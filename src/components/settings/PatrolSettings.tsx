import React from "react";
import { CatchAction, PatrolSettings as PatrolSettingsModel } from "../../models/settings";
import { Toggle } from "../common/Toggle";

interface PatrolSettingsProps {
  patrol: PatrolSettingsModel;
  onChange: (partial: Partial<PatrolSettingsModel>) => void;
}

export const PatrolSettings: React.FC<PatrolSettingsProps> = ({
  patrol,
  onChange,
}) => {
  return (
    <div className="fd-section">
      <div className="fd-section-header">
        <h2 className="fd-section-title">Patrol</h2>
        <p className="fd-section-desc">
          When the dog gets up, and what it does when it arrives.
        </p>
      </div>

      <div className="fd-card">
        {/* ON PATROL */}
        <Toggle
          id="patrol-enabled"
          label="ON PATROL"
          description="Turn the whole thing off without quitting."
          checked={patrol.enabled}
          onChange={(enabled) => onChange({ enabled })}
        />
      </div>

      {/* WHEN IT CATCHES YOU */}
      <div className="fd-card">
        <h3 className="fd-card-title">WHEN IT CATCHES YOU</h3>
        <p className="fd-card-desc">Choose what happens when your site allowance runs out.</p>

        <div className="fd-radio-group">
          {/* Option A: Close it */}
          <label
            className={`fd-radio-card ${
              patrol.catchAction === "close" ? "fd-radio-selected" : ""
            }`}
          >
            <input
              type="radio"
              name="catchAction"
              value="close"
              checked={patrol.catchAction === "close"}
              onChange={() => onChange({ catchAction: "close" as CatchAction })}
            />
            <div className="fd-radio-content">
              <div className="fd-radio-label">Close it</div>
              <div className="fd-radio-sub">
                A browser tab gets Ctrl+W. Anything else gets a window close.
              </div>
            </div>
          </label>

          {/* Option B: Only complain */}
          <label
            className={`fd-radio-card ${
              patrol.catchAction === "complain" ? "fd-radio-selected" : ""
            }`}
          >
            <input
              type="radio"
              name="catchAction"
              value="complain"
              checked={patrol.catchAction === "complain"}
              onChange={() => onChange({ catchAction: "complain" as CatchAction })}
            />
            <div className="fd-radio-content">
              <div className="fd-radio-label">Only complain</div>
              <div className="fd-radio-sub">
                The dog walks over and reacts, but never closes anything.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* TIMINGS */}
      <div className="fd-card fd-grid-2">
        {/* COUNTDOWN BEFORE IT ACTS */}
        <div className="fd-input-group">
          <label htmlFor="countdown-seconds" className="fd-input-label">
            COUNTDOWN BEFORE IT ACTS
          </label>
          <div className="fd-input-unit-wrap">
            <input
              id="countdown-seconds"
              type="number"
              min="0"
              max="300"
              className="fd-input"
              value={patrol.countdownSeconds}
              onChange={(e) =>
                onChange({ countdownSeconds: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
            />
            <span className="fd-input-unit">seconds</span>
          </div>
          <p className="fd-input-desc">
            Click the dog during the countdown to snooze instead. Set 0 to act instantly.
          </p>
        </div>

        {/* SNOOZE LENGTH */}
        <div className="fd-input-group">
          <label htmlFor="snooze-minutes" className="fd-input-label">
            SNOOZE LENGTH
          </label>
          <div className="fd-input-unit-wrap">
            <input
              id="snooze-minutes"
              type="number"
              min="1"
              max="240"
              className="fd-input"
              value={patrol.snoozeMinutes}
              onChange={(e) =>
                onChange({ snoozeMinutes: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
            />
            <span className="fd-input-unit">minutes</span>
          </div>
          <p className="fd-input-desc">
            Used by the tray menu and by clicking the dog mid-countdown.
          </p>
        </div>
      </div>
    </div>
  );
};