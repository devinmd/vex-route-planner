import type { CheckboxProps } from '../types'

export function Checkbox({ label, checked, icon: Icon, onChange }: CheckboxProps) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      lineHeight: 0,
      gap: "4px",
      cursor: 'pointer',
    }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 16, height: 16 }} />
      {Icon && <Icon size={20} style={{ pointerEvents: 'none', flexShrink: 0 }} />}
      {label}
    </label>
  )
}
