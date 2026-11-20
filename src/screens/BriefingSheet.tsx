import type { Briefing } from '../engine/briefing'
import { METHOD_LABEL } from '../engine/types'
import { won } from '../engine/format'
import { Sheet } from '../ui/Sheet'
import { Icon } from '../ui/Icon'

interface BriefingSheetProps {
  open: boolean
  briefing: Briefing
  onClose: () => void
  onUseReply: (reply: NonNullable<Briefing['suggestedReply']>) => void
}

/** 인수인계 브리핑: 대화 로그를 처음부터 읽지 않아도 지금 상황을 이어받는다 */
export function BriefingSheet({ open, briefing: b, onClose, onUseReply }: BriefingSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} eyebrow="인수인계 브리핑" title="지금 상황, 한 장으로" labelledBy="briefing-title">
      <div className="brief stagger">
        <div className="brief__grid">
          <div className="brief__cell glass">
            <span className="brief__k">내 제안가</span>
            <b className="brief__v num">{b.myCurrent !== null ? won(b.myCurrent) : '—'}</b>
          </div>
          <div className="brief__cell glass">
            <span className="brief__k">상대 제안가</span>
            <b className="brief__v num brief__v--their">{b.theirCurrent !== null ? won(b.theirCurrent) : '—'}</b>
          </div>
          <div className="brief__cell glass">
            <span className="brief__k">양보한 폭</span>
            <b className="brief__v num">{won(b.conceded)}</b>
            <span className="brief__bar" aria-hidden="true">
              <i style={{ width: `${Math.round(b.concededRatio * 100)}%` }} />
            </span>
          </div>
          <div className="brief__cell glass">
            <span className="brief__k">
              남은 여지 <Icon name="lock" size={11} />
            </span>
            <b className="brief__v num">{b.room !== null ? won(b.room) : '—'}</b>
            <span className="brief__hint">최저가까지 · 나만 보여요</span>
          </div>
        </div>

        {b.signals.length > 0 && (
          <div className="brief__block">
            <h3 className="brief__h">상대가 보인 신호</h3>
            <ul className="brief__signals">
              {b.signals.map((s) => (
                <li key={s}>
                  <Icon name="eye" size={14} /> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {b.agentNext && (
          <div className="brief__block">
            <h3 className="brief__h">에이전트가 다음에 하려던 수</h3>
            <div className="brief__next glass glass--tint">
              <b className="num">{won(b.agentNext.price)} 반대 제안</b>
              <span>{b.agentNext.rationale}</span>
            </div>
          </div>
        )}

        {b.suggestedReply && (
          <div className="brief__block">
            <h3 className="brief__h">추천 답장</h3>
            <button className="brief__reply glass pressable" onClick={() => onUseReply(b.suggestedReply!)}>
              <span>
                “{b.suggestedReply.text}”
                <span className="brief__reply-meta">
                  {won(b.suggestedReply.price)} · {METHOD_LABEL[b.suggestedReply.method]}
                </span>
              </span>
              <span className="brief__reply-cta">
                쓰기 <Icon name="chevron" size={14} />
              </span>
            </button>
          </div>
        )}

        <button className="btn btn--dark btn--block pressable" onClick={onClose}>
          직접 협상하기
        </button>
      </div>
    </Sheet>
  )
}
