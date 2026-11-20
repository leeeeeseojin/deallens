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
import { Glass } from '../ui/Glass'
import { Icon } from '../ui/Icon'
import { ITEM_ICON } from '../ui/itemIcon'
import { Segmented } from '../ui/Segmented'
import { PriceGapChart } from '../ui/PriceGapChart'
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

      <header className="nego__top glass glass--strong">
        <button className="icon-btn pressable" onClick={onExit} aria-label="위임 설정으로">
          <Icon name="back" />
        </button>
        <div className="nego__title">
          <span className="nego__item">
            <Icon name={ITEM_ICON[mandate.item.id] ?? 'keyboard'} size={16} /> {mandate.item.name}
          </span>
          <span className="nego__sub">
            {persona.name} · {mandate.place} {mandate.time} {mandate.methods.map((m) => METHOD_LABEL[m]).join('·')}
          </span>
        </div>
        <button className="icon-btn pressable nego__log" onClick={() => setLogOpen(true)} aria-label={`활동 기록, 차단 ${state.blocked}회`}>
          <Icon name="log" />
          {state.blocked > 0 && <span className="nego__badge">{state.blocked}</span>}
        </button>
      </header>

      <section className="nego__controls">
        <Segmented<Autonomy>
          size="sm"
          label="자율성 단계"
          value={state.autonomy}
          onChange={(a) => onChange(setAutonomy(state, a))}
          options={[
            { value: 'full', label: '완전 위임' },
            { value: 'conditional', label: '조건부' },
            { value: 'assist', label: '보조' },
          ]}
        />
      </section>

      <Glass className="nego__chart" tilt>
        <PriceGapChart
          myOffers={state.myOffers}
          theirOffers={state.theirOffers}
          ask={mandate.askPrice}
          floor={mandate.floorPrice}
          turn={state.turn}
          agreedPrice={state.agreed?.price ?? null}
        />
      </Glass>

      <section className="nego__chat" aria-label="협상 대화" aria-live="polite">
        <div className="nego__daychip">
          <span className="tag">
            <Icon name="shield" size={12} /> 최저가는 정책 계층만 알아요
          </span>
        </div>
        {state.messages.map((m) => (
          <ChatBubble key={m.id} msg={m} tone={state.config.persona} />
        ))}
        {typing && <TypingDots side={state.next === 'buyer' ? 'buyer' : 'agent'} tone={state.config.persona} />}
        {state.status === 'failed' && <div className="nego__end tag tag--coral">협상 종료 · {state.failReason}</div>}
        {state.status === 'agreed' && state.agreed && (
          <div className="nego__end tag tag--green">
            <Icon name="check" size={13} /> {won(state.agreed.price)} · {METHOD_LABEL[state.agreed.method]}로 합의
          </div>
        )}
        <div ref={endRef} className="nego__end-spacer" />
      </section>

      {/* ── 하단: 상태에 따라 바뀌는 도크 ── */}
      <div className="dock">
        {over ? (
          <Glass className="dock__bar dock__bar--over" variant="strong">
            <div className="dock__status">
              <span className={`dock__dot ${state.status === 'agreed' ? 'dock__dot--ok' : 'dock__dot--fail'}`} />
              <div>
                <b>{state.agreed ? `${won(state.agreed.price)}에 거래 성사` : '거래가 성사되지 않았어요'}</b>
                <span>그림자 협상으로 결과를 복기해요</span>
              </div>
            </div>
            <button className="btn btn--primary pressable" onClick={onReport}>
              <Icon name="chart" size={18} /> 성적표
            </button>
          </Glass>
        ) : human ? (
          <div className="composer-wrap rise">
            <div className="composer__actions">
              <button className="chip glass pressable" onClick={() => setBriefingOpen(true)}>
                <Icon name="info" size={15} /> 브리핑
              </button>
              {theirLast !== null && waitingForHuman && (
                <button className="chip glass pressable" onClick={() => onChange(humanAccept(state))}>
                  <Icon name="check" size={15} /> {won(theirLast)} 수락
                </button>
              )}
              <button className="chip glass pressable composer__handback" onClick={() => setHandBackOpen(true)}>
                <Icon name="bot" size={15} /> 다시 맡기기
              </button>
            </div>
            <div className="composer">
              <Glass className="composer__card" variant="strong">
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
                  <Segmented<TradeMethod>
                    size="sm"
                    label="거래 방식"
                    value={draft.method}
                    onChange={(method) => setDraft((d) => ({ ...d, method }))}
                    options={[
                      { value: 'meet', label: '직거래' },
                      { value: 'delivery', label: '택배' },
                    ]}
                  />
                </div>
                {draft.price < mandate.floorPrice && <p className="composer__warn">최저가보다 낮아요. 내가 보내는 제안은 막지 않아요.</p>}
                <input
                  className="field composer__input"
                  value={draft.text}
                  onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && waitingForHuman && send()}
                  placeholder={waitingForHuman ? '메시지 (비우면 가격만 보내요)' : '상대가 답하는 중…'}
                  disabled={!waitingForHuman}
                />
              </Glass>
              <button className="composer__send pressable" onClick={send} disabled={!waitingForHuman} aria-label="보내기">
                <Icon name="send" size={22} />
              </button>
            </div>
          </div>
        ) : (
          <Glass className="dock__bar" variant="strong">
            <div className="dock__status">
              <span className={`dock__pulse ${typing ? '' : 'dock__pulse--idle'}`} aria-hidden="true">
                <Icon name="bot" size={16} />
              </span>
              <div>
                <b>{state.status === 'decision' ? '판단을 기다려요' : paused ? '일시정지' : '에이전트가 협상 중'}</b>
                <span className="num">
                  {state.turn}턴 · 차단 {state.blocked}회
                </span>
              </div>
            </div>
            <div className="dock__btns">
              <button className="icon-btn glass pressable" onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))} aria-label={`속도 ${speed}배`}>
                <span className="dock__speed">{speed}×</span>
              </button>
              <button className="icon-btn glass pressable" onClick={() => setPaused((p) => !p)} aria-label={paused ? '재생' : '일시정지'}>
                <Icon name={paused ? 'play' : 'pause'} size={16} />
              </button>
              <button className="btn btn--dark btn--sm pressable" onClick={() => startHuman(takeOver(state))}>
                <Icon name="hand" size={16} /> 내가 이어서 할게
              </button>
            </div>
          </Glass>
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
