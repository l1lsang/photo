const STEPS = [
  { title: '10장 촬영', desc: '타이머 · 거울 모드 · 라이브 필터' },
  { title: '4장 고르기', desc: '고른 순서대로 칸에 들어가요' },
  { title: '꾸미기', desc: '구조 12종 · 프레임 12종 · 내 프레임 추가' },
  { title: '저장 · 인쇄', desc: '고화질 PNG · 4×6 인화' },
]

export default function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="home">
      <section className="home-hero">
        <span className="home-badge">PHOTO BOOTH</span>
        <h1>
          오늘을 <em>네 컷</em>에
          <br />
          담아요
        </h1>
        <p>
          컴퓨터 카메라로 10장을 찍고, 마음에 드는 4장을 골라
          <br />
          나만의 프레임으로 꾸민 뒤 저장하거나 바로 인쇄하세요.
        </p>
        <button type="button" className="btn primary huge" onClick={onStart}>
          📸 촬영 시작하기
        </button>
        <small>처음 시작하면 브라우저가 카메라 권한을 물어봐요. ‘허용’을 눌러 주세요.</small>
      </section>

      <div className="home-art" aria-hidden="true">
        <div className="mini-strip pink">
          <span />
          <span />
          <span />
          <span />
          <b>♥</b>
        </div>
        <div className="mini-strip dark">
          <span />
          <span />
          <span />
          <span />
          <b>FILM</b>
        </div>
        <div className="mini-strip mint">
          <span />
          <span />
          <span />
          <span />
          <b>★</b>
        </div>
      </div>

      <ol className="home-steps">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <b>{i + 1}</b>
            <strong>{step.title}</strong>
            <span>{step.desc}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
