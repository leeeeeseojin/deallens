/** 상대 유형마다 다른 단색 */
const TONES: Record<string, string> = {
  scenario: '#8fb4e8',
  normal: '#6fcf97',
  lowballer: '#f2a383',
  staller: '#b7a2ee',
  prober: '#efc06a',
  injector: '#ee93ad',
}

interface AvatarProps {
  tone?: string
  size?: number
}

/** 아이메시지 연락처처럼 단색 원 위에 흰 사람 실루엣 */
export function Avatar({ tone = 'normal', size = 34 }: AvatarProps) {
  const color = TONES[tone] ?? TONES.normal
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill={color} />
      <circle cx="20" cy="16" r="7" fill="#fff" />
      <path d="M7.5 34.5c1.8-6.2 6.6-9.5 12.5-9.5s10.7 3.3 12.5 9.5A19.9 19.9 0 0 1 20 40a19.9 19.9 0 0 1-12.5-5.5z" fill="#fff" />
    </svg>
  )
}
