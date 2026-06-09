import { useState } from 'react'
import { formatJogadores } from '../lib/helpers.js'

export default function PlayLogModal({ game, onClose, onConfirm }) {
  const sugestao = game.jogadores_min || 2
  const [qtd, setQtd] = useState(sugestao)
  const [nota, setNota] = useState(0) // avaliação 0-5
  const [hover, setHover] = useState(0)

  const min = game.jogadores_min || 1
  const max = game.jogadores_max || 16
  const opcoes = []
  for (let n = min; n <= Math.min(max, 16); n++) opcoes.push(n)

  function confirmar() {
    onConfirm(game, Number(qtd), nota || null)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>🎲 Registrar partida</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0 }}>
            <b>{game.nome}</b>
            <br />
            <span style={{ color: 'var(--text-soft)', fontSize: '0.85rem' }}>
              Suporta {formatJogadores(game)} jogadores
            </span>
          </p>
          <div className="form-row">
            <label>Com quantas pessoas você jogou? (incluindo você)</label>
            <div className="chips" style={{ marginBottom: 10 }}>
              {opcoes.map((n) => (
                <button
                  key={n}
                  className={'chip' + (Number(qtd) === n ? ' active' : '')}
                  onClick={() => setQtd(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="99"
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label>Sua avaliação (opcional)</label>
            <div className="star-rate" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={'star' + ((hover || nota) >= n ? ' on' : '')}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setNota(nota === n ? 0 : n)}
                  aria-label={`${n} estrela(s)`}
                >
                  ★
                </button>
              ))}
              <span className="star-val">{nota ? `${nota}/5` : '—'}</span>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-green" onClick={confirmar} disabled={!qtd || qtd < 1}>
            Registrar
          </button>
        </div>
      </div>
    </div>
  )
}
