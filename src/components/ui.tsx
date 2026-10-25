import type { ReactNode } from 'react'

interface Option<T> {
  value: T
  label: string
}

export function Segmented<T extends string | number | boolean>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={option.value === value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  )
}

export function Range({
  label,
  value,
  min,
  max,
  onChange,
  format = (v) => (v > 0 && min < 0 ? `+${v}` : String(v)),
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  format?: (value: number) => string
}) {
  return (
    <label className="range" title="더블클릭하면 0으로 돌아가요">
      <span className="range-head">
        <span>{label}</span>
        <b>{format(value)}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(0)}
      />
    </label>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
    </div>
  )
}
