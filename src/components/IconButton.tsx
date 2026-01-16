import type { IconButtonProps } from '../types'

export function IconButton({ onClick, iconSrc, text, isActive = false, activeIconSrc, size = 18 }: IconButtonProps) {
  const currentIcon = isActive && activeIconSrc ? activeIconSrc : iconSrc
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
    >
      <img
        src={currentIcon}
        style={{ width: size, height: size, pointerEvents: 'none', filter: 'brightness(0) invert(0.95)' }}
      />
      {text}
    </button>
  )
}
