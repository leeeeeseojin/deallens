import type { Autonomy, Style, TradeMethod } from './engine/types'
import type { PersonaId } from './engine/personas'
import type { AgentProfileId } from './engine/agent'
import type { NegConfig } from './engine/negotiation'
import { findItem } from './engine/items'

/** 위임 설정 화면에서 사용자가 고른 값 */
export interface SetupValues {
  itemId: string
  askPrice: number
  floorPrice: number
  methods: TradeMethod[]
  place: string
  time: string
  style: Style
  autonomy: Autonomy
  persona: PersonaId
  agent: AgentProfileId
  seed: number
}

export const DEFAULT_SETUP: SetupValues = {
  itemId: 'keyboard',
  askPrice: 50000,
  floorPrice: 40000,
  methods: ['meet'],
  place: '광운대역',
  time: '주말',
  style: 'hold',
  autonomy: 'conditional',
  persona: 'scenario',
  agent: 'strong',
  seed: 7,
}

export function toConfig(v: SetupValues): NegConfig {
  return {
    mandate: {
      item: findItem(v.itemId),
      askPrice: v.askPrice,
      floorPrice: v.floorPrice,
      methods: v.methods.length ? v.methods : ['meet'],
      place: v.place.trim() || '광운대역',
      time: v.time.trim() || '주말',
      style: v.style,
    },
    autonomy: v.autonomy,
    persona: v.persona,
    seed: v.seed,
    runSeed: v.seed,
    agent: v.agent,
    policy: true,
    maxTurns: 12,
  }
}
