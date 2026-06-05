import { useEffect, useMemo, useState } from 'react'
import { listarFiltro, descobrirJogos, dadosPorSlug } from '../lib/ludopedia.js'
import { imgSrc } from '../lib/helpers.js'

const TIPOS = [
  { key: 'categorias', label: 'Categoria / estilo' },
  { key: 'temas', label: 'Tema' },
  { key: 'mecanicas', label: 'Mecânica' },
]

export default function DiscoverModal({ jaNaColecao, onAdd, onClose }) {
  const [tipo, setTipo] = useState('categorias')
  const [opcoes, setOpcoes] = useState([])
  const [id, setId] = useState('')
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(false)

  const [resultados, setResultados] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const [addingSlug, setAddingSlug] = useState(null)

  // carrega as opções do tipo escolhido (categorias/temas/mecanicas)
  useEffect(() => {
    let vivo = true
    setCarregandoOpcoes(true)
    setId('')
    listarFiltro(tipo)
      .then((l) => vivo && setOpcoes(l))
      .catch(() => vivo && setErro('Não foi possível carregar a lista de filtros.'))
      .finally(() => vivo && setCarregandoOpcoes(false))
    return () => { vivo = false }
  }, [tipo])

  const nomeFiltro = useMemo(
    () => opcoes.find((o) => String(o.id) === String(id))?.nome || '',
    [opcoes, id],
  )

  async function buscar() {
    if (!id) {
      setErro('Escolha uma opção para buscar.')
      return
    }
    setCarregando(true)
    setErro(null)
    setResultados(null)
    try {
      const lista = await descobrirJogos(tipo, id)
      setResultados(lista.map((g) => ({ ...g, estilo: g.estilo || nomeFiltro })))
    } catch (e) {
      setErro(`Falha na busca: ${e.message}`)
    } finally {
      setCarregando(false)
    }
  }

  async function adicionar(g) {
    setAddingSlug(g.slug)
    try {
      const ex = await dadosPorSlug(g.slug) // enriquece com jogadores/tempo/idade/nota
      const idadeMin = ex.idade ? Number(String(ex.idade).match(/\d+/)?.[0]) : null
      onAdd({
        ...g,
        nome: ex.nome || g.nome,
        imageUrl: ex.imageUrl || g.imageUrl,
        idade: ex.idade ?? g.idade,
        idade_min: idadeMin,
        tempo_min: ex.tempo_min ?? null,
        tempo_max: ex.tempo_max ?? null,
        jogadores_min: ex.jogadores_min ?? null,
        jogadores_max: ex.jogadores_max ?? null,
        nota_ludopedia: ex.nota_ludopedia ?? null,
        rank_ludopedia: ex.rank_ludopedia ?? null,
        ludopediaUrl: ex.ludopediaUrl || g.ludopediaUrl,
      })
    } catch {
      onAdd(g) // ao menos adiciona com os dados básicos
    } finally {
      setAddingSlug(null)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>🔎 Descobrir jogos novos</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, color: 'var(--text-soft)', fontSize: '0.85rem' }}>
            Navegue pelo acervo da Ludopedia por categoria/estilo, tema ou mecânica e adicione à sua coleção.
          </p>

          <div className="discover-filtros">
            <label>
              Filtrar por
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </label>
            <label style={{ flex: 1, minWidth: 180 }}>
              {carregandoOpcoes ? 'Carregando…' : `Opção (${opcoes.length})`}
              <select value={id} onChange={(e) => setId(e.target.value)} disabled={carregandoOpcoes}>
                <option value="">Selecione…</option>
                {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </label>
            <button
              className="btn btn-green btn-sm"
              onClick={buscar}
              disabled={carregando || !id}
              style={{ alignSelf: 'flex-end' }}
            >
              {carregando ? '⏳…' : '🔎 Buscar'}
            </button>
          </div>

          {erro && <p className="busca-erro" style={{ marginTop: 10 }}>{erro}</p>}

          {resultados && (
            <>
              <h4 className="detail-section">{resultados.length} jogo(s) — {nomeFiltro}</h4>
              <div className="discover-list">
                {resultados.map((g) => {
                  const ja = jaNaColecao(g)
                  return (
                    <div className="discover-item" key={g.slug}>
                      {imgSrc(g.imageUrl) ? (
                        <img src={imgSrc(g.imageUrl)} alt={g.nome} loading="lazy" />
                      ) : (
                        <span className="discover-ph">🎲</span>
                      )}
                      <div className="discover-info">
                        <b>{g.nome}</b>
                        <span>{nomeFiltro}</span>
                      </div>
                      <button
                        className={'btn btn-sm ' + (ja ? 'btn-outline' : 'btn-green')}
                        disabled={ja || addingSlug === g.slug}
                        onClick={() => adicionar(g)}
                      >
                        {ja ? '✓ Na coleção' : addingSlug === g.slug ? '⏳…' : '➕ Adicionar'}
                      </button>
                    </div>
                  )
                })}
                {resultados.length === 0 && (
                  <p style={{ color: 'var(--text-soft)' }}>Nenhum jogo encontrado nesse filtro.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
