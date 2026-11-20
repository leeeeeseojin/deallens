/**
 * 순수 함수 난수. 같은 (시드, 턴, 용도) 조합은 항상 같은 값을 낸다.
 * 상태에 난수 생성기를 들고 다니지 않아도 그림자 협상과 반사실 재생이 같은 세계를 공유한다.
 */
export function hash(...parts: Array<number | string>): number {
  let h = 2166136261 >>> 0
  for (const part of parts) {
    const s = String(part)
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    h ^= 0x9e3779b9
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** [0, 1) 구간의 결정적 난수 */
export function rand(...parts: Array<number | string>): number {
  let t = (hash(...parts) + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function pick<T>(items: readonly T[], ...parts: Array<number | string>): T {
  return items[Math.floor(rand(...parts) * items.length)]
}

/** 중고거래 가격은 천 원 단위로 다룬다 */
export function round1000(n: number): number {
  return Math.round(n / 1000) * 1000
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}
