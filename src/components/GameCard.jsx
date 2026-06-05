import { useState } from 'react'
import {
  corPlaceholder,
  inicial,
  imgSrc,
  formatJogadores,
  formatTempo,
  formatPreco,
  formatData,
} from '../lib/helpers.js'

export default function GameCard({ game, modo = 'colecao', fav, onToggleFav, onPlay, onComprar, onEdit, onDelete, onOpen }) {
  const ehDesejo = modo === 'desejos'
  const [imgErro, setImgErro] = useState(false)
  const src = imgSrc(game.imageUrl)
  const mostraImg = src && !imgErro
  const ehExpansao = /expans/i.test(game.tipo || '')

  // impede que cliques nos botões abram o modal de detalhes
  const semPropagar = (fn) => (e) => {
    e.stopPropagation()
    fn()
  }

  return (
    <div
      className="card clickable"
      onClick={() => onOpen(game)}
      title="Ver detalhes"
    >
      <div className="thumb" style={{ background: corPlaceholder(game.nome) }}>
        <button
          className="fav-star"
          title={fav ? 'Remover dos favoritos' : 'Favoritar'}
          onClick={semPropagar(() => onToggleFav(game.id))}
        >
          {fav ? '⭐' : '☆'}
        </button>
        {mostraImg ? (
          <img src={src} alt={game.nome} loading="lazy" onError={() => setImgErro(true)} />
        ) : (
          <span className="ph">{inicial(game.nome)}</span>
        )}
      </div>

      <div className="card-body">
        <h3 className="card-title">
          {game.nome}
          {ehExpansao && <span className="exp-tag">EXP</span>}
        </h3>
        {game.estilo && <div className="estilo">{game.estilo}</div>}

        <div className="meta">
          <span title="Jogadores">👥 {formatJogadores(game)}</span>
          <span title="Duração">⏱ {formatTempo(game)}</span>
          {game.idade && <span title="Idade">🔞 {game.idade}</span>}
          {game.ano && <span title="Ano">📅 {game.ano}</span>}
          {formatPreco(game.preco) && (
            <span title="Preço médio" className="preco">💰 {formatPreco(game.preco)}</span>
          )}
          {ehDesejo && game.dataInclusao && (
            <span title="Adicionado à lista de desejos">📌 {formatData(game.dataInclusao)}</span>
          )}
        </div>

        {game.descricao && <p className="desc">{game.descricao}</p>}

        <div className="card-foot" onClick={(e) => e.stopPropagation()}>
          {game.nota_ludopedia != null && (
            <span className="nota" title="Nota Ludopedia">
              ★ {Number(game.nota_ludopedia).toFixed(1)}
            </span>
          )}
          {game.rank_ludopedia != null && <span className="rank">#{game.rank_ludopedia}</span>}
          <span className="spacer" />
          {ehDesejo ? (
            <button className="icon-btn comprar" onClick={semPropagar(() => onComprar(game))} title="Marcar como comprado">
              ✓ Comprei
            </button>
          ) : (
            <button className="icon-btn" onClick={semPropagar(() => onPlay(game))} title="Registrar partida">
              🎲 Joguei
            </button>
          )}
          <button className="icon-btn" onClick={semPropagar(() => onEdit(game))} title="Editar">
            ✎
          </button>
          <button className="icon-btn del" onClick={semPropagar(() => onDelete(game))} title={ehDesejo ? 'Remover dos desejos' : 'Excluir'}>
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}
