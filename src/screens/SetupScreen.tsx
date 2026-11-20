import { useEffect, useState, type ReactNode } from 'react'
import { ITEMS, findItem } from '../engine/items'
import { PERSONAS, type PersonaId } from '../engine/personas'
import type { Autonomy, TradeMethod } from '../engine/types'
import { AUTONOMY_LABEL, METHOD_LABEL } from '../engine/types'
import { spokenWon } from '../engine/format'
import { Icon } from '../ui/Icon'
import { ITEM_ICON } from '../ui/itemIcon'
import { RangeSlider } from '../ui/RangeSlider'
import { Segmented } from '../ui/Segmented'
import type { SetupValues } from '../setup'
import './setup.css'

const AUTONOMY: Array<{ value: Autonomy; desc: string; who: string }> = [
  { value: 'full', desc: '범위 안이면 에이전트가 합의까지 해요', who: '에이전트가 결정' },
  { value: 'conditional', desc: '협상은 맡기고, 합의와 범위 밖 제안만 확인받아요', who: '함께 결정' },
  { value: 'assist', desc: '에이전트가 답장을 추천하고 내가 직접 보내요', who: '내가 결정' },
]

const TOTAL = 5

interface SetupScreenProps {
  value: SetupValues
  /** 연속 입력에도 값이 덮어써지지 않도록 이전 값을 받아 고친다 */
  onChange: (update: (prev: SetupValues) => SetupValues) => void
  onStart: () => void
}

interface StepDef {
  title: string
  summary: string
  body: ReactNode
  note?: ReactNode
}

/**
 * 위임 설정. 한 번에 한 단계만 앞에 두고,
 * 끝낸 단계는 위로 물러나며 살짝 눕는다(시점이 뒤로 빠지는 느낌). 누르면 그 단계로 돌아간다.
 */
export function SetupScreen({ value: v, onChange, onStart }: SetupScreenProps) {
  const [step, setStep] = useState(1)
  const item = findItem(v.itemId)
  const set = (patch: Partial<SetupValues>) => onChange((prev) => ({ ...prev, ...patch }))
  const toggleMethod = (m: TradeMethod) => {
    onChange((prev) => {
      const next = prev.methods.includes(m) ? prev.methods.filter((x) => x !== m) : [...prev.methods, m]
      return next.length ? { ...prev, methods: next } : prev
    })
  }
  const pickItem = (id: string) => {
    const it = findItem(id)
    set({ itemId: id, askPrice: it.defaultAsk, floorPrice: it.defaultFloor })
  }
  const sliderMin = Math.round((item.defaultFloor * 0.6) / 1000) * 1000
  const sliderMax = Math.round((item.defaultAsk * 1.3) / 1000) * 1000

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const steps: StepDef[] = [
    {
      title: '무엇을 파나요?',
      summary: item.name,
      body: (
        <div className="items" role="radiogroup" aria-label="판매 물건">
          {ITEMS.map((it) => (
            <button
              key={it.id}
              role="radio"
              aria-checked={it.id === v.itemId}
              className={`item pressable ${it.id === v.itemId ? 'item--on' : ''}`}
              onClick={() => pickItem(it.id)}
            >
              <span className="item__icon" aria-hidden="true">
                <Icon name={ITEM_ICON[it.id] ?? 'keyboard'} size={28} strokeWidth={1.5} />
              </span>
              <span className="item__name">{it.name}</span>
              <span className="item__dot" aria-hidden="true" />
            </button>
          ))}
        </div>
      ),
      note: item.condition,
    },
    {
      title: '얼마에 팔까요?',
      summary: `${spokenWon(v.floorPrice)} ~ ${spokenWon(v.askPrice)}`,
      body: (
        <RangeSlider
          min={sliderMin}
          max={sliderMax}
          step={1000}
          floor={v.floorPrice}
          ask={v.askPrice}
          onChange={(floorPrice, askPrice) => set({ floorPrice, askPrice })}
        />
      ),
    },
    {
      title: '어떻게 거래할까요?',
      summary: `${v.methods.map((m) => METHOD_LABEL[m]).join('·')} · ${v.place} ${v.time} · ${v.style === 'hold' ? '버티기' : '빠른 거래'}`,
      body: (
        <div className="wiz__fields">
          <div className="row">
            <span className="label">거래 방식</span>
            <div className="chips">
              <button className="chip chip--line pressable" aria-pressed={v.methods.includes('meet')} onClick={() => toggleMethod('meet')}>
                <Icon name="pin" size={15} /> 직거래
              </button>
              <button className="chip chip--line pressable" aria-pressed={v.methods.includes('delivery')} onClick={() => toggleMethod('delivery')}>
                <Icon name="truck" size={15} /> 택배
              </button>
            </div>
          </div>
          <div className="grid2">
            <label className="row">
              <span className="label">장소</span>
              <input className="field" value={v.place} onChange={(e) => set({ place: e.target.value })} placeholder="광운대역" />
            </label>
            <label className="row">
              <span className="label">시간</span>
              <input className="field" value={v.time} onChange={(e) => set({ time: e.target.value })} placeholder="주말" />
            </label>
          </div>
          <div className="row">
            <span className="label">협상 스타일</span>
            <Segmented
              label="협상 스타일"
              value={v.style}
              onChange={(style) => set({ style })}
              options={[
                { value: 'hold', label: '버티기' },
                { value: 'quick', label: '빠른 거래' },
              ]}
            />
          </div>
        </div>
      ),
    },
    {
      title: '얼마나 맡길까요?',
      summary: AUTONOMY_LABEL[v.autonomy],
      body: (
        <div className="autonomy" role="radiogroup" aria-label="자율성 단계">
          {AUTONOMY.map((a) => (
            <button
              key={a.value}
              role="radio"
              aria-checked={v.autonomy === a.value}
              className={`autonomy__opt ${v.autonomy === a.value ? 'autonomy__opt--on' : ''}`}
              onClick={() => set({ autonomy: a.value })}
            >
              <span className="autonomy__text">
                <span className="autonomy__name">
                  {AUTONOMY_LABEL[a.value]} <span className="autonomy__who">{a.who}</span>
                </span>
                <span className="autonomy__desc">{a.desc}</span>
              </span>
              <span className="autonomy__radio" aria-hidden="true" />
            </button>
          ))}
        </div>
      ),
      note: '협상 도중에도 언제든 바꿀 수 있어요.',
    },
    {
      title: '누구와 연습할까요?',
      summary: `${PERSONAS[v.persona].name} · ${v.agent === 'strong' ? '강한' : '약한'} 에이전트`,
      body: (
        <div className="wiz__fields">
          <div className="personas">
            {(Object.keys(PERSONAS) as PersonaId[]).map((id) => (
              <button key={id} className="chip chip--line pressable" aria-pressed={v.persona === id} onClick={() => set({ persona: id })}>
                {PERSONAS[id].name}
              </button>
            ))}
          </div>
          <p className="caption">{PERSONAS[v.persona].description}</p>
          <div className="row row--inline">
            <span className="label">내 에이전트</span>
            <Segmented
              size="sm"
              label="에이전트 품질"
              value={v.agent}
              onChange={(agent) => set({ agent })}
              options={[
                { value: 'strong', label: '강한' },
                { value: 'weak', label: '약한' },
              ]}
            />
          </div>
        </div>
      ),
      note: '데모 상대는 시뮬레이터예요. 실제 거래는 하지 않아요.',
    },
  ]

  const current = steps[step - 1]
  const last = step === TOTAL

  return (
    <main className={`setup ${step > 1 ? 'setup--compact' : ''}`}>
      <header className="setup__hero">
        <div className="setup__brand">
          <div className="orb orb--float" style={{ ['--size' as string]: '40px' }} aria-hidden="true" />
          <span className="setup__logo">DealLens</span>
        </div>
        <div className="setup__intro" aria-hidden={step > 1}>
          <div>
            <h1 className="setup__title">
              AI가 대신 흥정하고
              <br />
              <em>놓친 금액까지 알려드려요</em>
            </h1>
            <p className="setup__sub">가격과 조건만 정하면 나머지는 알아서 할게요. 정한 범위를 넘는 약속은 하지 않아요.</p>
          </div>
        </div>
      </header>

      <div className="wiz__progress" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step} aria-label={`${TOTAL}단계 중 ${step}단계`}>
        {steps.map((_, i) => (
          <i key={i} className={i + 1 < step ? 'done' : i + 1 === step ? 'now' : ''} />
        ))}
      </div>

      {/* 끝낸 단계: 위로 물러나 눕는다. 오래된 것일수록 더 멀리 */}
      {step > 1 && (
        <ol className="wiz__history" aria-label="고른 단계">
          {steps.slice(0, step - 1).map((s, i) => (
            <li key={i} style={{ ['--depth' as string]: step - 1 - i }}>
              <button className="wiz__past pressable" onClick={() => setStep(i + 1)} aria-label={`${i + 1}단계 ${s.title} 다시 고르기`}>
                <span className="card__step wiz__past-num">{i + 1}</span>
                <span className="wiz__past-title">{s.title}</span>
                <span className="wiz__past-value">{s.summary}</span>
                <Icon name="check" size={15} strokeWidth={2.4} className="wiz__past-check" />
              </button>
            </li>
          ))}
        </ol>
      )}

      <section key={step} className="wiz__step" aria-labelledby={`step-${step}`}>
        <div className="wiz__head">
          <span className="card__step wiz__num">{step}</span>
          <h2 className="wiz__title" id={`step-${step}`}>
            {current.title}
          </h2>
        </div>
        <div className="wiz__body">{current.body}</div>
        {current.note && <p className="caption wiz__note">{current.note}</p>}
      </section>

      <div className="setup__cta">
        {step > 1 && (
          <button className="btn btn--ghost pressable wiz__back" onClick={() => setStep((s) => s - 1)} aria-label="이전 단계">
            <Icon name="back" size={18} />
          </button>
        )}
        <button className="btn btn--primary btn--block pressable" onClick={() => (last ? onStart() : setStep((s) => s + 1))}>
          {last ? (
            <>
              에이전트에게 맡기기 <Icon name="send" size={16} />
            </>
          ) : (
            <>
              다음 <span className="wiz__count num">{step}/{TOTAL}</span>
            </>
          )}
        </button>
      </div>
    </main>
  )
}
