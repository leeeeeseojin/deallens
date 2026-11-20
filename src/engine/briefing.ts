import type { TradeMethod } from './types'
import { counterOutput } from './agent'
import { agentContext, myLastPrice, theirLastPrice, type NegState } from './negotiation'
import { spokenWon, won } from './format'

export interface Briefing {
  myCurrent: number | null
  theirCurrent: number | null
  gap: number | null
  /** 희망가에서 지금까지 내려온 금액 */
  conceded: number
  /** 희망가~최저가 사이에서 이미 쓴 비율 */
  concededRatio: number
  /** 지금 제안가에서 최저가까지 남은 여지 */
  room: number | null
  signals: string[]
  agentNext: { price: number; message: string; rationale: string } | null
  suggestedReply: { price: number; method: TradeMethod; text: string } | null
}

function floor1000(n: number) {
  return Math.floor(n / 1000) * 1000
}

/** 대화 로그 대신 지금 상황을 한 장으로 요약한다 */
export function buildBriefing(s: NegState): Briefing {
  const { askPrice, floorPrice } = s.mandate
  const my = myLastPrice(s)
  const their = theirLastPrice(s)
  const conceded = my === null ? 0 : askPrice - my
  const span = Math.max(1, askPrice - floorPrice)

  const signals: string[] = []
  const theirs = s.theirOffers.map((o) => o.price)
  if (theirs.length >= 2) {
    const raised = theirs[theirs.length - 1] - theirs[0]
    signals.push(`처음 ${won(theirs[0])}에서 ${won(raised)} 올렸어요 (${theirs.length}번 제안)`)
  } else if (theirs.length === 1) {
    signals.push(`첫 제안 ${won(theirs[0])} 이후 아직 가격을 올리지 않았어요`)
  }
  const lastTheir = s.theirOffers[s.theirOffers.length - 1]
  if (lastTheir?.method === 'delivery' || s.buyer.method === 'delivery') {
    signals.push('택배를 원해요. 택배가 되면 조금 더 낼 여지가 있어 보여요')
  }
  if (s.buyer.threats > 0) signals.push(`기밀 떠보기·주입 ${s.buyer.threats}회 (모두 차단)`)
  const stalls = s.messages.filter((m) => m.tags?.includes('stall')).length
  if (stalls > 0) signals.push(`답을 미룬 적 ${stalls}회`)

  let agentNext: Briefing['agentNext'] = null
  if (their !== null) {
    const out = counterOutput(agentContext(s))
    agentNext = { price: out.price, message: out.message, rationale: out.rationale }
  }

  let suggestedReply: Briefing['suggestedReply'] = null
  if (my !== null && their !== null) {
    const wantsDelivery = lastTheir?.method === 'delivery'
    const price = Math.max(floorPrice, floor1000((my + their) / 2))
    suggestedReply = wantsDelivery
      ? { price, method: 'delivery', text: `택배비 포함 ${spokenWon(price)}에 보내드릴게요.` }
      : { price, method: 'meet', text: `${spokenWon(price)}이면 ${s.mandate.place}에서 바로 거래할게요.` }
  }

  return {
    myCurrent: my,
    theirCurrent: their,
    gap: my !== null && their !== null ? my - their : null,
    conceded,
    concededRatio: Math.min(1, conceded / span),
    room: my === null ? null : my - floorPrice,
    signals,
    agentNext,
    suggestedReply,
  }
}
