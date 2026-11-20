interface ChoiceOption<T extends string> {
  value: T
  label: string
}

interface InlineChoiceProps<T extends string> {
  label: string
  options: ChoiceOption<T>[]
  /** 하나만 고르면 라디오, 여러 개면 체크 */
  selected: T[]
  multiple?: boolean
  onToggle: (value: T) => void
}

/**
 * 칸 없는 선택지. 글자 앞의 작은 표시(원·체크)와 글자 색만으로 고른 상태를 보여준다.
 */
export function InlineChoice<T extends string>({ label, options, selected, multiple = false, onToggle }: InlineChoiceProps<T>) {
  return (
    <div className="opts" role={multiple ? 'group' : 'radiogroup'} aria-label={label}>
      {options.map((o) => {
        const on = selected.includes(o.value)
        return (
          <button
            key={o.value}
            role={multiple ? 'checkbox' : 'radio'}
            aria-checked={on}
            className={`opt pressable ${on ? 'opt--on' : ''} ${multiple ? 'opt--multi' : ''}`}
            onClick={() => onToggle(o.value)}
          >
            <span className="opt__mark" aria-hidden="true">
              {multiple && (
                <svg viewBox="0 0 16 16" width="12" height="12">
                  <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
