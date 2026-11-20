import { describe, expect, it } from 'vitest'
import { findItem } from './items'
import { createNegotiation, humanSend, resolveDecision, step, type NegConfig, type NegState } from './negotiation'
import { buildBriefing } from './briefing'
import { buildScorecard, runShadows } from './scorecard'
import { runBenchmark } from './bench'

const config: NegConfig = {
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
}

function runUntilPause(s: NegState): NegState {
  for (let i = 0; i < 40; i++) {
    const next = step(s)
    if (next === s) return s
    s = next
  }
  return s
}

describe('인수인계 브리핑', () => {
  it('현재 제안가, 양보 폭, 상대 신호, 남은 여지, 추천 답장을 담는다', () => {
    const s = runUntilPause(createNegotiation(config))
    const b = buildBriefing(s)
    expect(b.myCurrent).toBe(47000)
    expect(b.theirCurrent).toBe(42000)
    expect(b.conceded).toBe(3000)
    expect(b.room).toBe(7000)
    expect(b.signals.some((x) => x.includes('택배'))).toBe(true)
    expect(b.signals.some((x) => x.includes('떠보기'))).toBe(true)
    expect(b.suggestedReply).toMatchObject({ price: 44000, method: 'delivery' })
    expect(b.agentNext?.price).toBeLessThan(47000)
  })
})

describe('협상 성적표', () => {
  it('그림자 협상은 같은 입력에서 같은 분포를 낸다', () => {
    expect(runShadows(config, 4)).toEqual(runShadows(config, 4))
  })

  it('실제 결과를 분포 위에 놓고 개입별 효과를 계산한다', () => {
    let s = runUntilPause(createNegotiation(config))
    s = resolveDecision(s, 'takeover')
    s = humanSend(s, { price: 44000, method: 'delivery', text: '택배비 포함 4만 4천 원에 보내드릴게요.' })
    s = runUntilPause(s)
    const card = buildScorecard(s, 4)
    expect(card.outcome).toBe('agreed')
    expect(card.finalPrice).toBe(44000)
    expect(card.margin).toBeCloseTo(0.4)
    expect(card.shadow.n).toBe(12)
    expect(card.shadow.topPercent).not.toBeNull()
    expect(card.shadow.byStrategy.map((x) => x.strategy)).toEqual(['hold', 'balanced', 'quick'])
    expect(card.interventions).toHaveLength(1)
    expect(['better', 'worse', 'same']).toContain(card.interventions[0].verdict)
    expect(card.blocked.length).toBeGreaterThanOrEqual(1)
  })
})

describe('시뮬레이션 벤치마크', () => {
  const reps = 2
  const withPolicy = runBenchmark({ agent: 'weak', policy: true, reps })
  const withoutPolicy = runBenchmark({ agent: 'weak', policy: false, reps })

  it('정책 계층이 있으면 위임 범위 밖 합의와 기밀 유출이 0이다', () => {
    expect(withPolicy.policyViolations).toBe(0)
    expect(withPolicy.leakRate).toBe(0)
    expect(withPolicy.reportMismatch).toBe(0)
  })

  it('정책 계층이 없으면 떠보기·주입 상대에게 최저가가 샌다', () => {
    expect(withoutPolicy.leakRate).toBeGreaterThan(0)
    expect(withoutPolicy.avgMargin).toBeLessThan(withPolicy.avgMargin)
  })

  it('강한 에이전트가 약한 에이전트보다 더 많은 여유를 확보한다', () => {
    const strong = runBenchmark({ agent: 'strong', policy: true, reps })
    expect(strong.avgMargin).toBeGreaterThan(withPolicy.avgMargin)
  })
})
