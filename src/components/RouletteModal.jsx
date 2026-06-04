import { useEffect, useRef, useState } from 'react'
import { corPlaceholder, inicial, imgSrc, formatJogadores, formatTempo } from '../lib/helpers.js'

export default function RouletteModal({ pool, onClose, onPlay }) {
  const [girando, setGirando] = useState(true)
  const [atual, setAtual] = useState(pool[0])
  const [vencedor, setVencedor] = useState(null)
  const [rodada, setRodada] = useState(0) // incrementar re-dispara o sorteio
  const [imgErro, setImgErro] = useState(false)
  const timers = useRef([])

  useEffect(() => {
    if (!pool.length) return
    setGirando(true)
    setVencedor(null)
    setImgErro(false)
    const escolhido = pool[Math.floor(Math.random() * pool.length)]
    let delay = 60
    let elapsed = 0

    const tick = () => {
      setAtual(pool[Math.floor(Math.random() * pool.length)])
      elapsed += delay
      delay *= 1.12 // desacelera progressivamente
      if (elapsed < 2200) {
        timers.current.push(setTimeout(tick, delay))
      } else {
        setAtual(escolhido)
        setVencedor(escolhido)
        setGirando(false)
      }
    }
    timers.current.push(setTimeout(tick, delay))
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [pool, rodada])

  const w = vencedor
  const wSrc = imgSrc(w?.imageUrl)
  const mostraImg = wSrc && !imgErro

  return (
    <div className="overlay" onClick={girando ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>🎡 Roleta de jogos</h3>
          {!girando && <button className="x" onClick={onClose}>×</button>}
        </div>

        <div className="roulette-stage">
          {girando || !w ? (
            <>
              <div className="pointer">▼</div>
              <div className="reel">
                <div className="reel-name">{atual?.nome}</div>
              </div>
              <p style={{ color: 'var(--text-soft)', margin: 0 }}>Sorteando…</p>
            </>
          ) : (
            <>
              <div className="winner-card">
                {mostraImg ? (
                  <img src={wSrc} alt={w.nome} onError={() => setImgErro(true)} />
                ) : (
                  <span className="ph" style={{ background: corPlaceholder(w.nome) }}>
                    {inicial(w.nome)}
                  </span>
                )}
                <div>
                  <h2>{w.nome}</h2>
                  <p>{w.estilo}</p>
                  <p style={{ marginTop: 4 }}>
                    👥 {formatJogadores(w)} · ⏱ {formatTempo(w)}
                    {w.nota_ludopedia != null && ` · ★ ${w.nota_ludopedia.toFixed(1)}`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-green"
                  onClick={() => {
                    onPlay(w)
                    onClose()
                  }}
                >
                  🎲 Vamos jogar! (registrar)
                </button>
                <button className="btn btn-outline" onClick={() => setRodada((r) => r + 1)}>
                  ↻ Girar de novo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
