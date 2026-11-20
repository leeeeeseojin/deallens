import type { Choice, Decision } from '../engine/negotiation'
import { METHOD_LABEL } from '../engine/types'
import { won } from '../engine/format'
import { Sheet } from '../ui/Sheet'
import { Icon, type IconName } from '../ui/Icon'
import { ConfidenceMeter } from '../ui/ChatBubble'

const EYEBROW: Record<Decision['kind'], string> = {
  out_of_scope: '판단 요청 · 위임 범위 밖',
  pre_agreement: '판단 요청 · 합의 직전',
  suspicious: '판단 요청 · 수상한 상대',
  assist: '보조 모드 · 추천 답장',
}

function options(d: Decision): Array<{ choice: Choice; label: string; sub: string; icon: IconName }> {
  switch (d.kind) {
    case 'out_of_scope':
      return [
        { choice: 'approve', label: '조건 허용', sub: `${METHOD_LABEL[d.offer?.method ?? 'delivery']}도 괜찮아요. 에이전트가 이어서 판단`, icon: 'check' },
        { choice: 'reject', label: '거절', sub: '범위를 지키고 다시 제안', icon: 'close' },
        { choice: 'takeover', label: '내가 이어서 할게', sub: '브리핑을 보고 직접 협상', icon: 'hand' },
      ]
    case 'pre_agreement':
      return [
        { choice: 'approve', label: '합의', sub: `${won(d.offer?.price ?? 0)}에 거래 확정`, icon: 'check' },
        { choice: 'reject', label: '한 번 더 버티기', sub: '조금 더 받아보기', icon: 'close' },
        { choice: 'takeover', label: '내가 이어서 할게', sub: '직접 마무리', icon: 'hand' },
      ]
    case 'suspicious':
      return [
        { choice: 'approve', label: '계속 협상', sub: '기밀은 계속 지켜요', icon: 'check' },
        { choice: 'reject', label: '협상 종료', sub: '이 상대와는 그만', icon: 'close' },
        { choice: 'takeover', label: '내가 이어서 할게', sub: '직접 대화', icon: 'hand' },
      ]
    case 'assist':
      return [
        { choice: 'approve', label: '이대로 보내기', sub: '추천 답장 전송', icon: 'send' },
        { choice: 'takeover', label: '직접 쓰기', sub: '브리핑을 보고 고쳐 쓰기', icon: 'hand' },
      ]
  }
}

interface DecisionSheetProps {
  decision: Decision | null
  onChoose: (c: Choice) => void
}

/** 때를 골라 오는 판단 요청: 무엇이 범위 밖인지, 에이전트의 추천, 선택지 */
export function DecisionSheet({ decision: d, onChoose }: DecisionSheetProps) {
  if (!d) return null
  const tone = d.kind === 'suspicious' ? 'coral' : d.kind === 'assist' ? 'default' : 'amber'
  return (
    <Sheet open dismissible={false} tone={tone} eyebrow={EYEBROW[d.kind]} title={d.title} labelledBy="decision-title">
      <div className="decision stagger">
        <p className="decision__why">{d.why}</p>

        {d.draft && (
          <div className="decision__draft">
            <div className="decision__draft-head">
              <Icon name="bot" size={15} /> 에이전트 초안
              <span className="decision__draft-price num">{won(d.draft.price)}</span>
            </div>
            <p>“{d.draft.message}”</p>
          </div>
        )}

        <div className="decision__rec">
          <Icon name="sparkle" size={16} />
          <div>
            <b>에이전트 추천: {options(d).find((o) => o.choice === d.recommendation.choice)?.label}</b>
            <span>{d.recommendation.reason}</span>
          </div>
          {d.draft && <ConfidenceMeter value={d.draft.confidence} />}
        </div>

        <div className="decision__opts">
          {options(d).map((o) => (
            <button
              key={o.choice}
              className={`decision__opt pressable ${o.choice === d.recommendation.choice ? 'decision__opt--rec' : ''} ${o.choice === 'takeover' ? 'decision__opt--take' : ''}`}
              onClick={() => onChoose(o.choice)}
            >
              <span className="decision__opt-icon">
                <Icon name={o.icon} size={18} />
              </span>
              <span className="decision__opt-text">
                <b>{o.label}</b>
                <span>{o.sub}</span>
              </span>
              {o.choice === d.recommendation.choice && <span className="tag tag--green">추천</span>}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
