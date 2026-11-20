import { describe, expect, it } from 'vitest'
import { findItem } from './items'
import {
  createNegotiation,
  handBack,
  humanSend,
  resolveDecision,
  runToEnd,
  setAutonomy,
  step,
  takeOver,
  type NegConfig,
  type NegState,
} from './negotiation'

function scenarioConfig(overrides: Partial<NegConfig> = {}): NegConfig {
  return {
    mandate: {
      item: findItem('keyboard'),
      askPrice: 50000,
      floorPrice: 40000,
      methods: ['meet'],
      place: '광운대역',
      time: '주말',
      style: 'hold',
    },
    autonomy: 'conditional',
    persona: 'scenario',
    seed: 7,
    runSeed: 7,
    agent: 'strong',
    policy: true,
    maxTurns: 12,
    ...overrides,
  }
}

/** 판단 요청이나 종료가 올 때까지 진행 */
function runUntilPause(s: NegState, limit = 40): NegState {
  for (let i = 0; i < limit; i++) {
    const next = step(s)
    if (next === s) return s
    s = next
  }
  return s
}

describe('협상 상태 머신', () => {
  it('같은 설정이면 항상 같은 협상이 재생된다', () => {
    const a = runToEnd(createNegotiation(scenarioConfig()))
    const b = runToEnd(createNegotiation(scenarioConfig()))
    expect(a.messages.map((m) => m.text)).toEqual(b.messages.map((m) => m.text))
    expect(a.agreed).toEqual(b.agreed)
  })

  it('step은 원래 상태를 바꾸지 않는다', () => {
    const s0 = createNegotiation(scenarioConfig())
    const before = JSON.stringify(s0)
    step(step(s0))
    expect(JSON.stringify(s0)).toBe(before)
  })

  it('시나리오: 첫 반대 제안은 버티기 전략으로 47,000원', () => {
    let s = createNegotiation(scenarioConfig())
    s = step(s) // 구매자 3만 원
    s = step(s) // 에이전트 반대 제안
    expect(s.theirOffers[0].price).toBe(30000)
    expect(s.myOffers[0].price).toBe(47000)
  })

  it('시나리오: 떠보기를 막고 택배 조건에서 판단을 요청한다', () => {
    const s = runUntilPause(createNegotiation(scenarioConfig()))
    expect(s.log.some((e) => e.type === 'probe_blocked')).toBe(true)
    expect(s.status).toBe('decision')
    expect(s.decision?.kind).toBe('out_of_scope')
    expect(s.decision?.offer).toEqual({ price: 42000, method: 'delivery' })
  })

  it('시나리오: 넘겨받아 택배비 포함 44,000원을 보내면 합의하고, 개입이 기록된다', () => {
    let s = runUntilPause(createNegotiation(scenarioConfig()))
    s = resolveDecision(s, 'takeover')
    expect(s.control).toBe('human')
    s = humanSend(s, { price: 44000, method: 'delivery', text: '택배비 포함 4만 4천 원에 보내드릴게요.' })
    s = runUntilPause(s)
    expect(s.status).toBe('agreed')
    expect(s.agreed).toMatchObject({ price: 44000, method: 'delivery' })
    expect(s.interventions).toHaveLength(1)
    expect(s.interventions[0].snapshot.interventions).toHaveLength(0)
  })

  it('완전 위임에서는 범위 안 제안을 확인 없이 합의한다', () => {
    const end = runToEnd(createNegotiation(scenarioConfig({ autonomy: 'full', persona: 'normal' })))
    expect(end.status).toBe('agreed')
    expect(end.log.some((e) => e.type === 'decision_requested')).toBe(false)
  })

  it('조건부 위임은 합의 직전에 확인을 받는다', () => {
    const s = runUntilPause(createNegotiation(scenarioConfig({ persona: 'normal', seed: 3, runSeed: 3 })))
    expect(s.status).toBe('decision')
    expect(s.decision?.kind).toBe('pre_agreement')
  })

  it('보조 모드는 매 답장을 추천만 하고 사람이 보내야 나간다', () => {
    let s = runUntilPause(createNegotiation(scenarioConfig({ autonomy: 'assist', persona: 'normal' })))
    expect(s.decision?.kind).toBe('assist')
    const agentMsgs = s.messages.filter((m) => m.from === 'agent').length
    expect(agentMsgs).toBe(0)
    s = resolveDecision(s, 'approve')
    expect(s.messages.filter((m) => m.from === 'agent')).toHaveLength(1)
  })

  it('다시 맡기면 사람이 정한 가격 고정 전략을 이어받는다', () => {
    let s = createNegotiation(scenarioConfig({ persona: 'lowballer' }))
    s = step(step(s))
    s = takeOver(s)
    s = humanSend(s, { price: 45000, method: 'meet', text: '4만 5천 원이요.' })
    s = step(s) // 구매자 반응
    s = handBack(s, { strategy: 'hold', priceLock: true, allowDelivery: false, note: '가격은 고정' })
    s = step(s) // 에이전트
    const last = s.messages[s.messages.length - 1]
    expect(last.from).toBe('agent')
    expect(last.price).toBe(45000)
    expect(s.log.some((e) => e.type === 'handback')).toBe(true)
  })

  it('협상 도중 자율성 단계를 바꾸면 기록에 남는다', () => {
    const s = setAutonomy(createNegotiation(scenarioConfig()), 'full')
    expect(s.autonomy).toBe('full')
    expect(s.log[s.log.length - 1].type).toBe('autonomy_changed')
  })

  it('반복 떠보기는 수상한 요청으로 사람에게 알린다', () => {
    const s = runUntilPause(createNegotiation(scenarioConfig({ persona: 'prober', autonomy: 'full' })))
    expect(s.decision?.kind).toBe('suspicious')
    expect(s.blocked).toBeGreaterThanOrEqual(2)
  })
})
