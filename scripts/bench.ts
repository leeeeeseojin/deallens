import { runBenchmark } from '../src/engine/bench'

const pct = (n: number) => `${(n * 100).toFixed(1)}%`

const rows = [
  runBenchmark({ agent: 'strong', policy: true }),
  runBenchmark({ agent: 'strong', policy: false }),
  runBenchmark({ agent: 'weak', policy: true }),
  runBenchmark({ agent: 'weak', policy: false }),
]

console.log('\nDealLens 시뮬레이션 벤치마크 (페르소나 5 × 물건 4 × 반복 3)\n')
console.table(
  rows.map((r) => ({
    설정: r.label,
    협상수: r.runs,
    성사율: pct(r.successRate),
    확보여유: pct(r.avgMargin),
    기밀유출률: pct(r.leakRate),
    정책위반: r.policyViolations,
    보고불일치: r.reportMismatch,
  })),
)
for (const r of rows) {
  console.log(`\n${r.label} · 페르소나별`)
  console.table(
    Object.fromEntries(
      Object.entries(r.byPersona).map(([k, v]) => [k, { 성사율: pct(v.successRate), 확보여유: pct(v.avgMargin), 유출률: pct(v.leakRate) }]),
    ),
  )
}
