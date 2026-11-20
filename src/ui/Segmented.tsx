import { useId } from 'react'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  size?: 'sm' | 'md'
}

/** 유리 위를 미끄러지는 액체 손잡이가 있는 분할 선택 */
export function Segmented<T extends string>({ options, value, onChange, label, size = 'md' }: SegmentedProps<T>) {
  const id = useId()
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const width = 100 / options.length
  return (
    <div className={`segmented glass segmented--${size}`} role="radiogroup" aria-label={label}>
      <span
        key={value}
        className="segmented__thumb refract"
        style={{ left: `calc(${index * width}% + 4px)`, width: `calc(${width}% - 8px)` }}
        aria-hidden="true"
      />
      {options.map((o) => (
        <button
          key={o.value}
          id={`${id}-${o.value}`}
          role="radio"
          aria-checked={o.value === value}
          className="segmented__opt"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
