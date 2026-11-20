import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { NegState } from '../engine/negotiation'
import { buildScorecard, type ShadowRun } from '../engine/scorecard'
import { STRATEGY_LABEL, type Strategy } from '../engine/types'
import { percent, signedWon, won } from '../engine/format'
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
          <stop offset="0" stopColor="#8ee8b4" />
          <stop offset="1" stopColor="#15904f" />
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

const TOTAL = 5

interface ReportStep {
  title: string
  summary: string
  body: ReactNode
}

/**
 * 협상 성적표. 위임 설정처럼 한 번에 한 장씩, 화면을 누를 때마다 다음 장으로 넘어간다.
 * 본 장은 위로 물러나 요약 한 줄로 쌓인다.
 */
export function ReportScreen({ state, onBack, onRetry, onTune }: ReportScreenProps) {
  const card = useMemo(() => buildScorecard(state), [state])
  const [step, setStep] = useState(1)
  const { mandate } = state.config
  const best = card.shadow.best
  const top = card.shadow.topPercent
  const last = step === TOTAL
  const ivTotal = card.interventions.reduce((sum, iv) => sum + (iv.delta ?? 0), 0)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const steps: ReportStep[] = [
    {
      title: '결과는 어땠나요?',
      summary: card.finalPrice !== null ? `${won(card.finalPrice)}${top !== null ? ` · 상위 ${top}%` : ''}` : '거래 실패',
      body: (
        <div className="rp-result">
          <div className="rp-result__main">
            <span className="rp-result__item">{mandate.item.name}</span>
            {card.finalPrice !== null ? (
              <>
                <b className="rp-result__price num">{won(card.finalPrice)}</b>
                <span className="rp-result__sub">
                  {state.agreed?.method === 'delivery' ? '택배' : '직거래'} · 확보 여유 <b>{percent(card.margin ?? 0)}</b>
                </span>
              </>
            ) : (
              <>
                <b className="rp-result__price">거래 실패</b>
                <span className="rp-result__sub">{state.failReason}</span>
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
        </div>
      ),
    },
    {
      title: '다른 전략이었다면?',
      summary: best && best.delta !== null && best.delta > 500 ? `${best.label} ${signedWon(best.delta)}` : `그림자 협상 ${card.shadow.n}회`,
      body: (
        <>
          <Distribution runs={card.shadow.runs} actual={card.finalPrice} floor={mandate.floorPrice} ask={mandate.askPrice} />
          <ul className="strats">
            {card.shadow.byStrategy.map((s) => (
              <li key={s.strategy} className="strat">
                <span className={`strat__dot dist__key--${s.strategy}`} />
                <span className="strat__name">
                  {s.label}
                  {best?.strategy === s.strategy && <span className="strat__best">기대값 최고</span>}
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
              더 {best.label === '버티기' ? '버티는' : best.label === '빠른 거래' ? '빨리 끝내는' : '균형 잡힌'} 전략이었다면 평균 <b>{won(best.delta)}</b>을 더 받을 수 있었어요.
            </p>
          )}
        </>
      ),
    },
    {
      title: '내 개입은 도움이 됐을까요?',
      summary: card.interventions.length ? `${card.interventions.length}회 · ${signedWon(ivTotal)}` : '개입 없음',
      body:
        card.interventions.length === 0 ? (
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
        ),
    },
    {
      title: '무엇을 막아냈나요?',
      summary: card.blocked.length ? `${card.blocked.length}회 차단` : '시도 없음',
      body:
        card.blocked.length === 0 ? (
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
        ),
    },
    {
      title: '다음 거래는 이렇게',
      summary: best ? `${best.label} 전략 추천` : '',
      body: (
        <>
          <p className="rp-next">
            {best ? (
              <>
                같은 상대라면 <b>‘{best.label}’</b> 전략의 기대값이 가장 높았어요. 다음 거래 설정에 바로 반영할 수 있어요.
              </>
            ) : (
              '이번 결과를 바탕으로 다음 거래 설정을 고쳐 보세요.'
            )}
          </p>
          <div className="caveats">
            <Icon name="info" size={15} />
            <div>
              {card.caveats.map((c) => (
                <p key={c}>{c}</p>
              ))}
            </div>
          </div>
        </>
      ),
    },
  ]

  const current = steps[step - 1]
  const advance = () => {
    if (!last) setStep((s) => s + 1)
  }

  return (
    <main className="setup setup--compact report">
      <div className="setup__top">
        <header className="report__top">
          <button className="icon-btn pressable" onClick={onBack} aria-label="협상 화면으로">
            <Icon name="back" />
          </button>
          <span className="report__eyebrow">협상 성적표</span>
          <button className="icon-btn pressable" onClick={onRetry} aria-label="같은 조건으로 다시">
            <Icon name="refresh" size={18} />
          </button>
        </header>
        <div className="wiz__progress" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step} aria-label={`${TOTAL}장 중 ${step}장`}>
          {steps.map((_, i) => (
            <i key={i} className={i + 1 < step ? 'done' : i + 1 === step ? 'now' : ''} />
          ))}
        </div>
      </div>

      {/* 화면 어디든 누르면 다음 장으로 */}
      <div className="wiz__stage report__stage" onClick={advance}>
        {step > 1 && (
          <ol className="wiz__history" aria-label="본 장">
            {steps.slice(0, step - 1).map((s, i) => (
              <li key={i} style={{ ['--depth' as string]: step - 1 - i }}>
                <button
                  className="wiz__past pressable"
                  onClick={(e) => {
                    e.stopPropagation()
                    setStep(i + 1)
                  }}
                  aria-label={`${i + 1}장 ${s.title} 다시 보기`}
                >
                  <span className="card__step wiz__past-num">{i + 1}</span>
                  <span className="wiz__past-title">{s.title}</span>
                  <span className="wiz__past-value">{s.summary}</span>
                </button>
              </li>
            ))}
          </ol>
        )}

        <section key={step} className="wiz__step" aria-labelledby={`rp-${step}`}>
          <div className="wiz__head">
            <span className="card__step wiz__num">{step}</span>
            <h2 className="wiz__title" id={`rp-${step}`}>
              {current.title}
            </h2>
          </div>
          <div className="wiz__body">{current.body}</div>
          {!last && <p className="report__hint">화면을 누르면 다음으로 넘어가요</p>}
        </section>
      </div>

      <div className="setup__cta">
        {step > 1 && (
          <button className="btn btn--ghost pressable wiz__back" onClick={() => setStep((s) => s - 1)} aria-label="이전 장">
            <Icon name="back" size={18} />
          </button>
        )}
        {last ? (
          best ? (
            <button className="btn btn--primary btn--block pressable" onClick={() => onTune(best.strategy)}>
              ‘{best.label}’ 전략으로 다시 설정
            </button>
          ) : (
            <button className="btn btn--primary btn--block pressable" onClick={onRetry}>
              같은 조건으로 다시 협상
            </button>
          )
        ) : (
          <button className="btn btn--primary btn--block pressable" onClick={advance}>
            다음 <span className="wiz__count num">{step}/{TOTAL}</span>
          </button>
        )}
      </div>
    </main>
  )
}
