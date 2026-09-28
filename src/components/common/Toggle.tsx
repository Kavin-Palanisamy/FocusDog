import React from "react";

interface ToggleProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  disabled,
}) => {
  const toggleId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`fd-toggle-row ${disabled ? "fd-disabled" : ""}`}>
      {(label || description) && (
        <div className="fd-toggle-text">
          {label && <label htmlFor={toggleId} className="fd-toggle-label">{label}</label>}
          {description && <p className="fd-toggle-description">{description}</p>}
        </div>
      )}
      <button
        type="button"
        id={toggleId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`fd-toggle-switch ${checked ? "fd-toggle-checked" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="fd-toggle-thumb" />
      </button>
    </div>
  );
};