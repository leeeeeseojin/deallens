import type { Offer } from '../engine/types'
import { won } from '../engine/format'

interface PriceGapChartProps {
  myOffers: Offer[]
  theirOffers: Offer[]
  ask: number
  floor: number
  turn: number
  agreedPrice: number | null
}

const W = 320
const H = 138
const PAD = { l: 8, r: 52, t: 14, b: 18 }

/** 내 제안과 상대 제안이 좁혀지는 흐름. 최저가 선은 나에게만 보인다 */
export function PriceGapChart({ myOffers, theirOffers, ask, floor, turn, agreedPrice }: PriceGapChartProps) {
  const all = [ask, floor, ...myOffers.map((o) => o.price), ...theirOffers.map((o) => o.price)]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const span = Math.max(1000, hi - lo)
  const yMin = lo - span * 0.12
  const yMax = hi + span * 0.12
  const maxTurn = Math.max(4, turn + 1)
  const x = (t: number) => PAD.l + (t / maxTurn) * (W - PAD.l - PAD.r)
  const y = (p: number) => PAD.t + (1 - (p - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b)

  const stepPath = (offers: Offer[]) => {
    if (!offers.length) return ''
    let d = `M${x(offers[0].turn)},${y(offers[0].price)}`
    for (let i = 1; i < offers.length; i++) {
      d += ` H${x(offers[i].turn)} V${y(offers[i].price)}`
    }
    d += ` H${x(turn)}`
    return d
  }

  const myLast = myOffers[myOffers.length - 1]
  const theirLast = theirOffers[theirOffers.length - 1]
  const gap = myLast && theirLast ? myLast.price - theirLast.price : null

  return (
    <figure className="gap-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`가격 흐름. 내 제안 ${myLast ? won(myLast.price) : '없음'}, 상대 제안 ${theirLast ? won(theirLast.price) : '없음'}`}>
        <defs>
          <linearGradient id="gap-band" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#4f8a6a" stopOpacity="0.22" />
            <stop offset="1" stopColor="#d99a4e" stopOpacity="0.18" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* 희망가와 최저가 */}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(ask)} y2={y(ask)} className="gap-chart__ref" />
        <text x={W - PAD.r + 6} y={y(ask) + 4} className="gap-chart__reflabel">
          희망가
        </text>
        <line x1={PAD.l} x2={W - PAD.r} y1={y(floor)} y2={y(floor)} className="gap-chart__floor" />
        <text x={W - PAD.r + 6} y={y(floor) + 4} className="gap-chart__reflabel gap-chart__reflabel--floor">
          최저가🔒
        </text>

        {/* 남은 간격 */}
        {myLast && theirLast && !agreedPrice && (
          <rect
            x={x(Math.max(myLast.turn, theirLast.turn)) - 1}
            width={Math.max(2, x(turn) - x(Math.max(myLast.turn, theirLast.turn)) + 2)}
            y={y(myLast.price)}
            height={Math.max(1, y(theirLast.price) - y(myLast.price))}
            fill="url(#gap-band)"
            rx="4"
          />
        )}

        <path d={stepPath(theirOffers)} className="gap-chart__line gap-chart__line--their" />
        <path d={stepPath(myOffers)} className="gap-chart__line gap-chart__line--mine-glow" filter="url(#glow)" />
        <path d={stepPath(myOffers)} className="gap-chart__line gap-chart__line--mine" />

        {theirOffers.map((o, i) => (
          <circle key={`t${i}`} cx={x(o.turn)} cy={y(o.price)} r="3.2" className="gap-chart__dot gap-chart__dot--their" />
        ))}
        {myOffers.map((o, i) => (
          <circle key={`m${i}`} cx={x(o.turn)} cy={y(o.price)} r="3.6" className={`gap-chart__dot gap-chart__dot--${o.by === 'human' ? 'human' : 'mine'}`} />
        ))}

        {agreedPrice !== null && (
          <g>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(agreedPrice)} y2={y(agreedPrice)} className="gap-chart__deal" />
            <circle cx={x(turn)} cy={y(agreedPrice)} r="6" className="gap-chart__deal-dot" />
          </g>
        )}
      </svg>
      <figcaption className="gap-chart__legend">
        <span className="gap-chart__key gap-chart__key--mine">내 제안 {myLast && <b className="num">{won(myLast.price)}</b>}</span>
        <span className="gap-chart__key gap-chart__key--their">상대 {theirLast && <b className="num">{won(theirLast.price)}</b>}</span>
        {agreedPrice !== null ? (
          <span className="tag tag--green">합의 {won(agreedPrice)}</span>
        ) : (
          gap !== null && <span className="tag tag--amber num">간격 {won(gap)}</span>
        )}
      </figcaption>
    </figure>
  )
}
