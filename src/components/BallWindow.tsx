import { useState } from 'react'
import { openQuick } from '../lib/desktop'
import { Ball } from './Ball'

/** 桌面悬浮球窗口：透明无边框，单击唤出速记条 */
export function BallWindow() {
  const [hover, setHover] = useState(false)

  return (
    <div
      className="flex h-full w-full items-center justify-start"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        aria-label="浮笺悬浮球：单击速记"
        onClick={() => void openQuick()}
        className="block cursor-pointer"
      >
        <Ball state={hover ? 'hover' : 'idle'} />
      </button>
    </div>
  )
}
