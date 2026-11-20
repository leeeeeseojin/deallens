import { useEffect, type ReactNode } from 'react'
import { Icon } from './Icon'
import './sheet.css'

interface SheetProps {
  open: boolean
  onClose?: () => void
  title?: ReactNode
  eyebrow?: ReactNode
  /** 판단 요청처럼 반드시 골라야 하는 시트는 바깥을 눌러도 닫히지 않는다 */
  dismissible?: boolean
  tone?: 'default' | 'amber' | 'coral'
  children: ReactNode
  labelledBy?: string
}

/** 아래에서 떠오르는 두꺼운 유리 시트 */
export function Sheet({ open, onClose, title, eyebrow, dismissible = true, tone = 'default', children, labelledBy }: SheetProps) {
  useEffect(() => {
    if (!open || !dismissible) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, dismissible, onClose])

  if (!open) return null
  return (
    <div className="sheet-layer" role="presentation">
      <div className="sheet-scrim" onClick={dismissible ? onClose : undefined} />
      <section className={`sheet glass glass--strong sheet--${tone}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <div className="sheet__grip" aria-hidden="true" />
        {(title || dismissible) && (
          <header className="sheet__head">
            <div>
              {eyebrow && <div className="sheet__eyebrow">{eyebrow}</div>}
              {title && (
                <h2 className="sheet__title" id={labelledBy}>
                  {title}
                </h2>
              )}
            </div>
            {dismissible && onClose && (
              <button className="icon-btn glass sheet__close pressable" onClick={onClose} aria-label="닫기">
                <Icon name="close" size={18} />
              </button>
            )}
          </header>
        )}
        <div className="sheet__body">{children}</div>
      </section>
    </div>
  )
}
