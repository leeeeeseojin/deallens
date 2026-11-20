import { useEffect } from 'react'
import { isOver, step, type NegState } from '../engine/negotiation'

/** 지금 화면이 다음 수를 자동으로 진행해도 되는 상태인지 */
export function canAdvance(s: NegState): boolean {
  if (isOver(s) || s.status === 'decision') return false
  if (s.control === 'human') return s.next === 'buyer'
  return true
}

/** 협상을 사람이 지켜볼 수 있는 속도로 한 수씩 진행한다 */
export function useAutoplay(state: NegState | null, setState: (s: NegState) => void, paused: boolean, speed: number) {
  useEffect(() => {
    if (!state || paused || !canAdvance(state)) return
    const base = state.next === 'buyer' ? 1700 : 1250
    const delay = state.turn === 0 && state.messages.length === 0 ? 700 : base / speed
    const id = window.setTimeout(() => setState(step(state)), delay)
    return () => window.clearTimeout(id)
  }, [state, paused, speed, setState])
}
