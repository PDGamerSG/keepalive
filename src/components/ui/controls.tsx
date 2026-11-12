"use client";

/** A labelled range input whose track fills up to the value. */
export function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const pct = ((props.value - props.min) / (props.max - props.min)) * 100;
  return (
    <label className="slider" aria-disabled={props.disabled || undefined}>
      <span>{props.label}</span>
      <output>
        {props.value}
        {props.unit}
      </output>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        disabled={props.disabled}
        style={{ "--fill": `${pct}%` } as React.CSSProperties}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}
