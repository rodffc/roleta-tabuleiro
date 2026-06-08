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
import { precoPorSlug } from './lib/ludopedia.js'
import {
  loadGames,
  saveGames,
  loadFavs,
  saveFavs,
  loadHistory,
  saveHistory,
  loadWishlist,
  saveWishlist,
  excluirTodaColecao,
  syncFromSeed,
  markDeleted,
  idsDoArquivo,
} from './lib/storage.js'

const FILTROS_INICIAIS = {
  categorias: [],
  tipo: 'Todos',
  jogadores: 0,
  tempoMax: 60,
  idadeMax: 16,
  soFavoritos: false,
  partidas: 'qualquer', // 'qualquer' | 'nunca' | '1' | '3' | '5'
}

export default function App() {
  const [games, setGames] = useState(loadGames)
  const [favs, setFavs] = useState(loadFavs)
  const [history, setHistory] = useState(loadHistory)
  const [wishlist, setWishlist] = useState(loadWishlist)
  const [aba, setAba] = useState('colecao') // 'colecao' | 'desejos'

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
  const [roletaImgOk, setRoletaImgOk] = useState(true)

  useEffect(() => saveGames(games), [games])
  useEffect(() => saveFavs(favs), [favs])
  useEffect(() => saveHistory(history), [history])
  useEffect(() => saveWishlist(wishlist), [wishlist])

  // lista exibida conforme a aba (coleção ou lista de desejos)
  const listaBase = aba === 'desejos' ? wishlist : games
  const categorias = useMemo(() => todasCategorias(listaBase), [listaBase])

  // contagem de partidas por jogo
  const vezesPorJogo = useMemo(() => {
    const c = {}
    for (const h of history) c[h.gameId] = (c[h.gameId] || 0) + 1
    return c
  }, [history])

  // ---------- Filtragem + ordenação ----------
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    let lista = listaBase.filter((g) => {
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
      if (filtros.partidas !== 'qualquer') {
        const n = vezesPorJogo[g.id] || 0
        if (filtros.partidas === 'nunca') {
          if (n !== 0) return false
        } else if (n < Number(filtros.partidas)) return false
      }
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
  }, [listaBase, busca, filtros, ordem, favs, vezesPorJogo])

  const filtrosAtivos =
    filtros.categorias.length > 0 ||
    filtros.tipo !== 'Todos' ||
    filtros.jogadores > 0 ||
    filtros.tempoMax < 60 ||
    filtros.idadeMax < 16 ||
    filtros.soFavoritos ||
    filtros.partidas !== 'qualquer'

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

  const ehMesmoJogo = (a, b) =>
    (a.ludopediaUrl && a.ludopediaUrl === b.ludopediaUrl) ||
    a.nome.toLowerCase() === b.nome.toLowerCase()

  const excluirJogo = (game) => {
    const naWish = wishlist.some((w) => w.id === game.id)
    if (naWish) {
      if (confirm(`Remover “${game.nome}” da lista de desejos?`)) {
        setWishlist((w) => w.filter((g) => g.id !== game.id))
        setDetailGame(null)
      }
      return
    }
    if (confirm(`Excluir “${game.nome}” da sua coleção?`)) {
      markDeleted(game.id)
      setGames((gs) => gs.filter((g) => g.id !== game.id))
      setDetailGame(null)
    }
  }

  const salvarJogo = (jogo, editando) => {
    const naWish = editando && wishlist.some((w) => w.id === jogo.id)
    if (naWish) {
      setWishlist((w) => w.map((g) => (g.id === jogo.id ? jogo : g)))
      setFormGame(undefined)
      return
    }
    if (editando) {
      setGames((gs) => gs.map((g) => (g.id === jogo.id ? jogo : g)))
      setFormGame(undefined)
      return
    }
    // novo: vai para a lista da aba atual, com id que não colide com o arquivo
    jogo.id = gerarIdUnico(jogo.nome)
    if (aba === 'desejos') {
      setWishlist((lst) => [...lst, { ...jogo, dataInclusao: new Date().toISOString() }])
    } else {
      setGames((lst) => [...lst, jogo])
    }
    setFormGame(undefined)
  }

  const editarJogo = (game) => {
    setDetailGame(null)
    setFormGame(game)
  }

  // já existe na coleção OU na lista de desejos?
  const ondeEsta = (g) => {
    if (games.some((x) => ehMesmoJogo(x, g))) return 'colecao'
    if (wishlist.some((x) => ehMesmoJogo(x, g))) return 'desejos'
    return null
  }

  // gera um id que não colide com a coleção, os desejos NEM os jogos do arquivo
  const gerarIdUnico = (nome) => {
    const base = slug(nome) || 'jogo'
    const tomado = new Set([
      ...games.map((g) => g.id),
      ...wishlist.map((g) => g.id),
      ...idsDoArquivo(),
    ])
    let id = base
    let i = 1
    while (tomado.has(id)) id = `${base}-${++i}`
    return id
  }

  const novoComId = (g) => ({
    ...g,
    id: gerarIdUnico(g.nome),
    busca: g.busca || [g.nome.toLowerCase()],
  })

  const adicionarDescoberto = (g) => {
    if (ondeEsta(g)) return
    setGames((gs) => [...gs, novoComId(g)])
  }

  const adicionarDesejo = (g) => {
    if (ondeEsta(g)) return
    setWishlist((w) => [...w, { ...novoComId(g), dataInclusao: new Date().toISOString() }])
  }

  // marca um item da lista de desejos como comprado: sai dos desejos, entra na coleção
  const comprar = (game) => {
    setWishlist((w) => w.filter((g) => g.id !== game.id))
    setGames((gs) => (gs.some((x) => x.id === game.id) ? gs : [...gs, game]))
    setDetailGame(null)
  }

  const excluirTodos = () => {
    if (aba === 'desejos') {
      if (wishlist.length && confirm('Excluir TODOS os jogos da lista de desejos?')) setWishlist([])
      return
    }
    if (games.length && confirm('Excluir TODOS os jogos da sua coleção? Esta ação não pode ser desfeita (use o Backup antes, se quiser).')) {
      setGames(excluirTodaColecao())
    }
  }

  const [atualizando, setAtualizando] = useState(false)
  const atualizarDados = async () => {
    if (
      !confirm(
        'Atualizar capas, notas e ranking da coleção (do arquivo) e os preços da lista de desejos (na Ludopedia)?',
      )
    )
      return
    setAtualizando(true)
    setGames((gs) => syncFromSeed(gs))
    // preços da lista de desejos: busca ao vivo na Ludopedia
    if (wishlist.length) {
      try {
        const atualizados = await Promise.all(
          wishlist.map(async (g) => {
            const s = (g.ludopediaUrl || '').match(/\/jogo\/([a-z0-9-]+)/)?.[1]
            if (!s) return g
            try {
              const p = await precoPorSlug(s)
              return p != null ? { ...g, preco: p } : g
            } catch {
              return g
            }
          }),
        )
        setWishlist(atualizados)
      } catch {
        /* ignora falhas de rede */
      }
    }
    setAtualizando(false)
    alert('Atualização concluída.')
  }

  // troca de aba: filtros e busca são independentes por aba (não vazam)
  const trocarAba = (nova) => {
    if (nova === aba) return
    setAba(nova)
    setBusca('')
    setFiltros(FILTROS_INICIAIS)
    setMostraFiltros(false)
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
            <img src="/titulo.png" alt="Roleta dos jogos" className="brand-logo" />
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
        <div className="tabs">
          <button
            className={'tab' + (aba === 'colecao' ? ' active' : '')}
            onClick={() => trocarAba('colecao')}
          >
            🎲 Minha coleção <span className="tab-count">{games.length}</span>
          </button>
          <button
            className={'tab' + (aba === 'desejos' ? ' active' : '')}
            onClick={() => trocarAba('desejos')}
          >
            💖 Lista de desejos <span className="tab-count">{wishlist.length}</span>
          </button>
        </div>

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
          <span className="count">{filtrados.length} de {listaBase.length} jogos</span>
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
            <p style={{ fontSize: '2.4rem', margin: 0 }}>{aba === 'desejos' ? '💖' : '🎲'}</p>
            <p>
              {aba === 'desejos' && wishlist.length === 0
                ? 'Sua lista de desejos está vazia. Use 🔎 Descobrir e toque em “💖 Desejo”.'
                : 'Nenhum jogo encontrado com esses filtros.'}
            </p>
            {(busca || filtrosAtivos) && (
              <button className="btn btn-outline btn-sm" onClick={() => { setBusca(''); setFiltros(FILTROS_INICIAIS) }}>
                Limpar tudo
              </button>
            )}
          </div>
        ) : (
          <div className="grid">
            {filtrados.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                modo={aba}
                fav={favs.includes(g.id)}
                onOpen={setDetailGame}
                onToggleFav={toggleFav}
                onPlay={abrirRegistro}
                onComprar={comprar}
                onEdit={(game) => setFormGame(game)}
                onDelete={excluirJogo}
              />
            ))}
          </div>
        )}

        <footer style={{ textAlign: 'center', color: 'var(--text-soft)', fontSize: '0.8rem', marginTop: 32, paddingBottom: 20 }}>
          <div>
            Dados e capas: Ludopedia ·{' '}
            <button className="icon-btn del" onClick={excluirTodos}>
              {aba === 'desejos' ? 'esvaziar lista de desejos' : 'excluir todos os jogos'}
            </button>
          </div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>App criado por Rodrigo de Campos</div>
        </footer>
      </main>

      <nav className="bottom-nav">
        <button onClick={() => setFormGame(null)}>
          <img src="/adicionar.png" alt="" className="ico ico-img" />
          Adicionar
        </button>
        <button onClick={() => setMostraDescobrir(true)}>
          <img src="/buscar.png" alt="" className="ico ico-img" />
          Buscar
        </button>
        <button className="destaque" onClick={abrirRoleta}>
          {roletaImgOk ? (
            <img src="/roleta.png" alt="" className="ico ico-roleta" onError={() => setRoletaImgOk(false)} />
          ) : (
            <span className="ico">🎡</span>
          )}
          Roleta
        </button>
        <button onClick={() => setMostraHist(true)}>
          <img src="/historico.png" alt="" className="ico ico-img" />
          Histórico
        </button>
        <button onClick={atualizarDados} disabled={atualizando} title="Atualizar dados e preços dos desejos">
          {atualizando ? <span className="ico">⏳</span> : <img src="/atualizar.png" alt="" className="ico ico-img" />}
          Atualizar
        </button>
      </nav>

      {roleta && (
        <RouletteModal pool={filtrados} onClose={() => setRoleta(false)} onPlay={abrirRegistro} />
      )}
      {detailGame && (
        <GameDetailModal
          game={detailGame}
          modo={wishlist.some((w) => w.id === detailGame.id) ? 'desejos' : 'colecao'}
          fav={favs.includes(detailGame.id)}
          vezesJogado={vezesPorJogo[detailGame.id] || 0}
          onClose={() => setDetailGame(null)}
          onToggleFav={toggleFav}
          onPlay={abrirRegistro}
          onComprar={comprar}
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
          ondeEsta={ondeEsta}
          onAddColecao={adicionarDescoberto}
          onAddDesejo={adicionarDesejo}
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
            setWishlist(loadWishlist())
          }}
        />
      )}
    </>
  )
}
