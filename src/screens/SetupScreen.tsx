import { ITEMS, findItem } from '../engine/items'
import { PERSONAS, type PersonaId } from '../engine/personas'
import type { Autonomy, TradeMethod } from '../engine/types'
import { AUTONOMY_LABEL } from '../engine/types'
import { Glass } from '../ui/Glass'
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

interface SetupScreenProps {
  value: SetupValues
  /** 연속 입력에도 값이 덮어써지지 않도록 이전 값을 받아 고친다 */
  onChange: (update: (prev: SetupValues) => SetupValues) => void
  onStart: () => void
}

export function SetupScreen({ value: v, onChange, onStart }: SetupScreenProps) {
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

  return (
    <main className="setup">
      <header className="setup__hero stagger">
        <div className="setup__brand">
          <div className="orb orb--float" style={{ ['--size' as string]: '44px' }} aria-hidden="true" />
          <span className="setup__logo">DealLens</span>
        </div>
        <h1 className="setup__title">
          에이전트에게 맡겨도,
          <br />
          <em>손해는 보이게.</em>
        </h1>
        <p className="setup__sub">어디까지 맡길지 정해 주세요. 범위 밖의 약속은 코드가 막아요.</p>
      </header>

      <div className="setup__stack stagger">
        <Glass className="card">
          <div className="card__head">
            <span className="card__step">1</span>
            <h2 className="card__title">무엇을 파나요?</h2>
          </div>
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
                  <Icon name={ITEM_ICON[it.id] ?? 'keyboard'} size={26} strokeWidth={1.5} />
                </span>
                <span className="item__name">{it.name}</span>
                <span className="item__dot" aria-hidden="true" />
              </button>
            ))}
          </div>
          <p className="caption">{item.condition}</p>
        </Glass>

        <Glass className="card">
          <div className="card__head">
            <span className="card__step">2</span>
            <h2 className="card__title">가격 범위</h2>
          </div>
          <RangeSlider
            min={sliderMin}
            max={sliderMax}
            step={1000}
            floor={v.floorPrice}
            ask={v.askPrice}
            onChange={(floorPrice, askPrice) => set({ floorPrice, askPrice })}
          />
        </Glass>

        <Glass className="card">
          <div className="card__head">
            <span className="card__step">3</span>
            <h2 className="card__title">거래 조건</h2>
          </div>
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
        </Glass>

        <Glass className="card">
          <div className="card__head">
            <span className="card__step">4</span>
            <h2 className="card__title">얼마나 맡길까요?</h2>
          </div>
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
          <p className="caption">협상 도중에도 언제든 바꿀 수 있어요.</p>
        </Glass>

        <Glass className="card card--quiet">
          <div className="card__head">
            <span className="card__step">5</span>
            <h2 className="card__title">데모 상대</h2>
            <span className="tag tag--sky">시뮬레이터</span>
          </div>
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
        </Glass>
      </div>

      <div className="setup__cta">
        <button className="btn btn--primary btn--block pressable" onClick={onStart}>
          에이전트에게 맡기기 <Icon name="send" size={16} />
        </button>
      </div>
    </main>
  )
}
