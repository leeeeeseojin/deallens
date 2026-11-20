/** 흐르는 색 덩어리 배경과, 굴절 효과에 쓰는 SVG 필터 정의 */
export function Ambient() {
  return (
    <>
      <div className="ambient" aria-hidden="true">
        <div className="ambient__blob ambient__blob--1" />
        <div className="ambient__blob ambient__blob--2" />
        <div className="ambient__blob ambient__blob--3" />
        <div className="ambient__blob ambient__blob--4" />
        <div className="ambient__grain" />
      </div>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          {/* 렌즈 굴절: 가장자리로 갈수록 뒤 배경을 바깥으로 휘게 한다 */}
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
