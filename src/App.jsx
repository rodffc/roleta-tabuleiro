import { useEffect, useMemo, useState } from 'react'
import GameCard from './components/GameCard.jsx'
import Filters from './components/Filters.jsx'
import RouletteModal from './components/RouletteModal.jsx'
import GameFormModal from './components/GameFormModal.jsx'
import HistoryModal from './components/HistoryModal.jsx'
import GameDetailModal from './components/GameDetailModal.jsx'
import PlayLogModal from './components/PlayLogModal.jsx'
import BackupModal from './components/BackupModal.jsx'
import DiscoverModal from './components/DiscoverModal.jsx'
import { categoriasDe, todasCategorias, anoNum, slug } from './lib/helpers.js'
import {
  loadGames,
  saveGames,
  loadFavs,
  saveFavs,
  loadHistory,
  saveHistory,
  resetGames,
  syncFromSeed,
  markDeleted,
} from './lib/storage.js'

const FILTROS_INICIAIS = {
  categorias: [],
  tipo: 'Todos',
  jogadores: 0,
  tempoMax: 60,
  idadeMax: 16,
  soFavoritos: false,
}

export default function App() {
  const [games, setGames] = useState(loadGames)
  const [favs, setFavs] = useState(loadFavs)
  const [history, setHistory] = useState(loadHistory)

  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('nota')
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
  const [mostraFiltros, setMostraFiltros] = useState(false)

  const [roleta, setRoleta] = useState(false)
  const [formGame, setFormGame] = useState(undefined) // undefined=fechado, null=novo, obj=editar
  const [detailGame, setDetailGame] = useState(null)
  const [playGame, setPlayGame] = useState(null)
  const [mostraHist, setMostraHist] = useState(false)
  const [mostraBackup, setMostraBackup] = useState(false)
  const [mostraDescobrir, setMostraDescobrir] = useState(false)

  useEffect(() => saveGames(games), [games])
  useEffect(() => saveFavs(favs), [favs])
  useEffect(() => saveHistory(history), [history])

  const categorias = useMemo(() => todasCategorias(games), [games])

  // contagem de partidas por jogo
  const vezesPorJogo = useMemo(() => {
    const c = {}
    for (const h of history) c[h.gameId] = (c[h.gameId] || 0) + 1
    return c
  }, [history])

  // ---------- Filtragem + ordenação ----------
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    let lista = games.filter((g) => {
      if (termo) {
        const alvo = [g.nome, g.estilo, g.editora, ...(g.busca || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!alvo.includes(termo)) return false
      }
      if (filtros.categorias.length) {
        const cats = categoriasDe(g.estilo)
        if (!filtros.categorias.every((c) => cats.includes(c))) return false
      }
      if (filtros.tipo !== 'Todos') {
        const ehExp = /expans/i.test(g.tipo || '')
        if (filtros.tipo === 'Expansão' && !ehExp) return false
        if (filtros.tipo === 'Base' && ehExp) return false
      }
      if (filtros.jogadores > 0) {
        const min = g.jogadores_min ?? 1
        const max = g.jogadores_max ?? 99
        if (filtros.jogadores < min || filtros.jogadores > max) return false
      }
      if (filtros.tempoMax < 60) {
        const t = g.tempo_min ?? g.tempo_max
        if (t != null && t > filtros.tempoMax) return false
      }
      if (filtros.idadeMax < 16) {
        if (g.idade_min != null && g.idade_min > filtros.idadeMax) return false
      }
      if (filtros.soFavoritos && !favs.includes(g.id)) return false
      return true
    })

    lista = [...lista].sort((a, b) => {
      switch (ordem) {
        case 'nome':
          return a.nome.localeCompare(b.nome, 'pt-BR')
        case 'rank':
          return (a.rank_ludopedia ?? 1e9) - (b.rank_ludopedia ?? 1e9)
        case 'tempo':
          return (a.tempo_min ?? 1e9) - (b.tempo_min ?? 1e9)
        case 'preco':
          return (a.preco ?? Infinity) - (b.preco ?? Infinity)
        case 'ano':
          return (anoNum(b.ano) ?? -Infinity) - (anoNum(a.ano) ?? -Infinity)
        case 'nota':
        default:
          return (b.nota_ludopedia ?? -1) - (a.nota_ludopedia ?? -1)
      }
    })
    return lista
  }, [games, busca, filtros, ordem, favs])

  const filtrosAtivos =
    filtros.categorias.length > 0 ||
    filtros.tipo !== 'Todos' ||
    filtros.jogadores > 0 ||
    filtros.tempoMax < 60 ||
    filtros.idadeMax < 16 ||
    filtros.soFavoritos

  // ---------- Ações ----------
  const toggleFav = (id) =>
    setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  // abre o modal que pergunta com quantas pessoas jogou
  const abrirRegistro = (game) => {
    setDetailGame(null)
    setPlayGame(game)
  }
  const confirmarPartida = (game, players) => {
    setHistory((h) => [
      ...h,
      { gameId: game.id, nome: game.nome, players, date: new Date().toISOString() },
    ])
    setPlayGame(null)
  }

  const excluirJogo = (game) => {
    if (confirm(`Excluir “${game.nome}” da sua coleção?`)) {
      markDeleted(game.id)
      setGames((gs) => gs.filter((g) => g.id !== game.id))
      setDetailGame(null)
    }
  }

  const salvarJogo = (jogo, editando) => {
    setGames((gs) => {
      if (editando) return gs.map((g) => (g.id === jogo.id ? jogo : g))
      if (gs.some((g) => g.id === jogo.id)) jogo.id = `${jogo.id}-${Date.now()}`
      return [...gs, jogo]
    })
    setFormGame(undefined)
  }

  const editarJogo = (game) => {
    setDetailGame(null)
    setFormGame(game)
  }

  // já existe na coleção? (por link da Ludopedia ou nome)
  const jaNaColecao = (g) =>
    games.some(
      (x) =>
        (g.ludopediaUrl && x.ludopediaUrl === g.ludopediaUrl) ||
        x.nome.toLowerCase() === g.nome.toLowerCase(),
    )

  const adicionarDescoberto = (g) => {
    setGames((gs) => {
      if (
        gs.some(
          (x) =>
            (g.ludopediaUrl && x.ludopediaUrl === g.ludopediaUrl) ||
            x.nome.toLowerCase() === g.nome.toLowerCase(),
        )
      )
        return gs
      let id = slug(g.nome) || `jogo-${Date.now()}`
      if (gs.some((x) => x.id === id)) id = `${id}-${Date.now()}`
      return [...gs, { ...g, id, busca: [g.nome.toLowerCase()] }]
    })
  }

  const restaurar = () => {
    if (confirm('Restaurar a coleção original do arquivo? Suas inclusões/exclusões locais serão perdidas.')) {
      setGames(resetGames())
    }
  }

  const atualizarDados = () => {
    if (
      confirm(
        'Atualizar capas, notas e ranking a partir do arquivo de dados (gerado por "npm run enrich")? Seus jogos adicionados e demais edições são mantidos.',
      )
    ) {
      setGames((gs) => syncFromSeed(gs))
    }
  }

  const abrirRoleta = () => {
    if (filtrados.length === 0) {
      alert('Nenhum jogo no filtro atual para sortear. Ajuste os filtros.')
      return
    }
    setRoleta(true)
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <img src="/dice.svg" alt="" />
            <div>
              Roleta de Tabuleiro
              <small>minha coleção · estilo Ludopedia</small>
            </div>
          </div>
          <div className="header-spacer" />
          <div className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              placeholder="Buscar por nome, estilo, editora…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="container has-bottom-nav">
        <div className="toolbar">
          <button
            className={'btn btn-sm ' + (mostraFiltros || filtrosAtivos ? 'btn-green' : 'btn-outline')}
            onClick={() => setMostraFiltros((v) => !v)}
          >
            ⚙ Filtros{filtrosAtivos ? ' •' : ''}
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-soft)' }}>
            Ordenar:
            <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
              <option value="nota">Nota (maior)</option>
              <option value="rank">Ranking Ludopedia</option>
              <option value="nome">Nome (A–Z)</option>
              <option value="tempo">Duração (menor)</option>
              <option value="preco">Preço (menor)</option>
              <option value="ano">Ano (mais recente)</option>
            </select>
          </label>
          <span className="count">{filtrados.length} de {games.length} jogos</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-sm btn-outline" onClick={() => setMostraBackup(true)} title="Salvar/restaurar seus dados">💾 Backup</button>
        </div>

        {mostraFiltros && (
          <Filters
            filtros={filtros}
            setFiltros={setFiltros}
            categorias={categorias}
            onReset={() => setFiltros(FILTROS_INICIAIS)}
          />
        )}

        {filtrados.length === 0 ? (
          <div className="empty">
            <p style={{ fontSize: '2.4rem', margin: 0 }}>🎲</p>
            <p>Nenhum jogo encontrado com esses filtros.</p>
            <button className="btn btn-outline btn-sm" onClick={() => { setBusca(''); setFiltros(FILTROS_INICIAIS) }}>
              Limpar tudo
            </button>
          </div>
        ) : (
          <div className="grid">
            {filtrados.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                fav={favs.includes(g.id)}
                onOpen={setDetailGame}
                onToggleFav={toggleFav}
                onPlay={abrirRegistro}
                onEdit={(game) => setFormGame(game)}
                onDelete={excluirJogo}
              />
            ))}
          </div>
        )}

        <footer style={{ textAlign: 'center', color: 'var(--text-soft)', fontSize: '0.8rem', marginTop: 32, paddingBottom: 20 }}>
          Dados e capas: Ludopedia ·{' '}
          <button className="icon-btn" onClick={restaurar}>restaurar coleção original</button>
        </footer>
      </main>

      <nav className="bottom-nav">
        <button onClick={() => setFormGame(null)}>
          <span className="ico">➕</span>
          Novo
        </button>
        <button onClick={() => setMostraDescobrir(true)}>
          <span className="ico">🔎</span>
          Descobrir
        </button>
        <button className="destaque" onClick={abrirRoleta}>
          <span className="ico">🎡</span>
          Roleta
        </button>
        <button onClick={() => setMostraHist(true)}>
          <span className="ico">📜</span>
          Histórico
        </button>
        <button onClick={atualizarDados} title="Atualizar capas, notas e ranking">
          <span className="ico">🔄</span>
          Atualizar
        </button>
      </nav>

      {roleta && (
        <RouletteModal pool={filtrados} onClose={() => setRoleta(false)} onPlay={abrirRegistro} />
      )}
      {detailGame && (
        <GameDetailModal
          game={detailGame}
          fav={favs.includes(detailGame.id)}
          vezesJogado={vezesPorJogo[detailGame.id] || 0}
          onClose={() => setDetailGame(null)}
          onToggleFav={toggleFav}
          onPlay={abrirRegistro}
          onEdit={editarJogo}
          onDelete={excluirJogo}
        />
      )}
      {playGame && (
        <PlayLogModal game={playGame} onClose={() => setPlayGame(null)} onConfirm={confirmarPartida} />
      )}
      {formGame !== undefined && (
        <GameFormModal game={formGame} onClose={() => setFormGame(undefined)} onSave={salvarJogo} />
      )}
      {mostraHist && (
        <HistoryModal
          history={history}
          games={games}
          onClose={() => setMostraHist(false)}
          onClear={() => { if (confirm('Limpar todo o histórico?')) setHistory([]) }}
        />
      )}
      {mostraDescobrir && (
        <DiscoverModal
          jaNaColecao={jaNaColecao}
          onAdd={adicionarDescoberto}
          onClose={() => setMostraDescobrir(false)}
        />
      )}
      {mostraBackup && (
        <BackupModal
          onClose={() => setMostraBackup(false)}
          onImported={() => {
            // recarrega o estado a partir do que foi restaurado
            setGames(loadGames())
            setFavs(loadFavs())
            setHistory(loadHistory())
          }}
        />
      )}
    </>
  )
}
