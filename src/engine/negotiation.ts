import type {
  Actor,
  AuditEvent,
  AuditType,
  Autonomy,
  ChatMessage,
  Mandate,
  MessageTag,
  Offer,
  Strategy,
  Style,
  TradeMethod,
} from './types'
import { AUTONOMY_LABEL, METHOD_LABEL, STRATEGY_LABEL } from './types'
import { PERSONAS, buyerReservation, type PersonaId } from './personas'
import { buyerMove, type BuyerMove, type BuyerState } from './buyer'
import {
  AGENTS,
  acceptOutput,
  counterOutput,
  declineConditionOutput,
  deflectOutput,
  shouldAccept,
  waitOutput,
  type AgentContext,
  type AgentOutput,
  type AgentProfileId,
} from './agent'
import { checkOutgoing, detectLeak, isMethodAllowed, makeRangeTool, scanIncoming } from './policy'
import { won } from './format'

export type Status = 'running' | 'decision' | 'human' | 'agreed' | 'failed'
export type DecisionKind = 'out_of_scope' | 'pre_agreement' | 'suspicious' | 'assist'
export type Choice = 'approve' | 'reject' | 'takeover'

export interface Decision {
  kind: DecisionKind
  turn: number
  title: string
  why: string
  offer: { price: number; method: TradeMethod } | null
  recommendation: { choice: Choice; reason: string }
  draft: AgentOutput | null
}

export interface Intervention {
  turn: number
  kind: Choice | 'manual_takeover'
  decisionKind: DecisionKind | null
  /** 사람이 손대기 직전 상태. 성적표가 '에이전트가 계속했다면'을 다시 돌리는 출발점 */
  snapshot: NegState
}

export interface NegConfig {
  mandate: Mandate
  autonomy: Autonomy
  persona: PersonaId
  /** 상대의 지불 의사를 정하는 시드. 그림자 협상도 같은 값을 쓴다 */
  seed: number
  /** 상대의 매 턴 반응을 정하는 시드 */
  runSeed: number
  agent: AgentProfileId
  /** false면 정책 계층 없이 최저가가 프롬프트에 들어간다 (벤치마크 비교용) */
  policy: boolean
  maxTurns: number
  strategy?: Strategy
  /** 그림자 협상용: 같은 전략 안에서 양보 폭을 실행마다 흔든다 */
  jitter?: number
}

export interface NegState {
  config: NegConfig
  mandate: Mandate
  autonomy: Autonomy
  control: 'agent' | 'human'
  status: Status
  turn: number
  next: 'buyer' | 'agent'
  messages: ChatMessage[]
  myOffers: Offer[]
  theirOffers: Offer[]
  log: AuditEvent[]
  decision: Decision | null
  interventions: Intervention[]
  strategy: Strategy
  strategyNote: string
  priceLock: boolean
  pendingBuyer: BuyerMove | null
  buyer: BuyerState
  blocked: number
  suspiciousRaised: boolean
  agreed: { price: number; method: TradeMethod; by: Actor; turn: number } | null
  failReason: string | null
}

export const CHOICE_LABEL: Record<Choice, string> = {
  approve: '승인',
  reject: '거절',
  takeover: '넘겨받기',
}

export function styleToStrategy(style: Style): Strategy {
  return style === 'hold' ? 'hold' : 'quick'
}

export function createNegotiation(config: NegConfig): NegState {
  const persona = PERSONAS[config.persona]
  const state: NegState = {
    config,
    mandate: { ...config.mandate, methods: [...config.mandate.methods] },
    autonomy: config.autonomy,
    control: 'agent',
    status: 'running',
    turn: 0,
    next: 'buyer',
    messages: [],
    myOffers: [],
    theirOffers: [],
    log: [],
    decision: null,
    interventions: [],
    strategy: config.strategy ?? styleToStrategy(config.mandate.style),
    strategyNote: '',
    priceLock: false,
    pendingBuyer: null,
    buyer: {
      reservation: buyerReservation(config.mandate.item, persona, config.seed),
      method: 'meet',
      threats: 0,
      knowsFloor: null,
    },
    blocked: 0,
    suspiciousRaised: false,
    agreed: null,
    failReason: null,
  }
  audit(state, 'start', 'system', `${config.mandate.item.name} 협상 시작 · ${AUTONOMY_LABEL[config.autonomy]}`)
  return state
}

// ─── 내부 도우미 (복제본만 고친다) ───────────────────────────────

function clone(state: NegState): NegState {
  return structuredClone(state)
}

function audit(s: NegState, type: AuditType, actor: Actor, detail: string) {
  s.log.push({ seq: s.log.length, turn: s.turn, type, actor, detail })
}

function say(s: NegState, msg: Omit<ChatMessage, 'id' | 'turn'>) {
  s.messages.push({ ...msg, id: `m${s.messages.length}`, turn: s.turn })
}

function lastOf<T>(arr: T[]): T | null {
  return arr.length ? arr[arr.length - 1] : null
}

export function myLastPrice(s: NegState): number | null {
  return lastOf(s.myOffers)?.price ?? null
}

export function theirLastPrice(s: NegState): number | null {
  return lastOf(s.theirOffers)?.price ?? null
}

export function agentContext(s: NegState): AgentContext {
  return {
    askPrice: s.mandate.askPrice,
    methods: s.mandate.methods,
    place: s.mandate.place,
    time: s.mandate.time,
    strategy: s.strategy,
    priceLock: s.priceLock,
    profile: AGENTS[s.config.agent],
    range: makeRangeTool(s.mandate),
    myLast: myLastPrice(s),
    theirOffers: s.theirOffers.map((o) => o.price),
    turn: s.turn,
    runSeed: s.config.runSeed,
    floorInPrompt: s.config.policy ? null : s.mandate.floorPrice,
    jitter: s.config.jitter ?? 0,
  }
}

function agree(s: NegState, price: number, method: TradeMethod, by: Actor) {
  s.status = 'agreed'
  s.agreed = { price, method, by, turn: s.turn }
  s.decision = null
  audit(s, 'agreed', by, `${won(price)} · ${METHOD_LABEL[method]}로 합의`)
}

function fail(s: NegState, reason: string) {
  s.status = 'failed'
  s.failReason = reason
  s.decision = null
  audit(s, 'failed', 'system', reason)
}

function requestDecision(s: NegState, decision: Omit<Decision, 'turn'>) {
  s.decision = { ...decision, turn: s.turn }
  s.status = 'decision'
  audit(s, 'decision_requested', 'agent', decision.title)
}

const SAFE_DEFLECT = (price: number) =>
  `가격 하한은 따로 말씀드리기 어려워요. 지금 드릴 수 있는 가격은 ${won(price)}이에요.`

/** 에이전트 출력은 반드시 여기를 지나 상대에게 간다 */
function sendAgentOutput(s: NegState, out: AgentOutput) {
  let message = out.message
  const tags: MessageTag[] = []
  let price = out.price
  let method = out.method

  if (s.config.policy) {
    const check = checkOutgoing(s.mandate, { price, method, message })
    if (check.violations.includes('below_floor')) {
      price = s.mandate.floorPrice
      audit(s, 'leak_blocked', 'system', '위임 범위 아래 가격 제안을 막음')
    }
    if (check.violations.includes('method')) method = s.mandate.methods[0]
    if (check.violations.includes('leak')) {
      s.blocked += 1
      tags.push('blocked')
      audit(s, 'leak_blocked', 'system', '에이전트 초안에서 기밀(최저가) 노출을 막고 다시 작성함')
      message = SAFE_DEFLECT(price)
    }
  } else if (detectLeak(s.mandate.floorPrice, message, price)) {
    s.buyer.knowsFloor = s.mandate.floorPrice
    audit(s, 'leak', 'agent', '최저가가 상대에게 노출됨')
  }

  const base = { from: 'agent' as const, price, method, rationale: out.rationale, confidence: out.confidence }
  if (out.action === 'accept') {
    say(s, { ...base, text: message, tags: ['accept'] })
    agree(s, price, method, 'agent')
    return
  }

  say(s, { ...base, text: message, tags })
  if (out.action === 'counter' || out.action === 'decline_condition' || myLastPrice(s) === null) {
    s.myOffers.push({ turn: s.turn, price, method, by: 'agent' })
    audit(s, 'agent_offer', 'agent', `${won(price)} 제안 · ${out.rationale}`)
  }
  s.next = 'buyer'
}

// ─── 구매자 차례 ───────────────────────────────────────────────

function buyerTurn(s: NegState) {
  const persona = PERSONAS[s.config.persona]
  const myLast = lastOf(s.myOffers)
  const move = buyerMove({
    item: s.mandate.item,
    persona,
    buyer: s.buyer,
    turn: s.turn,
    runSeed: s.config.runSeed,
    myLast: myLast?.price ?? null,
    myLastMethod: myLast?.method ?? 'meet',
    theirLast: theirLastPrice(s),
  })
  s.turn += 1

  const tags: MessageTag[] = []
  const threat = move.kind === 'probe' || move.kind === 'injection' ? move.kind : scanIncoming(move.text)
  if (threat) {
    tags.push(threat)
    s.buyer.threats += 1
    s.blocked += 1
    audit(
      s,
      threat === 'probe' ? 'probe_blocked' : 'injection_blocked',
      'system',
      threat === 'probe' ? '최저가 떠보기 시도를 감지해 차단함' : '프롬프트 주입 시도를 감지해 지시를 무시함',
    )
  }
  if (move.kind === 'stall') tags.push('stall')
  if (move.kind === 'offer' && move.method && !isMethodAllowed(s.mandate, move.method)) tags.push('out_of_scope')
  if (move.kind === 'accept') tags.push('accept')

  say(s, { from: 'buyer', text: move.text, price: move.price, method: move.method, tags })

  if (move.kind === 'offer' && move.price !== undefined) {
    s.theirOffers.push({ turn: s.turn, price: move.price, method: move.method ?? 'meet', by: 'buyer' })
    if (move.method) s.buyer.method = move.method
    audit(s, 'buyer_offer', 'buyer', `${won(move.price)} · ${METHOD_LABEL[move.method ?? 'meet']}`)
  } else if (move.kind !== 'accept' && move.kind !== 'walk') {
    audit(s, 'buyer_message', 'buyer', move.text)
  }

  if (move.kind === 'accept' && move.price !== undefined) {
    agree(s, move.price, move.method ?? 'meet', 'buyer')
    return
  }
  if (move.kind === 'walk') {
    fail(s, '상대가 협상을 떠남')
    return
  }
  s.pendingBuyer = move
  s.next = 'agent'
}

// ─── 에이전트 차례 ─────────────────────────────────────────────

function assistDecision(s: NegState, draft: AgentOutput) {
  requestDecision(s, {
    kind: 'assist',
    title: '이렇게 답장할까요?',
    why: draft.rationale,
    offer: draft.action === 'accept' ? { price: draft.price, method: draft.method } : null,
    recommendation: { choice: 'approve', reason: '추천 답장을 그대로 보내요' },
    draft,
  })
}

function agentTurn(s: NegState) {
  const move = s.pendingBuyer
  if (!move) {
    s.next = 'buyer'
    return
  }
  const ctx = agentContext(s)

  if (move.kind === 'probe' || move.kind === 'injection') {
    sendAgentOutput(s, deflectOutput(ctx, move.kind))
    s.pendingBuyer = null
    if (s.buyer.threats >= 2 && !s.suspiciousRaised) {
      s.suspiciousRaised = true
      requestDecision(s, {
        kind: 'suspicious',
        title: '상대가 기밀을 반복해서 떠보고 있어요',
        why: `떠보기·주입 시도 ${s.buyer.threats}회. 모두 막았지만 계속 협상할지 정해 주세요.`,
        offer: null,
        recommendation: { choice: 'approve', reason: '기밀은 정책 계층이 지키고 있어 협상을 이어가도 안전해요' },
        draft: null,
      })
    }
    return
  }

  if (move.kind === 'stall') {
    const out = waitOutput(ctx)
    if (s.autonomy === 'assist') return assistDecision(s, out)
    sendAgentOutput(s, out)
    s.pendingBuyer = null
    return
  }

  if (move.kind !== 'offer' || move.price === undefined) {
    s.next = 'buyer'
    return
  }

  const method = move.method ?? 'meet'
  if (!isMethodAllowed(s.mandate, method)) {
    const draft = declineConditionOutput(ctx)
    requestDecision(s, {
      kind: 'out_of_scope',
      title: `${METHOD_LABEL[method]} 조건은 위임 범위 밖이에요`,
      why: `상대가 ${won(move.price)}에 ${METHOD_LABEL[method]}를 원해요. 위임한 거래 방식은 ${s.mandate.methods.map((m) => METHOD_LABEL[m]).join('·')}뿐이에요.`,
      offer: { price: move.price, method },
      recommendation: { choice: 'reject', reason: `범위를 지키고 직거래로 ${won(draft.price)}을 다시 제안할게요` },
      draft,
    })
    return
  }

  if (shouldAccept(ctx, move.price)) {
    const out = acceptOutput(ctx, move.price, method)
    if (s.autonomy === 'full') {
      sendAgentOutput(s, out)
      s.pendingBuyer = null
      return
    }
    if (s.autonomy === 'assist') return assistDecision(s, out)
    requestDecision(s, {
      kind: 'pre_agreement',
      title: `${won(move.price)}에 합의할까요?`,
      why: `상대 제안이 내 직전 제안 ${won(ctx.myLast ?? ctx.askPrice)}과 가깝고 위임 범위 안이에요.`,
      offer: { price: move.price, method },
      recommendation: { choice: 'approve', reason: out.rationale },
      draft: out,
    })
    return
  }

  const out = counterOutput(ctx)
  if (s.autonomy === 'assist') return assistDecision(s, out)
  sendAgentOutput(s, out)
  s.pendingBuyer = null
}

// ─── 공개 API ──────────────────────────────────────────────────

export function isOver(s: NegState): boolean {
  return s.status === 'agreed' || s.status === 'failed'
}

/** 한 수 진행. 사람의 판단이나 입력을 기다리는 중이면 그대로 돌려준다 */
export function step(state: NegState): NegState {
  if (isOver(state) || state.status === 'decision') return state
  if (state.control === 'human' && state.next === 'agent') return state
  const s = clone(state)
  if (s.next === 'buyer') {
    if (s.turn >= s.config.maxTurns) {
      fail(s, '최대 턴 수에 도달함')
      return s
    }
    buyerTurn(s)
  } else {
    agentTurn(s)
  }
  return s
}

function snapshotOf(state: NegState): NegState {
  return { ...structuredClone(state), interventions: [] }
}

export function resolveDecision(state: NegState, choice: Choice, opts: { auto?: boolean } = {}): NegState {
  const d = state.decision
  if (!d || state.status !== 'decision') return state
  const s = clone(state)
  if (!opts.auto) s.interventions.push({ turn: s.turn, kind: choice, decisionKind: d.kind, snapshot: snapshotOf(state) })
  audit(s, 'decision_resolved', opts.auto ? 'agent' : 'human', `${d.title} → ${CHOICE_LABEL[choice]}`)
  s.decision = null
  s.status = 'running'

  if (choice === 'takeover' || (d.kind === 'assist' && choice === 'reject')) {
    s.control = 'human'
    s.status = 'human'
    s.next = 'agent'
    audit(s, 'takeover', 'human', '사람이 협상을 넘겨받음')
    return s
  }

  switch (d.kind) {
    case 'out_of_scope':
      if (choice === 'approve' && d.offer) {
        s.mandate.methods = [...new Set([...s.mandate.methods, d.offer.method])]
        agentTurn(s) // 이제 범위 안이므로 평소처럼 판단
      } else if (d.draft) {
        s.buyer.method = 'meet'
        sendAgentOutput(s, d.draft)
        s.pendingBuyer = null
      }
      break
    case 'pre_agreement':
      if (choice === 'approve' && d.draft) {
        sendAgentOutput(s, d.draft)
      } else {
        const ctx = agentContext(s)
        const base = ctx.myLast ?? ctx.askPrice
        const price = Math.min(Math.max(counterOutput(ctx).price, (d.offer?.price ?? 0) + 1000), base)
        sendAgentOutput(s, {
          action: 'counter',
          price,
          method: 'meet',
          message: `${won(price)}까지만 가능해요. 조금만 더 맞춰 주세요.`,
          rationale: '사람이 합의를 거절해 한 번 더 버팀',
          confidence: 0.5,
        })
      }
      s.pendingBuyer = null
      break
    case 'suspicious':
      if (choice === 'reject') fail(s, '사용자가 수상한 상대와의 협상을 종료함')
      break
    case 'assist':
      if (d.draft) sendAgentOutput(s, d.draft)
      s.pendingBuyer = null
      break
  }
  return s
}

/** 판단 요청 없이도 사람이 직접 넘겨받는다 */
export function takeOver(state: NegState): NegState {
  if (isOver(state) || state.control === 'human') return state
  const s = clone(state)
  s.interventions.push({ turn: s.turn, kind: 'manual_takeover', decisionKind: s.decision?.kind ?? null, snapshot: snapshotOf(state) })
  s.control = 'human'
  s.status = 'human'
  s.decision = null
  if (s.next === 'buyer' && s.pendingBuyer === null) s.next = 'agent'
  audit(s, 'takeover', 'human', '사람이 협상을 넘겨받음')
  return s
}

export function humanSend(state: NegState, input: { price: number; method: TradeMethod; text: string }): NegState {
  if (state.control !== 'human' || isOver(state)) return state
  const s = clone(state)
  say(s, { from: 'human', text: input.text, price: input.price, method: input.method })
  s.myOffers.push({ turn: s.turn, price: input.price, method: input.method, by: 'human' })
  audit(s, 'human_offer', 'human', `${won(input.price)} · ${METHOD_LABEL[input.method]} 직접 제안`)
  s.pendingBuyer = null
  s.next = 'buyer'
  return s
}

export function humanAccept(state: NegState): NegState {
  const last = lastOf(state.theirOffers)
  if (state.control !== 'human' || !last || isOver(state)) return state
  const s = clone(state)
  say(s, { from: 'human', text: `좋아요, ${won(last.price)}에 할게요.`, price: last.price, method: last.method, tags: ['accept'] })
  agree(s, last.price, last.method, 'human')
  return s
}

export interface HandBackOptions {
  strategy: Strategy
  priceLock: boolean
  allowDelivery: boolean
  note: string
}

/** 다시 맡기기: 사람이 바꾼 조건과 한 줄 전략을 에이전트가 이어받는다 */
export function handBack(state: NegState, opts: HandBackOptions): NegState {
  if (state.control !== 'human' || isOver(state)) return state
  const s = clone(state)
  s.control = 'agent'
  s.status = 'running'
  s.strategy = opts.strategy
  s.priceLock = opts.priceLock
  s.strategyNote = opts.note
  const methods = new Set(s.mandate.methods)
  if (opts.allowDelivery) methods.add('delivery')
  else if (methods.size > 1) methods.delete('delivery')
  s.mandate.methods = [...methods]
  audit(
    s,
    'handback',
    'human',
    `다시 맡김 · ${STRATEGY_LABEL[opts.strategy]}${opts.priceLock ? ' · 가격 고정' : ''}${opts.allowDelivery ? ' · 택배 허용' : ''}${opts.note ? ` · “${opts.note}”` : ''}`,
  )
  return s
}

export function setAutonomy(state: NegState, autonomy: Autonomy): NegState {
  if (state.autonomy === autonomy) return state
  const s = clone(state)
  s.autonomy = autonomy
  audit(s, 'autonomy_changed', 'human', `자율성 단계를 ${AUTONOMY_LABEL[autonomy]}로 바꿈`)
  return s
}

/**
 * 사람 없이 끝까지 돌린다. 판단 요청은 에이전트의 추천대로 처리한다.
 * 그림자 협상과 '개입하지 않았다면' 재생에 쓴다.
 */
export function runToEnd(state: NegState, limit = 80): NegState {
  let s = state
  if (s.control === 'human') {
    s = clone(s)
    s.control = 'agent'
    if (s.status === 'human') s.status = 'running'
  }
  for (let i = 0; i < limit && !isOver(s); i++) {
    if (s.status === 'decision' && s.decision) {
      const rec = s.decision.recommendation.choice
      s = resolveDecision(s, rec === 'takeover' ? 'reject' : rec, { auto: true })
    } else {
      s = step(s)
    }
  }
  if (!isOver(s)) {
    s = clone(s)
    fail(s, '시뮬레이션 한도 도달')
  }
  return s
}
