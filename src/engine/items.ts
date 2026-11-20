import type { Item } from './types'

export const ITEMS: Item[] = [
  {
    id: 'keyboard',
    name: '기계식 키보드',
    condition: '1년 사용, 키캡 마모 거의 없음, 박스 포함',
    marketPrice: 46000,
    defaultAsk: 50000,
    defaultFloor: 40000,
  },
  {
    id: 'earbuds',
    name: '노이즈캔슬링 이어폰',
    condition: '6개월 사용, 케이스 생활기스',
    marketPrice: 104000,
    defaultAsk: 120000,
    defaultFloor: 95000,
  },
  {
    id: 'projector',
    name: '미니 빔프로젝터',
    condition: '사용 10회 미만, 리모컨·삼각대 포함',
    marketPrice: 158000,
    defaultAsk: 180000,
    defaultFloor: 140000,
  },
  {
    id: 'books',
    name: '전공 서적 세트',
    condition: '3권, 필기 약간',
    marketPrice: 27000,
    defaultAsk: 30000,
    defaultFloor: 22000,
  },
]

export function findItem(id: string): Item {
  return ITEMS.find((item) => item.id === id) ?? ITEMS[0]
}
