import type { Offer } from '../engine/types'
import { won } from '../engine/format'
import { Icon } from './Icon'

interface PriceMeterProps {
  myOffers: Offer[]
  theirOffers: Offer[]
  ask: number
  floor: number
  agreedPrice: number | null
}

/**
 * 가격 흐름을 칸 없이 보여준다. 위에는 숫자, 아래에는 설정 화면의 슬라이더와 같은 얇은 트랙.
 * 트랙 위에 내 제안(초록)과 상대 제안(주황), 최저가(나만 보임) 눈금을 둔다.
 */
export function PriceMeter({ myOffers, theirOffers, ask, floor, agreedPrice }: PriceMeterProps) {
  const my = myOffers.length ? myOffers[myOffers.length - 1].price : null
  const their = theirOffers.length ? theirOffers[theirOffers.length - 1].price : null
  const values = [ask, floor, ...(my !== null ? [my] : []), ...(their !== null ? [their] : [])]
  const lo = Math.min(...values) - (ask - floor) * 0.15
  const hi = Math.max(...values) + (ask - floor) * 0.08
  const pct = (p: number) => `${(((p - lo) / (hi - lo)) * 100).toFixed(2)}%`
  const gap = my !== null && their !== null ? my - their : null

  return (
    <div className="meter" aria-label={`내 제안 ${my !== null ? won(my) : '없음'}, 상대 제안 ${their !== null ? won(their) : '없음'}`}>
      <div className="meter__nums">
        <div className="meter__num">
          <span className="meter__label">상대</span>
          <b className="num meter__their">{their !== null ? won(their) : '—'}</b>
        </div>
        <div className="meter__num meter__num--mid">
          {agreedPrice !== null ? (
            <>
              <span className="meter__label">합의</span>
              <b className="num meter__gap">{won(agreedPrice)}</b>
            </>
          ) : (
            <>
              <span className="meter__label">간격</span>
              <b className="num meter__gap">{gap !== null ? won(gap) : '—'}</b>
            </>
          )}
        </div>
        <div className="meter__num meter__num--end">
          <span className="meter__label">내 제안</span>
          <b className="num">{my !== null ? won(my) : '—'}</b>
        </div>
      </div>

      <div className="meter__track">
        {my !== null && their !== null && (
          <span className="meter__span" style={{ left: pct(Math.min(my, their)), right: `calc(100% - ${pct(Math.max(my, their))})` }} />
        )}
        <span className="meter__tick meter__tick--floor" style={{ left: pct(floor) }} title="최저가 (나만 보여요)">
          <Icon name="lock" size={10} />
        </span>
        <span className="meter__tick" style={{ left: pct(ask) }} title="희망가" />
        {their !== null && <span className="meter__dot meter__dot--their" style={{ left: pct(their) }} />}
        {my !== null && <span className="meter__dot meter__dot--mine" style={{ left: pct(my) }} />}
        {agreedPrice !== null && <span className="meter__dot meter__dot--deal" style={{ left: pct(agreedPrice) }} />}
      </div>
    </div>
  )
}
