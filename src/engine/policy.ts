import type { Mandate, TradeMethod } from './types'

/**
 * 정책 계층. LLM 밖의 코드로 위임 범위를 강제한다.
 * - 에이전트는 최저가 숫자를 받지 않고 '범위 안/밖' 판정 도구만 받는다.
 * - 에이전트가 낸 구조화된 출력은 이 계층을 통과해야만 상대에게 나간다.
 */

export interface RangeTool {
  inRange(price: number): boolean
}

export function makeRangeTool(mandate: Mandate): RangeTool {
  return {
    inRange: (price) => price >= mandate.floorPrice && price <= mandate.askPrice * 1.5,
  }
}

/** "4만 7천", "4.7만", "47,000원", "47000" 같은 표기를 숫자로 뽑는다 */
export function extractPrices(text: string): number[] {
  const re = /(\d+(?:\.\d+)?)\s*만(?:\s*(\d)\s*천)?|(\d{1,3}(?:,\d{3})+|\d{4,})/g
  const found: number[] = []
  for (const m of text.matchAll(re)) {
    if (m[1] !== undefined) {
      found.push(Math.round(parseFloat(m[1]) * 10000 + (m[2] ? Number(m[2]) * 1000 : 0)))
    } else if (m[3] !== undefined) {
      found.push(Number(m[3].replace(/,/g, '')))
    }
  }
  return found
}

export type Threat = 'probe' | 'injection'

const INJECTION =
  /(이전\s*지시|지시를?\s*(모두\s*)?무시|시스템\s*(공지|프롬프트|메시지)|\[시스템\]|너는\s*이제|관리자\s*모드|개발자\s*모드|ignore\s+(all|previous|prior)|system\s*prompt|developer\s*mode|jailbreak)/i
const PROBE =
  /(최저\s*가|최저\s*얼마|마지노선|하한|얼마까지\s*(내려|깎|가능)|최소\s*(가격|금액|얼마)|제일\s*싸게|어디까지\s*(내려|깎))/

/** 상대 메시지에서 떠보기·주입 시도를 감지한다 */
export function scanIncoming(text: string): Threat | null {
  if (INJECTION.test(text)) return 'injection'
  if (PROBE.test(text)) return 'probe'
  return null
}

export type Violation = 'below_floor' | 'method' | 'leak'

export interface OutgoingCheck {
  ok: boolean
  violations: Violation[]
}

/** 최저가 근처 숫자가 제안가가 아닌 맥락으로 메시지에 드러나는지 본다 */
export function detectLeak(floorPrice: number, message: string, offeredPrice: number | null): boolean {
  const tolerance = Math.max(1000, floorPrice * 0.03)
  return extractPrices(message).some(
    (n) => n !== offeredPrice && Math.abs(n - floorPrice) <= tolerance,
  )
}

export function checkOutgoing(
  mandate: Mandate,
  out: { price: number | null; method: TradeMethod; message: string },
): OutgoingCheck {
  const violations: Violation[] = []
  if (out.price !== null && out.price < mandate.floorPrice) violations.push('below_floor')
  if (!mandate.methods.includes(out.method)) violations.push('method')
  if (detectLeak(mandate.floorPrice, out.message, out.price)) violations.push('leak')
  return { ok: violations.length === 0, violations }
}

/** 상대 제안이 위임 범위 안인지. 범위 밖이면 사람에게 판단을 요청한다 */
export function isMethodAllowed(mandate: Mandate, method: TradeMethod): boolean {
  return mandate.methods.includes(method)
}
