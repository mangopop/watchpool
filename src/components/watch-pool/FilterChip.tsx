"use client";

export function FilterChip({
  label,
  count,
  excludable,
  includeActive,
  excludeActive,
  onInclude,
  onExclude,
}: {
  label: string;
  count: number;
  excludable: boolean;
  includeActive: boolean;
  excludeActive: boolean;
  onInclude: () => void;
  onExclude: () => void;
}) {
  return (
    <span className={`chip-wrap ${excludeActive ? "is-exclude" : ""}`}>
      <button className={`chip ${excludable ? "" : "no-exclude"}`} aria-pressed={includeActive} onClick={onInclude}>
        <span className="chip-count">{count}</span> {label}
      </button>
      {excludable && (
        <button className="chip-exclude" aria-pressed={excludeActive} aria-label={`Exclude ${label}`} onClick={onExclude}>
          ✕
        </button>
      )}
    </span>
  );
}
