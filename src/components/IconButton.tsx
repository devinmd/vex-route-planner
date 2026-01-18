import type { IconButtonProps } from '../types'

export function IconButton({
  onClick,
  iconSrc,
  text,
  isActive = false,
  activeIconSrc,
  size = 18,
}: IconButtonProps) {
  const currentIcon = isActive && activeIconSrc ? activeIconSrc : iconSrc
  const isIconOnly = text === ''

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isIconOnly ? 0 : '0.5rem',
        width: isIconOnly ? '2rem' : 'auto',
        justifyContent: 'center',
      }}
    >
      <img
        src={currentIcon}
        style={{
          width: size,
          height: size,
          pointerEvents: 'none',
          filter: 'brightness(0) invert(0.95)',
        }}
      />
      {!isIconOnly && text}
    </button>
  )
}
