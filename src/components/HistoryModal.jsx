import { useState } from 'react'
import { formatData } from '../lib/helpers.js'

export default function HistoryModal({ history, games, onClose, onClear }) {
  const [abertoNaoJogados, setAbertoNaoJogados] = useState(false)
  const byId = Object.fromEntries(games.map((g) => [g.id, g]))
  const recentes = [...history].reverse()

  const contagem = {}
  for (const h of history) contagem[h.gameId] = (contagem[h.gameId] || 0) + 1

  const naoJogados = games.filter((g) => !contagem[g.id])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>📜 Histórico de partidas</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {history.length === 0 ? (
            <p style={{ color: 'var(--text-soft)' }}>
              Nenhuma partida registrada ainda. Use “🎲 Joguei” num card ou registre pela roleta.
            </p>
          ) : (
            <>
              <h4 style={{ margin: '0 0 8px', color: 'var(--text-soft)' }}>
                Últimas partidas ({history.length})
              </h4>
              {recentes.slice(0, 40).map((h, i) => (
                <div className="hist-item" key={i}>
                  <span>{byId[h.gameId]?.nome || h.nome || 'Jogo removido'}</span>
                  <span className="hist-badge">{contagem[h.gameId]}×</span>
                  {h.players ? (
                    <span className="hist-players" title="Jogadores nesta partida">
                      👥 {h.players}
                    </span>
                  ) : null}
                  {h.nota ? (
                    <span className="hist-stars" title={`Sua avaliação: ${h.nota}/5`}>
                      {'★'.repeat(h.nota)}
                      <span className="off">{'★'.repeat(5 - h.nota)}</span>
                    </span>
                  ) : null}
                  <span className="when">{formatData(h.date)}</span>
                </div>
              ))}
            </>
          )}

          {naoJogados.length > 0 && (
            <div className="collapsible">
              <button
                className="collapsible-head"
                onClick={() => setAbertoNaoJogados((v) => !v)}
              >
                <span className={'caret' + (abertoNaoJogados ? ' open' : '')}>▶</span>
                Ainda não jogados ({naoJogados.length})
              </button>
              {abertoNaoJogados && (
                <div className="chips" style={{ marginTop: 10 }}>
                  {naoJogados.map((g) => (
                    <span className="chip" key={g.id}>{g.nome}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {history.length > 0 && (
          <div className="modal-foot">
            <button className="btn btn-danger btn-sm" onClick={onClear}>
              Limpar histórico
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
