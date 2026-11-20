import { useState } from 'react'
import type { ChatMessage } from '../engine/types'
import { METHOD_LABEL } from '../engine/types'
import { Avatar } from './Avatar'

function confidenceLevel(c: number): { label: string; tone: 'high' | 'mid' | 'low' } {
  if (c >= 0.66) return { label: '확신 높음', tone: 'high' }
  if (c >= 0.42) return { label: '확신 보통', tone: 'mid' }
  return { label: '확신 낮음', tone: 'low' }
}

/** 확신 정도: 색 점 하나와 글자. 판단 요청 카드에서도 쓴다 */
export function ConfidenceMeter({ value }: { value: number }) {
  const { label, tone } = confidenceLevel(value)
  return (
    <span className={`conf conf--${tone}`} title={`${Math.round(value * 100)}%`}>
      <i aria-hidden="true" />
      {label}
    </span>
  )
}

interface ChatBubbleProps {
  msg: ChatMessage
  /** 상대 유형. 프로필 색을 정한다 */
  tone?: string
}

/** 메신저처럼 담백한 말풍선. 부가 정보는 색 박스 대신 회색 글자 한 줄로 */
export function ChatBubble({ msg, tone }: ChatBubbleProps) {
  const [open, setOpen] = useState(false)
  const tags = msg.tags ?? []
  const threat = tags.includes('probe') ? 'probe' : tags.includes('injection') ? 'injection' : null

  if (msg.from === 'buyer') {
    const notes: Array<{ text: string; tone?: 'warn' | 'alert' }> = []
    if (threat === 'probe') notes.push({ text: '최저가 떠보기 · 차단했어요', tone: 'alert' })
    if (threat === 'injection') notes.push({ text: '프롬프트 주입 · 지시를 무시했어요', tone: 'alert' })
    if (tags.includes('out_of_scope') && msg.method) notes.push({ text: `${METHOD_LABEL[msg.method]} · 위임 범위 밖`, tone: 'warn' })
    if (tags.includes('stall')) notes.push({ text: '답을 미뤘어요' })
    if (tags.includes('accept')) notes.push({ text: '수락했어요' })

    return (
      <div className="msg msg--buyer msg--in">
        <div className="msg__avatar" aria-hidden="true">
          <Avatar tone={tone} size={30} />
        </div>
        <div className="msg__col">
          <div className={`bubble ${threat ? 'bubble--threat' : ''}`}>
            {threat === 'injection' ? <span className="bubble__quarantine">{msg.text}</span> : msg.text}
          </div>
          {notes.length > 0 && (
            <div className="msg__meta">
              {notes.map((n) => (
                <span key={n.text} className={`msg__note ${n.tone ? `msg__note--${n.tone}` : ''}`}>
                  {n.text}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const mine = msg.from === 'human'
  return (
    <div className={`msg msg--${mine ? 'human' : 'agent'} msg--in`}>
      <div className="msg__col">
        <div className="msg__who">{mine ? '나' : '내 에이전트'}</div>
        <div className="bubble">{msg.text}</div>
        {(tags.includes('blocked') || (!mine && msg.rationale)) && (
          <div className="msg__meta msg__meta--end">
            {tags.includes('blocked') && <span className="msg__note msg__note--alert">기밀 노출을 막고 다시 썼어요</span>}
            {!mine && msg.confidence !== undefined && <ConfidenceMeter value={msg.confidence} />}
            {!mine && msg.rationale && (
              <button className="msg__why" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
                {open ? '근거 접기' : '근거 보기'}
              </button>
            )}
          </div>
        )}
        {open && msg.rationale && <div className="msg__rationale msg--in">{msg.rationale}</div>}
      </div>
    </div>
  )
}

export function TypingDots({ side, tone }: { side: 'buyer' | 'agent'; tone?: string }) {
  return (
    <div className={`msg msg--${side} msg--typing`} aria-live="polite">
      {side === 'buyer' && (
        <div className="msg__avatar" aria-hidden="true">
          <Avatar tone={tone} size={30} />
        </div>
      )}
      <div className="bubble typing">
        <span className="sr-only">{side === 'agent' ? '에이전트가 답장을 쓰는 중' : '상대가 입력 중'}</span>
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}
