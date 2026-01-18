import type { CheckboxProps } from '../types'

export function Checkbox({ label, checked, iconSrc, onChange }: CheckboxProps) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      lineHeight: 0,
      gap: "4px",
      cursor: 'pointer',
    }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 16, height: 16 }} />
      <img
        src={iconSrc}
        style={{ width: 20, height: 20, pointerEvents: 'none', filter: 'brightness(0) invert(0.95)' }}
      />
      {label}
    </label>
  )
}
