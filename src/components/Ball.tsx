import { Logomark } from './Logomark'

export type BallState = 'idle' | 'hover' | 'dragging' | 'menu'

type Props = {
  state?: BallState
  /** 0 = 100%，1 = 85%，2 = 70% */
  level?: 0 | 1 | 2
  size?: number
  className?: string
}

const LEVEL_OPACITY = [1, 0.86, 0.72]

/** 桌面悬浮球：54px 玻璃球 + 品牌标记 */
export function Ball({ state = 'idle', level = 0, size = 54, className = '' }: Props) {
  const active = state === 'hover' || state === 'menu'
  const dragging = state === 'dragging'
  const scale = dragging ? 1.04 : active ? 1.06 : 1

  return (
    <div
      className={`relative grid place-items-center ${className}`}
      style={{ width: size + 20, height: size + 20 }}
    >
      {/* 悬停光晕 */}
      <div
        className="pointer-events-none absolute rounded-full transition-opacity duration-300"
        style={{
          width: size + 36,
          height: size + 36,
          opacity: active ? 1 : 0,
          background:
            'radial-gradient(circle, rgba(44,175,159,0.30) 0%, rgba(44,175,159,0.12) 42%, rgba(44,175,159,0) 70%)',
        }}
      />

      <div
        className="relative grid place-items-center rounded-full transition-transform duration-200 ease-out"
        style={{
          width: size,
          height: size,
          opacity: LEVEL_OPACITY[level],
          transform: `scale(${scale})`,
          background: 'radial-gradient(circle at 34% 24%, #ffffff 0%, #f9fdfc 42%, #e0edec 100%)',
          border: '1px solid rgba(255,255,255,0.95)',
          boxShadow: dragging
            ? '0 20px 34px -10px rgba(6,29,29,0.55), 0 3px 8px rgba(6,29,29,0.2), inset 0 1px 1px rgba(255,255,255,0.9)'
            : '0 10px 22px -8px rgba(6,29,29,0.45), 0 2px 5px rgba(6,29,29,0.14), 0 0 0 1px rgba(6,29,29,0.04), inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -10px 16px -8px rgba(44,175,159,0.16)',
        }}
      >
        <div
          className="pointer-events-none absolute rounded-full transition-colors duration-200"
          style={{
            inset: 3,
            border: `1px solid ${active ? 'rgba(44,175,159,0.5)' : 'rgba(44,175,159,0.2)'}`,
          }}
        />
        <div className="relative" style={{ width: size * 0.58, height: size * 0.58 }}>
          <Logomark className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}
