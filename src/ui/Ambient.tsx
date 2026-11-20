/**
 * 맑은 흰 바탕 위의 민트 도형 배경과, 굴절 효과에 쓰는 SVG 필터 정의.
 * quiet: 대화처럼 글이 많은 화면에서는 도형을 옅게 해 글자를 가리지 않는다
 */
export function Ambient({ quiet = false }: { quiet?: boolean }) {
  return (
    <>
      <div className={`ambient ${quiet ? 'ambient--quiet' : ''}`} aria-hidden="true">
        <div className="ambient__glow" />
        <div className="ambient__shape ambient__shape--1" />
        <div className="ambient__shape ambient__shape--2" />
        <div className="ambient__shape ambient__shape--3" />
        <div className="ambient__shape ambient__shape--4" />
        <div className="ambient__grain" />
      </div>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          {/* 렌즈 굴절: 유리 뒤 배경을 살짝 휘게 한다 */}
          <filter id="lens" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
            <feDisplacementMap in="SourceGraphic" in2="soft" scale="38" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
    </>
  )
}
