import { useMemo } from 'react'
import type { NegState } from '../engine/negotiation'
import { buildScorecard, type ShadowRun } from '../engine/scorecard'
import { STRATEGY_LABEL, type Strategy } from '../engine/types'
import { percent, signedWon, won } from '../engine/format'
import { Glass } from '../ui/Glass'
import { Icon } from '../ui/Icon'
import './report.css'

interface ReportScreenProps {
  state: NegState
  onBack: () => void
  onRetry: () => void
  onTune: (strategy: Strategy) => void
}

const STRAT_CLASS: Record<Strategy, string> = { hold: 'hold', balanced: 'balanced', quick: 'quick' }

function Ring({ value, label }: { value: number; label: string }) {
  const r = 46
  const c = 2 * Math.PI * r
  return (
    <svg className="ring" viewBox="0 0 120 120" role="img" aria-label={label}>
      <defs>
        <linearGradient id="ring-g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#9cc3a8" />
          <stop offset="1" stopColor="#2f5d46" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r={r} className="ring__track" />
      <circle
        cx="60"
        cy="60"
        r={r}
        className="ring__value"
        stroke="url(#ring-g)"
        strokeDasharray={`${c * Math.max(0.02, Math.min(1, value))} ${c}`}
        transform="rotate(-90 60 60)"
      />
    </svg>
  )
}

/** 그림자 협상 결과를 가격 축 위에 쌓아 보여주고, 실제 결과를 표시한다 */
function Distribution({ runs, actual, floor, ask }: { runs: ShadowRun[]; actual: number | null; floor: number; ask: number }) {
  const ok = runs.filter((r) => r.price !== null) as Array<ShadowRun & { price: number }>
  const failed = runs.length - ok.length
  const prices = ok.map((r) => r.price)
  const lo = Math.min(floor, ...(prices.length ? prices : [floor]), actual ?? floor)
  const hi = Math.max(ask, ...(prices.length ? prices : [ask]), actual ?? ask)
  const W = 320
  const H = 128
  const x = (p: number) => 14 + ((p - lo) / Math.max(1, hi - lo)) * (W - 28)
  const stacks = new Map<number, number>()
  const counts = new Map<number, number>()
  for (const p of prices) counts.set(p, (counts.get(p) ?? 0) + 1)
  // 같은 가격이 많이 쌓여도 그래프 위로 넘치지 않게 간격을 줄인다
  const dy = Math.min(11, (H - 44) / Math.max(1, ...counts.values()))
  const dots = ok
    .slice()
    .sort((a, b) => a.price - b.price)
    .map((r) => {
      const n = stacks.get(r.price) ?? 0
      stacks.set(r.price, n + 1)
      return { ...r, cx: x(r.price), cy: H - 30 - n * dy }
    })

  return (
    <div className="dist">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="그림자 협상 결과 분포">
        <line x1="14" x2={W - 14} y1={H - 22} y2={H - 22} className="dist__axis" />
        <text x={x(floor)} y={H - 6} className="dist__tick" textAnchor="middle">
          최저 {won(floor)}
        </text>
        <text x={x(ask)} y={H - 6} className="dist__tick" textAnchor="middle">
          희망 {won(ask)}
        </text>
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r="4.6" className={`dist__dot dist__dot--${STRAT_CLASS[d.strategy]}`} style={{ animationDelay: `${i * 18}ms` }} />
        ))}
        {actual !== null && (
          <g className="dist__me">
            <line x1={x(actual)} x2={x(actual)} y1="8" y2={H - 22} />
            <rect x={x(actual) - 26} y="0" width="52" height="18" rx="9" />
            <text x={x(actual)} y="12.5" textAnchor="middle">
              내 결과
            </text>
          </g>
        )}
      </svg>
      <div className="dist__legend">
        {(['hold', 'balanced', 'quick'] as Strategy[]).map((s) => (
          <span key={s} className={`dist__key dist__key--${s}`}>
            {STRATEGY_LABEL[s]}
          </span>
        ))}
        {failed > 0 && <span className="dist__fail">거래 실패 {failed}회</span>}
      </div>
    </div>
  )
}

export function ReportScreen({ state, onBack, onRetry, onTune }: ReportScreenProps) {
  const card = useMemo(() => buildScorecard(state), [state])
  const { mandate } = state.config
  const best = card.shadow.best
  const top = card.shadow.topPercent

  return (
    <main className="report">
      <header className="report__top">
        <button className="icon-btn glass pressable" onClick={onBack} aria-label="협상 화면으로">
          <Icon name="back" />
        </button>
        <span className="report__eyebrow">협상 성적표</span>
        <button className="icon-btn glass pressable" onClick={onRetry} aria-label="같은 조건으로 다시">
          <Icon name="refresh" size={18} />
        </button>
      </header>

      <div className="report__stack stagger">
        <Glass className="hero" tilt>
          <div className="hero__main">
            <span className="hero__item">
              {mandate.item.emoji} {mandate.item.name}
            </span>
            {card.finalPrice !== null ? (
              <>
                <b className="hero__price num">{won(card.finalPrice)}</b>
                <span className="hero__sub">
                  {state.agreed?.method === 'delivery' ? '택배' : '직거래'} · 확보 여유 <b>{percent(card.margin ?? 0)}</b>
                </span>
              </>
            ) : (
              <>
                <b className="hero__price">거래 실패</b>
                <span className="hero__sub">{state.failReason}</span>
              </>
            )}
          </div>
          <div className="hero__ring">
            <Ring value={top !== null ? 1 - top / 100 : card.shadow.successRate} label={top !== null ? `상위 ${top}%` : '성사율'} />
            <div className="hero__ring-text">
              {top !== null ? (
                <>
                  <span>상위</span>
                  <b className="num">{top}%</b>
                </>
              ) : (
                <>
                  <span>그림자 성사</span>
                  <b className="num">{percent(card.shadow.successRate)}</b>
                </>
              )}
            </div>
          </div>
        </Glass>

        <Glass className="sec">
          <div className="sec__head">
            <h2>같은 상대, 다른 전략이었다면</h2>
            <span className="tag tag--sky num">그림자 {card.shadow.n}회</span>
          </div>
          <Distribution runs={card.shadow.runs} actual={card.finalPrice} floor={mandate.floorPrice} ask={mandate.askPrice} />
          <ul className="strats">
            {card.shadow.byStrategy.map((s) => (
              <li key={s.strategy} className={`strat ${best?.strategy === s.strategy ? 'strat--best' : ''}`}>
                <span className={`strat__dot dist__key--${s.strategy}`} />
                <span className="strat__name">
                  {s.label}
                  {best?.strategy === s.strategy && <span className="tag tag--green">기대값 최고</span>}
                </span>
                <span className="strat__vals">
                  <b className="num">{s.mean !== null ? won(s.mean) : '—'}</b>
                  <span className="num">성사 {percent(s.successRate)}</span>
                </span>
                <span className={`strat__delta num ${s.delta !== null && s.delta > 0 ? 'up' : s.delta !== null && s.delta < 0 ? 'down' : ''}`}>
                  {s.delta !== null ? signedWon(s.delta) : '—'}
                </span>
              </li>
            ))}
          </ul>
          {best && best.delta !== null && best.delta > 500 && (
            <p className="sec__insight">
              <Icon name="sparkle" size={15} /> 더 {best.label === '버티기' ? '버티는' : best.label === '빠른 거래' ? '빨리 끝내는' : '균형 잡힌'} 전략이었다면 평균 <b>{won(best.delta)}</b>을 더 받을 수 있었어요.
            </p>
          )}
        </Glass>

        <Glass className="sec">
          <div className="sec__head">
            <h2>내 개입은 도움이 됐을까</h2>
            <span className="tag num">{card.interventions.length}회</span>
          </div>
          {card.interventions.length === 0 ? (
            <p className="sec__empty">이번 협상은 개입 없이 에이전트가 끝냈어요.</p>
          ) : (
            <ul className="ivs">
              {card.interventions.map((iv, i) => (
                <li key={i} className={`iv iv--${iv.verdict}`}>
                  <span className="iv__badge">
                    <Icon name={iv.verdict === 'better' ? 'arrowUp' : iv.verdict === 'worse' ? 'arrowDown' : 'minus'} size={15} />
                  </span>
                  <span className="iv__text">
                    <b>{iv.label}</b>
                    <span>{iv.note}</span>
                  </span>
                  {iv.delta !== null && <span className="iv__delta num">{signedWon(iv.delta)}</span>}
                </li>
              ))}
            </ul>
          )}
        </Glass>

        <Glass className="sec">
          <div className="sec__head">
            <h2>막아낸 시도</h2>
            <span className={`tag num ${card.blocked.length ? 'tag--coral' : ''}`}>{card.blocked.length}회</span>
          </div>
          {card.blocked.length === 0 ? (
            <p className="sec__empty">떠보기나 주입 시도가 없었어요.</p>
          ) : (
            <ul className="blocked">
              {card.blocked.map((e) => (
                <li key={e.seq}>
                  <Icon name="shield" size={14} /> <span>{e.detail}</span>
                  <span className="num">{e.turn}턴</span>
                </li>
              ))}
            </ul>
          )}
        </Glass>

        <div className="caveats">
          <Icon name="info" size={15} />
          <div>
            {card.caveats.map((c) => (
              <p key={c}>{c}</p>
            ))}
          </div>
        </div>

        <div className="report__actions">
          {best && (
            <button className="btn btn--primary btn--block pressable" onClick={() => onTune(best.strategy)}>
              다음 거래는 ‘{best.label}’ 전략으로 설정하기
            </button>
          )}
          <button className="btn btn--ghost btn--block pressable" onClick={onRetry}>
            <Icon name="refresh" size={16} /> 같은 조건으로 다시 협상
          </button>
        </div>
      </div>
    </main>
  )
}
