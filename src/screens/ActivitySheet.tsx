import type { AuditEvent, AuditType } from '../engine/types'
import { Sheet } from '../ui/Sheet'
import { Icon, type IconName } from '../ui/Icon'

const META: Record<AuditType, { icon: IconName; tone: string }> = {
  start: { icon: 'flag', tone: 'muted' },
  buyer_offer: { icon: 'user', tone: 'their' },
  buyer_message: { icon: 'user', tone: 'their' },
  agent_offer: { icon: 'bot', tone: 'mine' },
  human_offer: { icon: 'hand', tone: 'human' },
  probe_blocked: { icon: 'shield', tone: 'block' },
  injection_blocked: { icon: 'shield', tone: 'block' },
  leak_blocked: { icon: 'shield', tone: 'block' },
  leak: { icon: 'eyeOff', tone: 'block' },
  decision_requested: { icon: 'info', tone: 'ask' },
  decision_resolved: { icon: 'check', tone: 'human' },
  takeover: { icon: 'hand', tone: 'human' },
  handback: { icon: 'bot', tone: 'mine' },
  autonomy_changed: { icon: 'gauge', tone: 'human' },
  agreed: { icon: 'check', tone: 'mine' },
  failed: { icon: 'close', tone: 'block' },
}

/** 감사 로그: 모든 상태 변화가 남는다. 성적표와 벤치마크도 이 기록을 읽는다 */
export function ActivitySheet({ open, log, onClose }: { open: boolean; log: AuditEvent[]; onClose: () => void }) {
  const blocked = log.filter((e) => e.type.endsWith('_blocked')).length
  return (
    <Sheet open={open} onClose={onClose} eyebrow={`감사 로그 · 차단 ${blocked}회`} title="활동 기록" labelledBy="activity-title">
      <ol className="activity">
        {[...log].reverse().map((e) => (
          <li key={e.seq} className={`activity__row activity__row--${META[e.type].tone}`}>
            <span className="activity__icon">
              <Icon name={META[e.type].icon} size={14} />
            </span>
            <span className="activity__text">{e.detail}</span>
            <span className="activity__turn num">{e.turn}턴</span>
          </li>
        ))}
      </ol>
    </Sheet>
  )
}
