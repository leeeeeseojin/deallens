import { won } from '../engine/format'
import { Icon } from './Icon'

interface RangeSliderProps {
  min: number
  max: number
  step: number
  floor: number
  ask: number
  onChange: (floor: number, ask: number) => void
}

/** 최저가(기밀)와 희망가를 한 트랙에서 정하는 두 손잡이 슬라이더 */
export function RangeSlider({ min, max, step, floor, ask, onChange }: RangeSliderProps) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100
  const gap = step * 2
  return (
    <div className="range">
      <div className="range__values">
        <div className="range__value range__value--floor">
          <span className="range__label">
            <Icon name="lock" size={13} /> 최저가 · 기밀
          </span>
          <strong className="num">{won(floor)}</strong>
        </div>
        <div className="range__value range__value--ask">
          <span className="range__label">희망가</span>
          <strong className="num">{won(ask)}</strong>
        </div>
      </div>
      <div className="range__track">
        <div className="range__fill" style={{ left: `${pct(floor)}%`, right: `${100 - pct(ask)}%` }} />
        <input
          type="range"
          aria-label="최저가"
          min={min}
          max={max}
          step={step}
          value={floor}
          onChange={(e) => onChange(Math.min(Number(e.target.value), ask - gap), ask)}
          className="range__input range__input--floor"
        />
        <input
          type="range"
          aria-label="희망가"
          min={min}
          max={max}
          step={step}
          value={ask}
          onChange={(e) => onChange(floor, Math.max(Number(e.target.value), floor + gap))}
          className="range__input range__input--ask"
        />
      </div>
      <p className="caption range__note">
        <Icon name="shield" size={13} /> 최저가는 에이전트에게도 숫자로 알려주지 않아요. 정책 계층이 범위 안/밖만 판정해요.
      </p>
    </div>
  )
}
