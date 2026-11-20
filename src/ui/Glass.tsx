import { useRef, type CSSProperties, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react'

type Variant = 'default' | 'strong' | 'tint' | 'dark' | 'amber' | 'coral'

interface GlassProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  /** 포인터를 따라 살짝 기울어지는 입체 효과 */
  tilt?: boolean
  /** 뒤 배경을 휘게 하는 굴절 (Chromium) */
  refract?: boolean
  radius?: number
  children?: ReactNode
}

/**
 * 진화한 글래스 카드. 흐림 위에 포인터를 따라오는 반사광, 빛을 받는 테두리,
 * 선택적으로 굴절과 기울임을 더한다.
 */
export function Glass({ variant = 'default', tilt = false, refract = false, radius, className = '', style, children, ...rest }: GlassProps) {
  const ref = useRef<HTMLDivElement>(null)

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
    if (tilt) {
      el.style.setProperty('--rx', `${((0.5 - y) * 6).toFixed(2)}deg`)
      el.style.setProperty('--ry', `${((x - 0.5) * 8).toFixed(2)}deg`)
    }
    rest.onPointerMove?.(e)
  }

  function onPointerLeave(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (el) {
      el.style.setProperty('--mx', '30%')
      el.style.setProperty('--my', '0%')
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }
    rest.onPointerLeave?.(e)
  }

  const classes = [
    'glass',
    variant !== 'default' && `glass--${variant}`,
    tilt && 'tilt',
    refract && 'refract',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const merged: CSSProperties = radius !== undefined ? { borderRadius: radius, ...style } : style ?? {}

  return (
    <div {...rest} ref={ref} className={classes} style={merged} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      {children}
    </div>
  )
}
