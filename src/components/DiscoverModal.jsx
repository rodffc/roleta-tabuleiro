import { useEffect, useState } from 'react'
import { listarFiltro, descobrirJogos, dadosPorSlug, precoPorSlug } from '../lib/ludopedia.js'
import { imgSrc } from '../lib/helpers.js'

const DIMS = [
  { tipo: 'categorias', label: 'Categoria / estilo' },
  { tipo: 'temas', label: 'Tema' },
  { tipo: 'mecanicas', label: 'Mecânica' },
]
const PAGE_SIZE = 24

// cache da última busca (persiste enquanto o app está aberto) — reabrir é instantâneo
let ultima = null

export default function DiscoverModal({ ondeEsta, onAddColecao, onAddDesejo, onClose }) {
  const [opcoes, setOpcoes] = useState({ categorias: [], temas: [], mecanicas: [] })
  const [sel, setSel] = useState(ultima?.sel || { categorias: '', temas: '', mecanicas: '' })
  const [pool, setPool] = useState(ultima?.pool || null)
  const [page, setPage] = useState(ultima?.page || 0)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const [addingKey, setAddingKey] = useState(null)

  // carrega as opções dos três filtros (cacheadas na lib)
  useEffect(() => {
    let vivo = true
    Promise.all(
      DIMS.map((d) => listarFiltro(d.tipo).then((l) => [d.tipo, l]).catch(() => [d.tipo, []])),
    ).then((pares) => vivo && setOpcoes(Object.fromEntries(pares)))
    return () => { vivo = false }
  }, [])

  const nomeDe = (tipo, id) => opcoes[tipo].find((o) => String(o.id) === String(id))?.nome || ''

  async function buscar() {
    const filtros = DIMS.filter((d) => sel[d.tipo]).map((d) => ({
      tipo: d.tipo,
      id: sel[d.tipo],
      nome: nomeDe(d.tipo, sel[d.tipo]),
    }))
    if (!filtros.length) {
      setErro('Escolha pelo menos um filtro.')
      return
    }
    setCarregando(true)
    setErro(null)
    setPool(null)
    try {
      const lista = await descobrirJogos(filtros)
      setPool(lista)
      setPage(0)
      ultima = { sel, pool: lista, page: 0 }
    } catch (e) {
      setErro('Falha na busca: ' + e.message)
    } finally {
      setCarregando(false)
    }
  }

  // mantém a página no cache ao navegar
  useEffect(() => {
    if (ultima && pool) ultima.page = page
  }, [page, pool])

  async function adicionar(g, destino) {
    const add = destino === 'desejos' ? onAddDesejo : onAddColecao
    setAddingKey(g.slug + destino)
    try {
      // busca detalhes e preço em paralelo
      const [ex, preco] = await Promise.all([
        dadosPorSlug(g.slug),
        precoPorSlug(g.slug).catch(() => null),
      ])
      const idadeMin = ex.idade ? Number(String(ex.idade).match(/\d+/)?.[0]) : null
      add({
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
        descricao: ex.descricao || g.descricao || '',
        preco: preco ?? null,
        ludopediaUrl: ex.ludopediaUrl || g.ludopediaUrl,
      })
    } catch {
      add(g)
    } finally {
      setAddingKey(null)
    }
  }

  const totalPaginas = pool ? Math.max(1, Math.ceil(pool.length / PAGE_SIZE)) : 0
  const itens = pool ? pool.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : []

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>🔎 Descobrir jogos novos</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, color: 'var(--text-soft)', fontSize: '0.85rem' }}>
            Combine um ou mais filtros (categoria, tema, mecânica) e busque no acervo da Ludopedia.
          </p>

          <div className="discover-filtros">
            {DIMS.map((d) => (
              <label key={d.tipo}>
                {d.label}
                <select
                  value={sel[d.tipo]}
                  onChange={(e) => setSel((s) => ({ ...s, [d.tipo]: e.target.value }))}
                >
                  <option value="">Qualquer</option>
                  {opcoes[d.tipo].map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </label>
            ))}
            <button
              className="btn btn-green btn-sm"
              onClick={buscar}
              disabled={carregando}
              style={{ alignSelf: 'flex-end' }}
            >
              {carregando ? '⏳…' : '🔎 Buscar'}
            </button>
          </div>

          {erro && <p className="busca-erro" style={{ marginTop: 10 }}>{erro}</p>}

          {pool && (
            <>
              <div className="discover-head">
                <h4 className="detail-section" style={{ margin: 0 }}>{pool.length} jogo(s)</h4>
                {totalPaginas > 1 && (
                  <div className="pager">
                    <button className="btn btn-sm btn-outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹</button>
                    <span>Pág. {page + 1}/{totalPaginas}</span>
                    <button className="btn btn-sm btn-outline" disabled={page >= totalPaginas - 1} onClick={() => setPage((p) => p + 1)}>›</button>
                  </div>
                )}
              </div>

              <div className="discover-list">
                {itens.map((g, i) => {
                  const onde = ondeEsta(g)
                  const ocupado = addingKey === g.slug + 'colecao' || addingKey === g.slug + 'desejos'
                  return (
                    <div className="discover-item" key={g.slug}>
                      <span className="discover-rank">{page * PAGE_SIZE + i + 1}</span>
                      {imgSrc(g.imageUrl) ? (
                        <img src={imgSrc(g.imageUrl)} alt={g.nome} loading="lazy" />
                      ) : (
                        <span className="discover-ph">🎲</span>
                      )}
                      <div className="discover-info">
                        <a href={g.ludopediaUrl} target="_blank" rel="noreferrer" className="discover-nome">
                          {g.nome}
                        </a>
                        <span>{g.estilo}</span>
                      </div>
                      {onde ? (
                        <span className="discover-status">
                          {onde === 'desejos' ? '💖 Nos desejos' : '✓ Na coleção'}
                        </span>
                      ) : (
                        <div className="discover-acoes">
                          <button className="btn btn-sm btn-green" disabled={ocupado} onClick={() => adicionar(g, 'colecao')} title="Adicionar à coleção">
                            {addingKey === g.slug + 'colecao' ? '⏳' : '➕ Coleção'}
                          </button>
                          <button className="btn btn-sm btn-outline" disabled={ocupado} onClick={() => adicionar(g, 'desejos')} title="Adicionar à lista de desejos">
                            {addingKey === g.slug + 'desejos' ? '⏳' : '💖 Desejo'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {pool.length === 0 && (
                  <p style={{ color: 'var(--text-soft)' }}>
                    Nenhum jogo encontrado com esses filtros combinados. Tente menos filtros.
                  </p>
                )}
              </div>

              {totalPaginas > 1 && (
                <div className="pager" style={{ justifyContent: 'center', marginTop: 12 }}>
                  <button className="btn btn-sm btn-outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ Anterior</button>
                  <span>Pág. {page + 1}/{totalPaginas}</span>
                  <button className="btn btn-sm btn-outline" disabled={page >= totalPaginas - 1} onClick={() => setPage((p) => p + 1)}>Próxima ›</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
