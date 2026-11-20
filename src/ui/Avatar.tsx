import { useId } from 'react'

/** 상대 유형마다 다른 은은한 배경 그라데이션 */
const TONES: Record<string, [string, string]> = {
  scenario: ['#b9e4ff', '#6aa8f0'],
  normal: ['#bff3d4', '#3ec97f'],
  lowballer: ['#ffd6c2', '#f08a62'],
  staller: ['#e6d8ff', '#9a7cf0'],
  prober: ['#ffe7b0', '#eaa73a'],
  injector: ['#ffc9d6', '#e8628a'],
}

interface AvatarProps {
  tone?: string
  size?: number
}

/** 연락처 기본 사진처럼 그라데이션 원 위에 채워진 사람 실루엣 */
export function Avatar({ tone = 'normal', size = 34 }: AvatarProps) {
  const id = useId()
  const [from, to] = TONES[tone] ?? TONES.normal
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id={`${id}-fg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.98" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.82" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="20" cy="20" r="20" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="40" height="40" fill={`url(#${id}-bg)`} />
        {/* 위쪽 빛 반사 */}
        <ellipse cx="13" cy="8" rx="14" ry="8" fill="#fff" opacity="0.28" />
        {/* 머리 */}
        <circle cx="20" cy="16" r="7" fill={`url(#${id}-fg)`} />
        {/* 어깨 */}
        <path d="M5 42c0-9 6.7-15 15-15s15 6 15 15z" fill={`url(#${id}-fg)`} />
      </g>
      <circle cx="20" cy="20" r="19.4" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.2" />
    </svg>
  )
}
