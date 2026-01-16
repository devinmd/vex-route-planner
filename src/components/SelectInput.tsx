import type { SelectInputProps } from '../types'

export function SelectInput({ label, value, onChange, options }: SelectInputProps) {
  return (
    <div className='select-input'>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label>{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
