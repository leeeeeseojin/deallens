import { useState } from 'react'
import type { HandBackOptions } from '../engine/negotiation'
import type { Strategy } from '../engine/types'
import { Sheet } from '../ui/Sheet'
import { Segmented } from '../ui/Segmented'
import { Icon } from '../ui/Icon'

interface HandBackSheetProps {
  open: boolean
  initial: { strategy: Strategy; allowDelivery: boolean }
  onClose: () => void
  onConfirm: (opts: HandBackOptions) => void
}

const PRESETS = ['택배로 가되 가격은 고정', '조금 더 양보해도 괜찮아', '오늘 안에 빨리 팔아줘']

/** 다시 맡기기: 사람이 바꾼 조건과 한 줄 전략을 에이전트에게 넘긴다 */
export function HandBackSheet({ open, initial, onClose, onConfirm }: HandBackSheetProps) {
  const [strategy, setStrategy] = useState<Strategy>(initial.strategy)
  const [priceLock, setPriceLock] = useState(false)
  const [allowDelivery, setAllowDelivery] = useState(initial.allowDelivery)
  const [note, setNote] = useState('')

  function applyPreset(p: string) {
    setNote(p)
    if (p.includes('고정')) {
      setPriceLock(true)
      setStrategy('hold')
    }
    if (p.includes('택배')) setAllowDelivery(true)
    if (p.includes('양보')) {
      setPriceLock(false)
      setStrategy('balanced')
    }
    if (p.includes('빨리')) {
      setPriceLock(false)
      setStrategy('quick')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} eyebrow="다시 맡기기" title="에이전트가 이어받을 전략" labelledBy="handback-title">
      <div className="handback stagger">
        <label className="row">
          <span className="label">한 줄 전략</span>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 택배로 가되 가격은 고정" maxLength={40} />
        </label>
        <div className="chips">
          {PRESETS.map((p) => (
            <button key={p} className="chip glass pressable" aria-pressed={note === p} onClick={() => applyPreset(p)}>
              {p}
            </button>
          ))}
        </div>

        <div className="row">
          <span className="label">전략</span>
          <Segmented
            label="전략"
            value={strategy}
            onChange={setStrategy}
            options={[
              { value: 'hold', label: '버티기' },
              { value: 'balanced', label: '균형' },
              { value: 'quick', label: '빠른 거래' },
            ]}
          />
        </div>

        <div className="toggles">
          <button className="toggle glass pressable" role="switch" aria-checked={priceLock} onClick={() => setPriceLock((v) => !v)}>
            <Icon name="lock" size={17} />
            <span>
              <b>가격 고정</b>
              <span>지금 내 제안가에서 더 내리지 않아요</span>
            </span>
            <i className="toggle__knob" aria-hidden="true" />
          </button>
          <button className="toggle glass pressable" role="switch" aria-checked={allowDelivery} onClick={() => setAllowDelivery((v) => !v)}>
            <Icon name="truck" size={17} />
            <span>
              <b>택배 허용</b>
              <span>위임 범위에 택배를 더해요</span>
            </span>
            <i className="toggle__knob" aria-hidden="true" />
          </button>
        </div>

        <button className="btn btn--primary btn--block pressable" onClick={() => onConfirm({ strategy, priceLock, allowDelivery, note: note.trim() })}>
          <Icon name="bot" size={18} /> 다시 맡기기
        </button>
      </div>
    </Sheet>
  )
}
