import type { SVGProps } from 'react'

const PATHS = {
  back: 'M15 18l-6-6 6-6',
  close: 'M18 6L6 18M6 6l12 12',
  send: 'M4 12l16-8-6 16-2.5-6.5L4 12z',
  lock: 'M7 11V8a5 5 0 0110 0v3M5 11h14v10H5z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3zM9 12l2 2 4-4',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z',
  hand: 'M8 13V5.5a1.5 1.5 0 013 0V11m0-1V4.5a1.5 1.5 0 013 0V11m0-.5V6a1.5 1.5 0 013 0v8a7 7 0 01-7 7h-.5a6.5 6.5 0 01-5.3-2.7L3.5 15a1.6 1.6 0 012.6-1.9L8 15',
  play: 'M8 5v14l11-7L8 5z',
  pause: 'M8 5v14M16 5v14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  log: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  refresh: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
  truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  pin: 'M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6l1-7z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10.7 10.7 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.1 3.9M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 004.2 4.2',
  bot: 'M12 4v3M5 9h14v10H5zM9 14h.01M15 14h.01M2 13v3M22 13v3',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  chart: 'M4 19h16M7 15l4-5 3 3 5-7',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
  flag: 'M5 21V4h11l-1.5 4L16 12H5',
  chevron: 'M9 6l6 6-6 6',
  gauge: 'M12 14l4-4M3.5 17a9 9 0 1117 0',
  keyboard: 'M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M17 11h.01M8 14h8',
  headphones: 'M4 15v-3a8 8 0 0116 0v3M4 15h3v5H4zM17 15h3v5h-3z',
  projector: 'M3 9h18v8H3zM15.5 15a2 2 0 100-4 2 2 0 000 4zM6 12h4M6 19v-2M18 19v-2',
  book: 'M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4zM5 17a3 3 0 013-3h11',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, strokeWidth = 1.9, ...rest }: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  const filled = name === 'play' || name === 'send'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
