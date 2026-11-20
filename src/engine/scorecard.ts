import type { AuditEvent, Strategy } from './types'
import { STRATEGY_LABEL } from './types'
import { createNegotiation, runToEnd, type DecisionKind, type NegConfig, type NegState } from './negotiation'
import { won } from './format'

export const SHADOW_STRATEGIES: Strategy[] = ['hold', 'balanced', 'quick']

export interface ShadowRun {
  strategy: Strategy
  runSeed: number
  price: number | null
}

export interface StrategySummary {
  strategy: Strategy
  label: string
  mean: number | null
  successRate: number
  /** 이 전략 평균 − 실제 결과 */
  delta: number | null
}

export type Verdict = 'better' | 'worse' | 'same'

export interface InterventionReview {
  turn: number
  label: string
  actual: number | null
  counterfactual: number | null
  delta: number | null
  verdict: Verdict
  note: string
}

export interface Scorecard {
  outcome: 'agreed' | 'failed'
  finalPrice: number | null
  /** (합의가 − 최저가) ÷ (희망가 − 최저가) */
  margin: number | null
  shadow: {
    runs: ShadowRun[]
    n: number
    successRate: number
    /** 실제 결과가 그림자 협상 중 상위 몇 %인지 */
    topPercent: number | null
    min: number | null
    max: number | null
    byStrategy: StrategySummary[]
    best: StrategySummary | null
  }
  interventions: InterventionReview[]
  blocked: AuditEvent[]
  caveats: string[]
}

export function shadowConfig(base: NegConfig, strategy: Strategy, runSeed: number): NegConfig {
  return { ...base, autonomy: 'full', strategy, runSeed, jitter: 0.6 }
}

/** 같은 출발점, 같은 상대에서 다른 전략의 에이전트로 여러 번 다시 돌린다 */
export function runShadows(config: NegConfig, runsPerStrategy = 8): ShadowRun[] {
  const runs: ShadowRun[] = []
  for (const strategy of SHADOW_STRATEGIES) {
    for (let i = 0; i < runsPerStrategy; i++) {
      const runSeed = config.runSeed * 31 + i * 7919 + 1
      const end = runToEnd(createNegotiation(shadowConfig(config, strategy, runSeed)))
      runs.push({ strategy, runSeed, price: end.agreed?.price ?? null })
    }
  }
  return runs
}

export function marginOf(state: NegState, price: number): number {
  const { askPrice, floorPrice } = state.config.mandate
  return (price - floorPrice) / Math.max(1, askPrice - floorPrice)
}

const KIND_LABEL: Record<DecisionKind, string> = {
  out_of_scope: '범위 밖 제안',
  pre_agreement: '합의 직전',
  suspicious: '수상한 요청',
  assist: '추천 답장',
}

const CHOICE_LABEL = { approve: '승인', reject: '거절', takeover: '넘겨받기', manual_takeover: '직접 넘겨받기' }

/** 개입 직전 상태에서 에이전트가 계속했다면 어땠을지 다시 돌려 비교한다 */
export function reviewInterventions(state: NegState): InterventionReview[] {
  const actual = state.agreed?.price ?? null
  return state.interventions.map((iv) => {
    const cf = runToEnd(iv.snapshot).agreed?.price ?? null
    const label = `${iv.turn}턴 · ${iv.decisionKind ? `${KIND_LABEL[iv.decisionKind]} → ` : ''}${CHOICE_LABEL[iv.kind]}`
    let verdict: Verdict = 'same'
    let note: string
    let delta: number | null = null
    if (actual !== null && cf !== null) {
      delta = actual - cf
      verdict = delta > 500 ? 'better' : delta < -500 ? 'worse' : 'same'
      note =
        verdict === 'better'
          ? `에이전트가 계속했다면 ${won(cf)}. 개입으로 ${won(delta)} 더 받았어요`
          : verdict === 'worse'
            ? `에이전트가 계속했다면 ${won(cf)}. 개입으로 ${won(-delta)} 덜 받았어요`
            : `에이전트가 계속했어도 비슷했어요 (${won(cf)})`
    } else if (actual !== null) {
      verdict = 'better'
      note = '에이전트만으로는 거래가 깨졌을 거예요. 개입이 거래를 살렸어요'
    } else if (cf !== null) {
      verdict = 'worse'
      note = `에이전트가 계속했다면 ${won(cf)}에 거래됐을 거예요`
    } else {
      note = '어느 쪽이든 거래는 성사되지 않았어요'
    }
    return { turn: iv.turn, label, actual, counterfactual: cf, delta, verdict, note }
  })
}

export function buildScorecard(state: NegState, runsPerStrategy = 8): Scorecard {
  const final = state.agreed?.price ?? null
  const runs = runShadows(state.config, runsPerStrategy)
  const prices = runs.map((r) => r.price).filter((p): p is number => p !== null)

  let topPercent: number | null = null
  if (final !== null && runs.length > 0) {
    // 거래 실패는 어떤 합의보다 나쁜 결과로 본다
    const better = runs.filter((r) => r.price !== null && r.price > final).length
    const equal = runs.filter((r) => r.price === final).length
    topPercent = Math.max(1, Math.round(((better + equal / 2) / runs.length) * 100))
  }

  const byStrategy: StrategySummary[] = SHADOW_STRATEGIES.map((strategy) => {
    const mine = runs.filter((r) => r.strategy === strategy)
    const ok = mine.map((r) => r.price).filter((p): p is number => p !== null)
    const mean = ok.length ? Math.round(ok.reduce((a, b) => a + b, 0) / ok.length) : null
    return {
      strategy,
      label: STRATEGY_LABEL[strategy],
      mean,
      successRate: mine.length ? ok.length / mine.length : 0,
      delta: mean !== null && final !== null ? mean - final : null,
    }
  })
  const best = byStrategy.reduce<StrategySummary | null>((acc, s) => {
    if (s.mean === null) return acc
    const score = s.mean * s.successRate
    return acc === null || score > (acc.mean ?? 0) * acc.successRate ? s : acc
  }, null)

  return {
    outcome: state.status === 'agreed' ? 'agreed' : 'failed',
    finalPrice: final,
    margin: final === null ? null : marginOf(state, final),
    shadow: {
      runs,
      n: runs.length,
      successRate: runs.length ? prices.length / runs.length : 0,
      topPercent,
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...prices) : null,
      byStrategy,
      best,
    },
    interventions: reviewInterventions(state),
    blocked: state.log.filter((e) => e.type === 'probe_blocked' || e.type === 'injection_blocked' || e.type === 'leak_blocked'),
    caveats: [
      `그림자 협상 ${runs.length}회 · 시뮬레이터 상대 기준의 상대적 비교예요.`,
      '실제 사람 구매자는 다르게 반응할 수 있어 절대 금액으로 보지 마세요.',
    ],
  }
}
