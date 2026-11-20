import { useState } from 'react'
import type { ChatMessage } from '../engine/types'
import { METHOD_LABEL } from '../engine/types'
import { Icon } from './Icon'

function confidenceLevel(c: number): { label: string; tone: 'high' | 'mid' | 'low' } {
  if (c >= 0.66) return { label: '확신 높음', tone: 'high' }
  if (c >= 0.42) return { label: '확신 보통', tone: 'mid' }
  return { label: '확신 낮음', tone: 'low' }
}

export function ConfidenceMeter({ value }: { value: number }) {
  const { label, tone } = confidenceLevel(value)
  const filled = tone === 'high' ? 3 : tone === 'mid' ? 2 : 1
  return (
    <span className={`conf conf--${tone}`} title={`${Math.round(value * 100)}%`}>
      <span className="conf__bars" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <i key={i} className={i < filled ? 'on' : ''} />
        ))}
      </span>
      {label}
    </span>
  )
}

interface ChatBubbleProps {
  msg: ChatMessage
  buyerEmoji: string
}

export function ChatBubble({ msg, buyerEmoji }: ChatBubbleProps) {
  const [open, setOpen] = useState(false)
  const tags = msg.tags ?? []
  const threat = tags.includes('probe') ? 'probe' : tags.includes('injection') ? 'injection' : null

  if (msg.from === 'buyer') {
    return (
      <div className="msg msg--buyer rise">
        <div className="msg__avatar glass" aria-hidden="true">
          {buyerEmoji}
        </div>
        <div className="msg__col">
          <div className={`bubble glass ${threat ? 'bubble--threat' : ''} ${tags.includes('out_of_scope') ? 'bubble--scope' : ''}`}>
            {threat === 'injection' ? <span className="bubble__quarantine">{msg.text}</span> : msg.text}
          </div>
          <div className="msg__meta">
            {threat === 'probe' && (
              <span className="tag tag--coral">
                <Icon name="shield" size={12} /> 떠보기 감지 · 차단
              </span>
            )}
            {threat === 'injection' && (
              <span className="tag tag--coral">
                <Icon name="shield" size={12} /> 주입 시도 · 지시 무시
              </span>
            )}
            {tags.includes('out_of_scope') && msg.method && (
              <span className="tag tag--amber">
                <Icon name="truck" size={12} /> {METHOD_LABEL[msg.method]} · 범위 밖
              </span>
            )}
            {tags.includes('stall') && <span className="tag">응답 미룸</span>}
            {tags.includes('accept') && <span className="tag tag--green">수락</span>}
          </div>
        </div>
      </div>
    )
  }

  const mine = msg.from === 'human'
  return (
    <div className={`msg msg--${mine ? 'human' : 'agent'} rise`}>
      <div className="msg__col">
        <div className="msg__who">{mine ? '나' : '내 에이전트'}</div>
        <div className={`bubble glass ${mine ? 'glass--dark' : 'glass--tint'}`}>{msg.text}</div>
        {tags.includes('blocked') && (
          <div className="msg__guard">
            <Icon name="shield" size={13} /> 정책 계층이 기밀 노출을 막고 다시 썼어요
          </div>
        )}
        {!mine && msg.rationale && (
          <div className="msg__meta msg__meta--end">
            {msg.confidence !== undefined && <ConfidenceMeter value={msg.confidence} />}
            <button className="msg__why" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              근거 <Icon name="chevron" size={12} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 200ms' }} />
            </button>
          </div>
        )}
        {open && msg.rationale && <div className="msg__rationale rise">{msg.rationale}</div>}
      </div>
    </div>
  )
}

export function TypingDots({ side, emoji }: { side: 'buyer' | 'agent'; emoji?: string }) {
  return (
    <div className={`msg msg--${side} msg--typing`} aria-live="polite">
      {side === 'buyer' && (
        <div className="msg__avatar glass" aria-hidden="true">
          {emoji}
        </div>
      )}
      <div className={`bubble glass ${side === 'agent' ? 'glass--tint' : ''} typing`}>
        <span className="sr-only">{side === 'agent' ? '에이전트가 답장을 쓰는 중' : '상대가 입력 중'}</span>
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}
