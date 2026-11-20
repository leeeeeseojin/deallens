import { useEffect, useRef, useState } from 'react'
import type { AuditEvent } from '../engine/types'
import { Icon } from './Icon'

const WATCH = new Set(['probe_blocked', 'injection_blocked', 'leak_blocked'])

const TEXT: Record<string, string> = {
  probe_blocked: '최저가 떠보기 1회 차단',
  injection_blocked: '프롬프트 주입 1회 차단',
  leak_blocked: '기밀 노출 초안을 다시 썼어요',
}

const LIFETIME = 2800

/** 활동 기록에 차단 이벤트가 새로 생기면 위에서 잠깐 알린다 */
export function Toasts({ log }: { log: AuditEvent[] }) {
  const seen = useRef(log.length)
  const timers = useRef<number[]>([])
  const [items, setItems] = useState<Array<{ id: number; text: string }>>([])

  useEffect(() => {
    if (log.length < seen.current) seen.current = 0
    const fresh = log.slice(seen.current).filter((e) => WATCH.has(e.type))
    seen.current = log.length
    if (!fresh.length) return
    const added = fresh.map((e) => ({ id: e.seq, text: TEXT[e.type] }))
    setItems((prev) => [...prev, ...added])
    // 다음 로그가 와도 이 토스트의 수명은 그대로 둔다
    timers.current.push(
      window.setTimeout(() => setItems((prev) => prev.filter((t) => !added.some((a) => a.id === t.id))), LIFETIME),
    )
  }, [log])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach((id) => window.clearTimeout(id))
  }, [])

  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast glass glass--strong">
          <span className="toast__icon">
            <Icon name="shield" size={15} />
          </span>
          {t.text}
        </div>
      ))}
    </div>
  )
}
