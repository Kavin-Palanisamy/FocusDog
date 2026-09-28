import React from "react";

interface SliderProps {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
  onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 0.05,
  unit = "×",
  description,
  onChange,
}) => {
  const sliderId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="fd-slider-container">
      <div className="fd-slider-header">
        <label htmlFor={sliderId} className="fd-slider-label">
          {label}
        </label>
        <span className="fd-slider-value">
          {value.toFixed(2)} {unit}
        </span>
      </div>
      {description && <p className="fd-slider-description">{description}</p>}
      <input
        type="range"
        id={sliderId}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="fd-slider-input"
      />
    </div>
  );
};