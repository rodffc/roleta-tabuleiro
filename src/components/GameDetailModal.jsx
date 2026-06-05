import { useState } from 'react'
import {
  corPlaceholder,
  inicial,
  imgSrc,
  formatJogadores,
  formatTempo,
  formatPreco,
} from '../lib/helpers.js'

export default function GameDetailModal({ game, fav, vezesJogado, onClose, onToggleFav, onPlay, onEdit, onDelete }) {
  const [imgErro, setImgErro] = useState(false)
  const src = imgSrc(game.imageUrl)
  const mostraImg = src && !imgErro
  const ehExpansao = /expans/i.test(game.tipo || '')

  const linhas = [
    ['Tipo', game.tipo],
    ['Estilo', game.estilo],
    ['Jogadores', formatJogadores(game)],
    ['Duração', formatTempo(game)],
    ['Idade', game.idade],
    ['Ano', game.ano],
    ['Editora', game.editora],
    ['Nota Ludopedia', game.nota_ludopedia != null ? `★ ${Number(game.nota_ludopedia).toFixed(1)}` : null],
    ['Ranking Ludopedia', game.rank_ludopedia != null ? `#${game.rank_ludopedia}` : null],
    ['Preço médio', formatPreco(game.preco)],
    ['Vezes jogado', vezesJogado > 0 ? `${vezesJogado}×` : 'nunca'],
  ].filter(([, v]) => v != null && v !== '')

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{game.nome}{ehExpansao && <span className="exp-tag" style={{ marginLeft: 8 }}>EXP</span>}</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="detail-top">
            <div className="detail-cover" style={{ background: corPlaceholder(game.nome) }}>
              {mostraImg ? (
                <img src={src} alt={game.nome} onError={() => setImgErro(true)} />
              ) : (
                <span className="ph">{inicial(game.nome)}</span>
              )}
            </div>
            <div className="detail-info">
              <button
                className={'btn btn-sm ' + (fav ? 'btn-orange' : 'btn-outline')}
                onClick={() => onToggleFav(game.id)}
                style={{ marginBottom: 10 }}
              >
                {fav ? '⭐ Favorito' : '☆ Favoritar'}
              </button>
              <table className="detail-table">
                <tbody>
                  {linhas.map(([k, v]) => (
                    <tr key={k}>
                      <th>{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {game.descricao && (
            <>
              <h4 className="detail-section">Descrição</h4>
              <p className="detail-desc">{game.descricao}</p>
            </>
          )}

          {game.busca?.length > 0 && (
            <>
              <h4 className="detail-section">Também conhecido por</h4>
              <div className="chips">
                {game.busca.map((b) => (
                  <span className="chip" key={b}>{b}</span>
                ))}
              </div>
            </>
          )}

          {game.ludopediaUrl && (
            <p style={{ marginTop: 14 }}>
              <a href={game.ludopediaUrl} target="_blank" rel="noreferrer" className="lp-link">
                🔗 Ver na Ludopedia
              </a>
            </p>
          )}
        </div>

        <div className="modal-foot" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(game)}>🗑 Excluir</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline btn-sm" onClick={() => onEdit(game)}>✎ Editar</button>
            <button className="btn btn-green btn-sm" onClick={() => onPlay(game)}>🎲 Joguei</button>
          </div>
        </div>
      </div>
    </div>
  )
}
