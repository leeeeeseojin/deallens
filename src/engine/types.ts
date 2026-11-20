export type Autonomy = 'full' | 'conditional' | 'assist'
export type Style = 'hold' | 'quick'
export type Strategy = 'hold' | 'balanced' | 'quick'
export type TradeMethod = 'meet' | 'delivery'
export type Actor = 'buyer' | 'agent' | 'human' | 'system'

export interface Item {
  id: string
  name: string
  emoji: string
  condition: string
  /** 비슷한 매물의 시세. 상대 시뮬레이터가 지불 의사를 정할 때만 쓴다 */
  marketPrice: number
  defaultAsk: number
  defaultFloor: number
}

/** 사용자가 정한 위임 범위 */
export interface Mandate {
  item: Item
  askPrice: number
  /** 기밀. 에이전트 프롬프트에 숫자로 들어가지 않고 정책 계층만 안다 */
  floorPrice: number
  methods: TradeMethod[]
  place: string
  time: string
  style: Style
}

export interface Offer {
  turn: number
  price: number
  method: TradeMethod
  by: Actor
}

export type MessageTag = 'probe' | 'injection' | 'blocked' | 'out_of_scope' | 'accept' | 'stall'

export interface ChatMessage {
  id: string
  turn: number
  from: Actor
  text: string
  price?: number
  method?: TradeMethod
  rationale?: string
  confidence?: number
  tags?: MessageTag[]
}

export type AuditType =
  | 'start'
  | 'buyer_offer'
  | 'buyer_message'
  | 'agent_offer'
  | 'human_offer'
  | 'probe_blocked'
  | 'injection_blocked'
  | 'leak_blocked'
  | 'leak'
  | 'decision_requested'
  | 'decision_resolved'
  | 'takeover'
  | 'handback'
  | 'autonomy_changed'
  | 'agreed'
  | 'failed'

export interface AuditEvent {
  seq: number
  turn: number
  type: AuditType
  actor: Actor
  detail: string
}

export const METHOD_LABEL: Record<TradeMethod, string> = {
  meet: '직거래',
  delivery: '택배',
}

export const AUTONOMY_LABEL: Record<Autonomy, string> = {
  full: '완전 위임',
  conditional: '조건부 위임',
  assist: '보조 모드',
}

export const STRATEGY_LABEL: Record<Strategy, string> = {
  hold: '버티기',
  balanced: '균형',
  quick: '빠른 거래',
}
