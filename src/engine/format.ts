const nf = new Intl.NumberFormat('ko-KR')

/** 47000 → "47,000원" */
export function won(n: number): string {
  return `${nf.format(Math.round(n))}원`
}

/** 2000 → "+2,000원", -1000 → "−1,000원" */
export function signedWon(n: number): string {
  if (n === 0) return '±0원'
  return `${n > 0 ? '+' : '−'}${nf.format(Math.abs(Math.round(n)))}원`
}

/** 47000 → "4만 7천 원" 처럼 말로 읽는 표기 */
export function spokenWon(n: number): string {
  const man = Math.floor(n / 10000)
  const cheon = Math.round((n % 10000) / 1000)
  if (man === 0) return `${cheon}천 원`
  if (cheon === 0) return `${man}만 원`
  return `${man}만 ${cheon}천 원`
}

export function percent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}
