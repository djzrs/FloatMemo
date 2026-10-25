import { useId } from 'react'

type Props = {
  className?: string
  /** 深色背景上使用：便签纸改为深色描边模式 */
  tone?: 'default' | 'plain'
}

/**
 * 品牌标记 —— 便签纸 + 中性笔，取自 logo.png 的核心元素。
 * 去掉大脑与文字，保证 24–56px 下依然清晰。
 */
export function Logomark({ className = '', tone = 'default' }: Props) {
  const uid = useId().replace(/[:]/g, '')
  const strokeId = `lm-stroke-${uid}`
  const clipId = `lm-clip-${uid}`
  const paper = tone === 'plain' ? '#ffffff' : '#ffffff'

  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={strokeId} x1="9" y1="8" x2="41" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4E94BE" />
          <stop offset="0.5" stopColor="#2CAF9F" />
          <stop offset="1" stopColor="#1C8F86" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="7" y="6" width="26" height="34" rx="6.5" />
        </clipPath>
      </defs>

      {/* 纸 */}
      <rect x="7" y="6" width="26" height="34" rx="6.5" fill={paper} />
      <g clipPath={`url(#${clipId})`}>
        <rect x="7" y="6" width="26" height="11.5" fill="#C3DDF1" />
      </g>
      <rect
        x="7"
        y="6"
        width="26"
        height="34"
        rx="6.5"
        stroke={`url(#${strokeId})`}
        strokeWidth="2.6"
      />

      {/* 文本线 */}
      <rect x="11.6" y="22" width="11" height="2" rx="1" fill="#B7CDDB" />
      <rect x="11.6" y="27" width="9" height="2" rx="1" fill="#B7CDDB" />
      <rect x="11.6" y="32" width="6" height="2" rx="1" fill="#B7CDDB" />

      {/* 装订环 */}
      <rect
        x="13"
        y="3"
        width="3.4"
        height="7"
        rx="1.7"
        fill="#fff"
        stroke={`url(#${strokeId})`}
        strokeWidth="1.7"
      />
      <rect
        x="23.6"
        y="3"
        width="3.4"
        height="7"
        rx="1.7"
        fill="#fff"
        stroke={`url(#${strokeId})`}
        strokeWidth="1.7"
      />

      {/* 笔 */}
      <g transform="rotate(45 36 33)">
        <rect x="32.6" y="18.4" width="6.8" height="7.4" rx="3.4" fill="#5E9BCE" />
        <rect
          x="32.6"
          y="24.2"
          width="6.8"
          height="12"
          rx="2.2"
          fill="#fff"
          stroke={`url(#${strokeId})`}
          strokeWidth="2"
        />
        <path
          d="M32.6 35.2h6.8L36 41.6z"
          fill="#fff"
          stroke={`url(#${strokeId})`}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M34.5 37.6h3L36 40.6z" fill="#1C8F86" />
      </g>
    </svg>
  )
}
