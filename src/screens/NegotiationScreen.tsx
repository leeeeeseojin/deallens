import { useEffect, useMemo, useRef, useState } from 'react'
import {
  handBack,
  humanAccept,
  humanSend,
  isOver,
  resolveDecision,
  setAutonomy,
  takeOver,
  theirLastPrice,
  myLastPrice,
  type Choice,
  type NegState,
} from '../engine/negotiation'
import { buildBriefing, type Briefing } from '../engine/briefing'
import { PERSONAS } from '../engine/personas'
import type { Autonomy, TradeMethod } from '../engine/types'
import { METHOD_LABEL } from '../engine/types'
import { won } from '../engine/format'
import { canAdvance, useAutoplay } from '../hooks/useAutoplay'
import { Icon } from '../ui/Icon'
import { InlineChoice } from '../ui/Choice'
import { PriceMeter } from '../ui/PriceMeter'
import { ChatBubble, TypingDots } from '../ui/ChatBubble'
import { Toasts } from '../ui/Toasts'
import { DecisionSheet } from './DecisionSheet'
import { BriefingSheet } from './BriefingSheet'
import { HandBackSheet } from './HandBackSheet'
import { ActivitySheet } from './ActivitySheet'
import './negotiate.css'

interface NegotiationScreenProps {
  state: NegState
  onChange: (s: NegState) => void
  onExit: () => void
  onReport: () => void
}

export function NegotiationScreen({ state, onChange, onExit, onReport }: NegotiationScreenProps) {
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [briefingOpen, setBriefingOpen] = useState(false)
  const [handBackOpen, setHandBackOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [draft, setDraft] = useState<{ price: number; method: TradeMethod; text: string }>({ price: 0, method: 'meet', text: '' })
  const endRef = useRef<HTMLDivElement>(null)

  const sheetOpen = briefingOpen || handBackOpen || logOpen
  useAutoplay(state, onChange, paused || sheetOpen, speed)

  const persona = PERSONAS[state.config.persona]
  const { mandate } = state
  const over = isOver(state)
  const human = state.control === 'human'
  const briefing: Briefing = useMemo(() => buildBriefing(state), [state])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [state.messages.length, state.status])

  function startHuman(next: NegState) {
    onChange(next)
    const b = buildBriefing(next)
    const reply = b.suggestedReply
    setDraft({
      price: reply?.price ?? myLastPrice(next) ?? mandate.askPrice,
      method: reply?.method ?? 'meet',
      text: '',
    })
    setBriefingOpen(true)
  }

  function onChoose(c: Choice) {
    const next = resolveDecision(state, c)
    if (next.control === 'human' && state.control !== 'human') startHuman(next)
    else onChange(next)
  }

  function send() {
    const text = draft.text.trim() || `${won(draft.price)}에 ${draft.method === 'delivery' ? '택배로 보내드릴게요' : '거래할게요'}.`
    onChange(humanSend(state, { ...draft, text }))
    setDraft((d) => ({ ...d, text: '' }))
  }

  const typing = !over && canAdvance(state) && !paused && !sheetOpen
  const theirLast = theirLastPrice(state)
  const waitingForHuman = human && state.next === 'agent' && !over

  return (
    <main className="nego">
      <Toasts log={state.log} />

      {/* 위쪽 고정: 설정 화면과 같은 방식으로 제목·가격 흐름·자율성 단계를 둔다 */}
      <div className="nego__top">
        <header className="nego__bar">
          <button className="icon-btn pressable" onClick={onExit} aria-label="위임 설정으로">
            <Icon name="back" />
          </button>
          <div className="nego__title">
            <span className="nego__item">{mandate.item.name}</span>
            <span className="nego__sub">
              {persona.name} · {mandate.place} {mandate.time} {mandate.methods.map((m) => METHOD_LABEL[m]).join('·')}
            </span>
          </div>
          <button className="nego__log pressable" onClick={() => setLogOpen(true)} aria-label={`활동 기록, 차단 ${state.blocked}회`}>
            기록{state.blocked > 0 && <b className="num"> {state.blocked}</b>}
          </button>
        </header>

        <PriceMeter
          myOffers={state.myOffers}
          theirOffers={state.theirOffers}
          ask={mandate.askPrice}
          floor={mandate.floorPrice}
          agreedPrice={state.agreed?.price ?? null}
        />

        <InlineChoice<Autonomy>
          label="자율성 단계"
          selected={[state.autonomy]}
          onToggle={(a) => onChange(setAutonomy(state, a))}
          options={[
            { value: 'full', label: '완전 위임' },
            { value: 'conditional', label: '조건부' },
            { value: 'assist', label: '보조' },
          ]}
        />
      </div>

      <section className="nego__chat" aria-label="협상 대화" aria-live="polite">
        <p className="nego__notice">최저가는 정책 계층만 알아요</p>
        {state.messages.map((m) => (
          <ChatBubble key={m.id} msg={m} tone={state.config.persona} />
        ))}
        {typing && <TypingDots side={state.next === 'buyer' ? 'buyer' : 'agent'} tone={state.config.persona} />}
        {state.status === 'failed' && <p className="nego__notice nego__notice--end">협상 종료 · {state.failReason}</p>}
        {state.status === 'agreed' && state.agreed && (
          <p className="nego__notice nego__notice--deal">
            {won(state.agreed.price)} · {METHOD_LABEL[state.agreed.method]}로 합의했어요
          </p>
        )}
        <div ref={endRef} className="nego__end-spacer" />
      </section>

      {/* ── 하단: 설정 화면의 버튼 줄과 같은 모양. 상태에 따라 바뀐다 ── */}
      <div className="dock">
        {over ? (
          <>
            <p className="dock__status">
              <i className={state.status === 'agreed' ? 'ok' : 'fail'} />
              {state.agreed ? `${won(state.agreed.price)}에 거래 성사` : '거래가 성사되지 않았어요'}
            </p>
            <div className="dock__row">
              <button className="btn btn--primary btn--block pressable" onClick={onReport}>
                성적표 보기
              </button>
            </div>
          </>
        ) : human ? (
          <div className="composer rise">
            <div className="composer__links">
              <button className="composer__link pressable" onClick={() => setBriefingOpen(true)}>
                브리핑
              </button>
              {theirLast !== null && waitingForHuman && (
                <button className="composer__link pressable" onClick={() => onChange(humanAccept(state))}>
                  {won(theirLast)} 수락
                </button>
              )}
              <button className="composer__link composer__link--accent pressable" onClick={() => setHandBackOpen(true)}>
                다시 맡기기
              </button>
            </div>
            <div className="composer__row">
              <div className="stepper">
                <button className="stepper__btn pressable" aria-label="천 원 내리기" onClick={() => setDraft((d) => ({ ...d, price: Math.max(0, d.price - 1000) }))}>
                  <Icon name="minus" size={16} />
                </button>
                <span className={`stepper__val num ${draft.price < mandate.floorPrice ? 'stepper__val--warn' : ''}`}>{won(draft.price)}</span>
                <button className="stepper__btn pressable" aria-label="천 원 올리기" onClick={() => setDraft((d) => ({ ...d, price: d.price + 1000 }))}>
                  <Icon name="plus" size={16} />
                </button>
              </div>
              <InlineChoice<TradeMethod>
                label="거래 방식"
                selected={[draft.method]}
                onToggle={(method) => setDraft((d) => ({ ...d, method }))}
                options={[
                  { value: 'meet', label: '직거래' },
                  { value: 'delivery', label: '택배' },
                ]}
              />
            </div>
            {draft.price < mandate.floorPrice && <p className="composer__warn">최저가보다 낮아요. 내가 보내는 제안은 막지 않아요.</p>}
            <div className="composer__send-row">
              <input
                className="field field--line composer__input"
                value={draft.text}
                onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && waitingForHuman && send()}
                placeholder={waitingForHuman ? '메시지 (비우면 가격만 보내요)' : '상대가 답하는 중…'}
                disabled={!waitingForHuman}
              />
              <button className="composer__send pressable" onClick={send} disabled={!waitingForHuman} aria-label="보내기">
                <Icon name="send" size={20} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="dock__status">
              <i className={typing ? 'live' : ''} />
              {state.status === 'decision' ? '판단을 기다려요' : paused ? '일시정지' : '에이전트가 협상 중'}
              <span className="num">
                {' '}
                · {state.turn}턴 · 차단 {state.blocked}회
              </span>
              <button className="dock__speed pressable" onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))} aria-label={`속도 ${speed}배`}>
                {speed}배속
              </button>
            </p>
            <div className="dock__row">
              <button className="btn dock__square pressable" onClick={() => setPaused((p) => !p)} aria-label={paused ? '재생' : '일시정지'}>
                <Icon name={paused ? 'play' : 'pause'} size={18} />
              </button>
              <button className="btn btn--primary btn--block pressable" onClick={() => startHuman(takeOver(state))}>
                내가 이어서 할게
              </button>
            </div>
          </>
        )}
      </div>

      <DecisionSheet decision={state.status === 'decision' ? state.decision : null} onChoose={onChoose} />
      <BriefingSheet
        open={briefingOpen}
        briefing={briefing}
        onClose={() => setBriefingOpen(false)}
        onUseReply={(r) => {
          setDraft({ price: r.price, method: r.method, text: r.text })
          setBriefingOpen(false)
        }}
      />
      {handBackOpen && (
        <HandBackSheet
          open
          initial={{ strategy: state.strategy, allowDelivery: mandate.methods.includes('delivery') || draft.method === 'delivery' }}
          onClose={() => setHandBackOpen(false)}
          onConfirm={(opts) => {
            onChange(handBack(state, opts))
            setHandBackOpen(false)
          }}
        />
      )}
      <ActivitySheet open={logOpen} log={state.log} onClose={() => setLogOpen(false)} />
    </main>
  )
}
