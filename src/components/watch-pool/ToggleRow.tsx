"use client";

interface ToggleRowProps<T> {
  label: string;
  options: T[];
  getKey: (option: T) => string | number;
  getLabel: (option: T) => string;
  isActive: (option: T) => boolean;
  onToggle: (option: T) => void;
}

export function ToggleRow<T>({ label, options, getKey, getLabel, isActive, onToggle }: ToggleRowProps<T>) {
  return (
    <div className="field">
      <span className="step-label">{label}</span>
      <div className="toggle-row">
        {options.map((option) => (
          <button
            key={getKey(option)}
            type="button"
            className="toggle"
            aria-pressed={isActive(option)}
            onClick={() => onToggle(option)}
          >
            {getLabel(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
