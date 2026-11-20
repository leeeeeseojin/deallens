import { useCallback, useState } from 'react'
import { createNegotiation, type NegState } from './engine/negotiation'
import type { Strategy } from './engine/types'
import { DEFAULT_SETUP, toConfig, type SetupValues } from './setup'
import { Ambient } from './ui/Ambient'
import { SetupScreen } from './screens/SetupScreen'
import { NegotiationScreen } from './screens/NegotiationScreen'
import { ReportScreen } from './screens/ReportScreen'
import './ui/ui.css'

type Screen = 'setup' | 'negotiate' | 'report'

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [setup, setSetup] = useState<SetupValues>(DEFAULT_SETUP)
  const [neg, setNeg] = useState<NegState | null>(null)

  const go = useCallback((next: Screen) => {
    setScreen(next)
    window.scrollTo({ top: 0 })
  }, [])

  const start = useCallback(
    (values: SetupValues) => {
      setNeg(createNegotiation(toConfig(values)))
      go('negotiate')
    },
    [go],
  )

  function tune(strategy: Strategy) {
    // 성적표의 제안을 다음 거래 설정에 반영한다 (균형은 버티기 쪽으로 둔다)
    setSetup((s) => ({ ...s, style: strategy === 'quick' ? 'quick' : 'hold' }))
    go('setup')
  }

  return (
    <>
      <Ambient />
      <div className="app">
        {screen === 'setup' && <SetupScreen value={setup} onChange={setSetup} onStart={() => start(setup)} />}
        {screen === 'negotiate' && neg && (
          <NegotiationScreen state={neg} onChange={setNeg} onExit={() => go('setup')} onReport={() => go('report')} />
        )}
        {screen === 'report' && neg && (
          <ReportScreen state={neg} onBack={() => go('negotiate')} onRetry={() => start(setup)} onTune={tune} />
        )}
      </div>
    </>
  )
}
