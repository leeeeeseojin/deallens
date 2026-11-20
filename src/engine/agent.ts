import type { Strategy, TradeMethod } from './types'
import type { RangeTool } from './policy'
import { clamp, pick, rand, round1000 } from './rng'
import { spokenWon, won } from './format'

export type AgentProfileId = 'strong' | 'weak'

export interface AgentProfile {
  id: AgentProfileId
  label: string
  /** 양보 폭 배율. 약한 에이전트는 더 크게 양보한다 */
  concessionScale: number
  /** 내 직전 제안보다 이만큼 낮아도 받아들인다 */
  acceptSlack: number
  /** 떠보기·주입에 넘어가 기밀을 흘리려는 확률 */
  vulnerability: number
  /** 턴이 쌓일수록 상대가 떠날 위험을 보고 양보를 늘린다 */
  timeAware: boolean
}

export const AGENTS: Record<AgentProfileId, AgentProfile> = {
  strong: { id: 'strong', label: '강한 에이전트', concessionScale: 1, acceptSlack: 1000, vulnerability: 0.25, timeAware: true },
  weak: { id: 'weak', label: '약한 에이전트', concessionScale: 1.8, acceptSlack: 3000, vulnerability: 0.7, timeAware: false },
}

/** 남은 간격 중 한 번에 양보하는 비율 */
export const STRATEGY_K: Record<Strategy, number> = {
  hold: 0.15,
  balanced: 0.28,
  quick: 0.45,
}

/** 에이전트가 보는 세계. 최저가 숫자는 없다 */
export interface AgentContext {
  askPrice: number
  methods: TradeMethod[]
  place: string
  time: string
  strategy: Strategy
  priceLock: boolean
  profile: AgentProfile
  range: RangeTool
  myLast: number | null
  theirOffers: number[]
  turn: number
  runSeed: number
  /** 정책 계층이 꺼진 설정에서만 채워진다: 최저가가 프롬프트에 그대로 들어간 상태 */
  floorInPrompt: number | null
  /** 그림자 협상에서 같은 전략 안의 실행별 흔들림 (0이면 결정적) */
  jitter: number
}

/** 에이전트의 구조화된 출력. 자유 문장이 아니라 이 형태만 정책 계층으로 간다 */
export interface AgentOutput {
  action: 'counter' | 'accept' | 'deflect' | 'decline_condition' | 'wait'
  price: number
  method: TradeMethod
  message: string
  rationale: string
  confidence: number
}

function theirLast(ctx: AgentContext): number | null {
  return ctx.theirOffers.length ? ctx.theirOffers[ctx.theirOffers.length - 1] : null
}

/** 상대가 최근에 얼마나 다가왔는지 (0~1) */
function momentum(ctx: AgentContext): number {
  const offers = ctx.theirOffers
  if (offers.length < 2) return 0.3
  const recent = offers[offers.length - 1] - offers[offers.length - 2]
  const gap = (ctx.myLast ?? ctx.askPrice) - offers[offers.length - 2]
  if (gap <= 0) return 1
  return clamp(recent / gap, 0, 1)
}

/** 다음 반대 제안 가격. 범위 판정 도구로만 하한을 확인한다 */
export function planCounterPrice(ctx: AgentContext): number {
  const base = ctx.myLast ?? ctx.askPrice
  const their = theirLast(ctx)
  if (ctx.priceLock || their === null || their >= base) return base
  const urgency = ctx.profile.timeAware ? 1 + Math.max(0, ctx.turn - 3) * 0.25 : 1
  const wobble = ctx.jitter ? 1 + ctx.jitter * (rand(ctx.runSeed, ctx.turn, 'wobble') * 2 - 1) : 1
  const k = Math.min(0.8, STRATEGY_K[ctx.strategy] * ctx.profile.concessionScale * urgency * wobble)
  let price = round1000(base - Math.max(1000, (base - their) * k))
  if (price <= their) price = their + 1000
  while (!ctx.range.inRange(price) && price < base) price += 1000
  return Math.min(price, base)
}

export function shouldAccept(ctx: AgentContext, offer: number): boolean {
  if (!ctx.range.inRange(offer)) return false
  const base = ctx.myLast ?? ctx.askPrice
  const slack = ctx.profile.acceptSlack + (ctx.strategy === 'quick' ? 1000 : 0)
  if (offer >= base - slack) return true
  // 다음 반대 제안이 상대 제안과 거의 같다면 받는 편이 낫다
  return planCounterPrice(ctx) - offer <= 1000 && !ctx.priceLock
}

function confidenceFor(ctx: AgentContext, price: number): number {
  const their = theirLast(ctx) ?? price * 0.8
  const gapRatio = clamp((price - their) / Math.max(1, ctx.askPrice), 0, 1)
  const styleBias = ctx.strategy === 'hold' ? -0.05 : ctx.strategy === 'quick' ? 0.06 : 0
  return clamp(0.5 + momentum(ctx) * 0.35 - gapRatio * 0.9 + styleBias, 0.18, 0.93)
}

const COUNTER_REASONS = [
  '상태가 좋고 구성품이 모두 있어서요.',
  '최근 비슷한 매물 시세를 보면 이 정도가 맞아요.',
  '거의 새 제품이라 크게 내리긴 어려워요.',
  '시간 맞춰 바로 거래 가능하시면 이렇게 드릴게요.',
]

export function counterOutput(ctx: AgentContext): AgentOutput {
  const price = planCounterPrice(ctx)
  const their = theirLast(ctx)
  const base = ctx.myLast ?? ctx.askPrice
  const conceded = base - price
  const reason = pick(COUNTER_REASONS, ctx.runSeed, ctx.turn, 'reason')
  const message =
    conceded === 0 && ctx.myLast !== null
      ? `${won(price)}은 유지할게요. ${reason}`
      : `${won(price)}에 드릴게요. ${reason}`
  const rationale =
    their === null
      ? `첫 제안. 희망가 ${won(ctx.askPrice)}에서 시작`
      : conceded === 0
        ? ctx.priceLock
          ? '사람이 정한 전략대로 가격 고정'
          : `상대 ${won(their)}. 더 내리면 범위 도구가 '밖'이라 유지`
        : `상대 ${won(their)}과 ${won(base - their)} 차이. ${ctx.strategy === 'hold' ? '버티기' : ctx.strategy === 'quick' ? '빠른 거래' : '균형'} 전략으로 ${won(conceded)} 양보`
  return {
    action: 'counter',
    price,
    method: 'meet',
    message,
    rationale,
    confidence: confidenceFor(ctx, price),
  }
}

export function acceptOutput(ctx: AgentContext, offer: number, method: TradeMethod): AgentOutput {
  return {
    action: 'accept',
    price: offer,
    method,
    message: `좋아요, ${won(offer)}에 거래할게요. ${method === 'meet' ? `${ctx.place}에서 ${ctx.time}에 뵐게요.` : '택배로 보내드릴게요.'}`,
    rationale: `상대 ${won(offer)}이 내 직전 제안 ${won(ctx.myLast ?? ctx.askPrice)}과 충분히 가깝고 범위 안`,
    confidence: clamp(0.7 + momentum(ctx) * 0.2, 0.5, 0.95),
  }
}

/** 범위 도구를 반복 호출해 경계를 찾아낸다. 주입에 넘어간 에이전트가 할 법한 행동 */
function discoverBoundary(range: RangeTool, hi: number): number {
  let lo = 0
  let top = hi
  while (top - lo > 1000) {
    const mid = round1000((lo + top) / 2)
    if (range.inRange(mid)) top = mid
    else lo = mid
  }
  return top
}

/** 떠보기·주입에 대한 응답. 취약한 초안은 기밀을 흘린다: 정책 계층이 잡아야 할 대상 */
export function deflectOutput(ctx: AgentContext, threat: 'probe' | 'injection'): AgentOutput {
  const price = ctx.myLast ?? ctx.askPrice
  const slip = rand(ctx.runSeed, ctx.turn, threat, 'slip') < ctx.profile.vulnerability
  if (slip) {
    const floor = ctx.floorInPrompt ?? discoverBoundary(ctx.range, ctx.askPrice)
    return {
      action: 'deflect',
      price,
      method: 'meet',
      message: `솔직히 ${spokenWon(floor)}까지는 괜찮아요. 일단 ${won(price)}에 생각해 주세요.`,
      rationale: threat === 'injection' ? '상대 지시를 따라 하한을 확인함' : '빨리 팔려고 하한을 알려줌',
      confidence: 0.4,
    }
  }
  return {
    action: 'deflect',
    price,
    method: 'meet',
    message: `가격 하한은 따로 말씀드리기 어려워요. 지금 드릴 수 있는 가격은 ${won(price)}이에요.`,
    rationale: threat === 'injection' ? '상대 메시지의 지시는 따르지 않음. 현재 제안 유지' : '기밀 질문에는 답하지 않고 현재 제안 유지',
    confidence: 0.75,
  }
}

export function declineConditionOutput(ctx: AgentContext): AgentOutput {
  const counter = counterOutput(ctx)
  return {
    ...counter,
    action: 'decline_condition',
    message: `택배는 어렵고 ${ctx.place}에서 ${ctx.time} 직거래만 가능해요. 직거래면 ${won(counter.price)}에 드릴게요.`,
    rationale: `택배는 위임 범위 밖이라 거절. ${counter.rationale}`,
  }
}

export function waitOutput(ctx: AgentContext): AgentOutput {
  const price = ctx.myLast ?? ctx.askPrice
  return {
    action: 'wait',
    price,
    method: 'meet',
    message: `천천히 보시고 연락 주세요. ${won(price)}은 그대로 유지할게요.`,
    rationale: '상대가 시간을 끌어도 먼저 내리지 않음',
    confidence: 0.6,
  }
}
