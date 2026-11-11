import type { IconButtonProps } from '../types'

export function IconButton({
  onClick,
  icon,
  text,
  isActive = false,
  activeIcon,
  size = 18,
}: IconButtonProps) {
  const Icon = isActive && activeIcon ? activeIcon : icon
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
      <Icon size={size} style={{ pointerEvents: 'none', flexShrink: 0 }} />
      {!isIconOnly && text}
    </button>
  )
}
