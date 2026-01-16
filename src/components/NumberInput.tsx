import { useState, useEffect } from 'react'
import type { NumberInputProps } from '../types'

export function NumberInput({ label, value, onChange, min = 1, max, step = 1, disableButtons = false }: NumberInputProps & { disableButtons?: boolean }) {
  const [inputValue, setInputValue] = useState(String(value))

  // Sync internal state when value prop changes
  useEffect(() => {
    setInputValue(String(value))
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disableButtons) return

    const str = e.target.value
    setInputValue(str)

    // Only update parent if it's a valid number
    const num = parseFloat(str)
    if (!isNaN(num)) {
      let finalValue = num
      if (finalValue < min) finalValue = min
      if (max !== undefined && finalValue > max) finalValue = max
      onChange(finalValue)
    }
  }

  return (
    <div className='number-input'>
      {label}
      <div className='buttons'>{
        !disableButtons &&
        <button onClick={() => onChange(Math.max(min, value - step))} disabled={disableButtons}>-</button>}
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          step={step}
          min={min}
          max={max}
          readOnly={disableButtons}
          style={{ cursor: disableButtons ? 'default' : 'text' }}
        />
        {
          !disableButtons &&
          <button onClick={() => onChange(max !== undefined ? Math.min(max, value + step) : value + step)} disabled={disableButtons}>+</button>}
      </div>
    </div>
  )
}
