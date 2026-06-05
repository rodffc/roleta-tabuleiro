import { useEffect, useMemo, useState } from 'react'
import {
  getToken,
  setToken,
  buscarJogosApi,
  jogoApiParaColecao,
  listarCategorias,
  listarTemas,
} from '../lib/ludopedia.js'
import { imgSrc, formatJogadores, formatTempo } from '../lib/helpers.js'

export default function DiscoverModal({ jaNaColecao, onAdd, onClose }) {
  const [token, setTok] = useState(getToken())
  const [salvouToken, setSalvouToken] = useState(!!getToken())

  const [search, setSearch] = useState('')
  const [filtros, setFiltros] = useState({
    jogadores: 0, tempoMax: 0, idadeMax: 0, anoMin: 0, tipo: 'Todos', idCategoria: '', idTema: '',
  })
  const [resultados, setResultados] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)

  const [categorias, setCategorias] = useState([])
  const [temas, setTemas] = useState([])

  // carrega listas de estilo/categoria e tema quando há token
  useEffect(() => {
    if (!salvouToken) return
    let vivo = true
    listarCategorias().then((c) => vivo && setCategorias(c)).catch(() => {})
    listarTemas().then((t) => vivo && setTemas(t)).catch(() => {})
    return () => { vivo = false }
  }, [salvouToken])

  function salvarToken() {
    setToken(token)
    setSalvouToken(!!token.trim())
    setErro(null)
  }

  async function buscar() {
    setCarregando(true)
    setErro(null)
    setResultados(null)
    try {
      const lista = await buscarJogosApi({
        search,
        idCategoria: filtros.idCategoria,
        idTema: filtros.idTema,
        rows: 100,
      })
      const nomeCat = categorias.find((c) => String(c.id) === String(filtros.idCategoria))?.nome
      setResultados(
        lista.map((j) => {
          const g = jogoApiParaColecao(j)
          if (!g.estilo && nomeCat) g.estilo = nomeCat // usa a categoria escolhida como estilo
          return g
        }),
      )
    } catch (e) {
      if (e.message === 'SEM_TOKEN') setErro('Configure seu token da Ludopedia primeiro.')
      else if (e.message === 'TOKEN_INVALIDO') setErro('Token inválido ou expirado. Gere um novo e salve.')
      else setErro(`Falha na busca: ${e.message}`)
    } finally {
      setCarregando(false)
    }
  }

  // filtros aplicados no cliente sobre o resultado da API
  const filtrados = useMemo(() => {
    if (!resultados) return null
    return resultados.filter((g) => {
      if (filtros.jogadores > 0) {
        const min = g.jogadores_min ?? 1
        const max = g.jogadores_max ?? 99
        if (filtros.jogadores < min || filtros.jogadores > max) return false
      }
      if (filtros.tempoMax > 0 && g.tempo_min != null && g.tempo_min > filtros.tempoMax) return false
      if (filtros.idadeMax > 0 && g.idade_min != null && g.idade_min > filtros.idadeMax) return false
      if (filtros.anoMin > 0 && g.ano && Number(g.ano) < filtros.anoMin) return false
      if (filtros.tipo !== 'Todos') {
        const ehExp = /expan/i.test(g.tipo)
        if (filtros.tipo === 'Base' && ehExp) return false
        if (filtros.tipo === 'Expansão' && !ehExp) return false
      }
      return true
    })
  }, [resultados, filtros])

  const setF = (patch) => setFiltros((f) => ({ ...f, ...patch }))

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>🔎 Descobrir jogos novos</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Token */}
          <details open={!salvouToken} className="token-box">
            <summary>{salvouToken ? '🔑 Token configurado (alterar)' : '🔑 Configurar token da Ludopedia'}</summary>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-soft)', margin: '8px 0' }}>
              Em{' '}
              <a href="https://ludopedia.com.br/aplicativos" target="_blank" rel="noreferrer" className="lp-link">
                ludopedia.com.br/aplicativos
              </a>{' '}
              clique em <b>Novo Aplicativo</b>, salve, e copie o campo{' '}
              <b>“Access Token (Usuário)”</b>. Cole abaixo — fica salvo só no seu aparelho.
            </p>
            <div className="busca-row">
              <input
                type="password"
                value={token}
                onChange={(e) => setTok(e.target.value)}
                placeholder="cole o access token aqui"
              />
              <button className="btn btn-green btn-sm" onClick={salvarToken}>Salvar</button>
            </div>
          </details>

          {/* Busca + filtros */}
          <div className="form-row" style={{ marginTop: 12 }}>
            <label>Palavra-chave (opcional)</label>
            <div className="busca-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ex: cooperativo, deck building, nome…"
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
              />
              <button className="btn btn-green btn-sm" onClick={buscar} disabled={carregando}>
                {carregando ? '⏳…' : '🔎 Buscar'}
              </button>
            </div>
          </div>

          <div className="discover-filtros">
            <label>
              Estilo / categoria
              <select value={filtros.idCategoria} onChange={(e) => setF({ idCategoria: e.target.value })}>
                <option value="">Qualquer</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <label>
              Tema
              <select value={filtros.idTema} onChange={(e) => setF({ idTema: e.target.value })}>
                <option value="">Qualquer</option>
                {temas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </label>
            <label>
              Jogadores
              <select value={filtros.jogadores} onChange={(e) => setF({ jogadores: Number(e.target.value) })}>
                <option value={0}>Qualquer</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>
              Tempo até
              <select value={filtros.tempoMax} onChange={(e) => setF({ tempoMax: Number(e.target.value) })}>
                <option value={0}>Qualquer</option>
                {[15, 30, 45, 60, 90, 120].map((n) => <option key={n} value={n}>{n} min</option>)}
              </select>
            </label>
            <label>
              Idade até
              <select value={filtros.idadeMax} onChange={(e) => setF({ idadeMax: Number(e.target.value) })}>
                <option value={0}>Qualquer</option>
                {[6, 8, 10, 12, 14, 16].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </label>
            <label>
              Ano a partir de
              <select value={filtros.anoMin} onChange={(e) => setF({ anoMin: Number(e.target.value) })}>
                <option value={0}>Qualquer</option>
                {[2024, 2020, 2015, 2010, 2000].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>
              Tipo
              <select value={filtros.tipo} onChange={(e) => setF({ tipo: e.target.value })}>
                <option>Todos</option>
                <option>Base</option>
                <option>Expansão</option>
              </select>
            </label>
          </div>

          {erro && <p className="busca-erro" style={{ marginTop: 10 }}>{erro}</p>}

          {/* Resultados */}
          {filtrados && (
            <>
              <h4 className="detail-section">{filtrados.length} resultado(s)</h4>
              <div className="discover-list">
                {filtrados.map((g, i) => {
                  const ja = jaNaColecao(g)
                  return (
                    <div className="discover-item" key={(g.ludopediaUrl || g.nome) + i}>
                      {imgSrc(g.imageUrl) ? (
                        <img src={imgSrc(g.imageUrl)} alt={g.nome} loading="lazy" />
                      ) : (
                        <span className="discover-ph">🎲</span>
                      )}
                      <div className="discover-info">
                        <b>{g.nome}{/expan/i.test(g.tipo) ? ' (Exp)' : ''}</b>
                        <span>
                          {g.ano || '—'} · 👥 {formatJogadores(g)} · ⏱ {formatTempo(g)}
                          {g.idade ? ` · ${g.idade}` : ''}
                        </span>
                      </div>
                      <button
                        className={'btn btn-sm ' + (ja ? 'btn-outline' : 'btn-green')}
                        disabled={ja}
                        onClick={() => onAdd(g)}
                      >
                        {ja ? '✓ Na coleção' : '➕ Adicionar'}
                      </button>
                    </div>
                  )
                })}
                {filtrados.length === 0 && (
                  <p style={{ color: 'var(--text-soft)' }}>Nenhum jogo no resultado bate com os filtros.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
