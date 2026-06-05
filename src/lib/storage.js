// Persistência local (localStorage). Os dados ficam no navegador do usuário,
// partindo do JSON embarcado (src/data/games.json) na primeira execução.
import seed from '../data/games.json'
import { getToken, setToken } from './ludopedia.js'

const K_GAMES = 'rt_games_v1'
const K_FAVS = 'rt_favs_v1'
const K_HIST = 'rt_history_v1'
const K_DELETED = 'rt_deleted_v1'
const K_WISH = 'rt_wishlist_v1'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('Falha ao salvar', key, e)
  }
}

export function loadGames() {
  const stored = read(K_GAMES, null)
  if (stored && Array.isArray(stored) && stored.length) {
    const byId = Object.fromEntries(seed.jogos.map((g) => [g.id, g]))
    let mudou = false
    // Backfill: completa capas vindas do arquivo para quem abriu antes do enrich.
    const merged = stored.map((g) => {
      if (!g.imageUrl && byId[g.id]?.imageUrl) {
        mudou = true
        return { ...g, imageUrl: byId[g.id].imageUrl, ludopediaUrl: byId[g.id].ludopediaUrl }
      }
      return g
    })
    // Traz jogos NOVOS do arquivo (ex.: incluídos depois), exceto os que você excluiu.
    const idsAtuais = new Set(stored.map((g) => g.id))
    const deletados = new Set(read(K_DELETED, []))
    const novos = seed.jogos.filter((g) => !idsAtuais.has(g.id) && !deletados.has(g.id))
    if (novos.length) {
      mudou = true
      merged.push(...novos)
    }
    if (mudou) write(K_GAMES, merged)
    return merged
  }
  // primeira vez: semeia a partir do JSON embarcado
  const initial = seed.jogos
  write(K_GAMES, initial)
  return initial
}
export const saveGames = (games) => write(K_GAMES, games)

export const loadFavs = () => read(K_FAVS, [])
export const saveFavs = (favs) => write(K_FAVS, favs)

export const loadHistory = () => read(K_HIST, [])
export const saveHistory = (h) => write(K_HIST, h)

export const loadWishlist = () => read(K_WISH, [])
export const saveWishlist = (w) => write(K_WISH, w)

// Marca um jogo como excluído para que não retorne do arquivo ao recarregar.
export function markDeleted(id) {
  const set = new Set(read(K_DELETED, []))
  set.add(id)
  write(K_DELETED, [...set])
}

// Atualiza capas, nota e ranking a partir do arquivo de dados (atualizado por
// `npm run enrich`) e adiciona jogos novos do arquivo, preservando jogos
// adicionados pelo usuário e demais edições.
export function syncFromSeed(current) {
  const bySeed = Object.fromEntries(seed.jogos.map((g) => [g.id, g]))
  const merged = current.map((g) =>
    bySeed[g.id]
      ? {
          ...g,
          imageUrl: bySeed[g.id].imageUrl,
          ludopediaUrl: bySeed[g.id].ludopediaUrl,
          nota_ludopedia: bySeed[g.id].nota_ludopedia,
          rank_ludopedia: bySeed[g.id].rank_ludopedia,
          // mantém um preço que você editou manualmente; senão usa o do arquivo
          preco: g.preco != null ? g.preco : bySeed[g.id].preco,
        }
      : g,
  )
  // adiciona jogos do arquivo que ainda não estão na coleção local
  const idsAtuais = new Set(current.map((g) => g.id))
  const novos = seed.jogos.filter((g) => !idsAtuais.has(g.id))
  const out = [...merged, ...novos]
  write(K_GAMES, out)
  return out
}

export const dataInfo = () => ({
  fonte: seed.fonte,
  atualizado_em: seed.atualizado_em || seed.consultado_em || null,
})

// Restaura a coleção original (descarta inclusões/exclusões locais).
export function resetGames() {
  write(K_DELETED, [])
  write(K_GAMES, seed.jogos)
  return seed.jogos
}

// ---------- Backup / Restauração ----------
// Exporta TODO o estado (jogos, favoritos, histórico, exclusões) para guardar
// fora do app e não perder nada ao reinstalar.
export function exportData() {
  return {
    app: 'roleta-tabuleiro',
    version: 1,
    exportedAt: new Date().toISOString(),
    games: read(K_GAMES, seed.jogos),
    favs: read(K_FAVS, []),
    history: read(K_HIST, []),
    deleted: read(K_DELETED, []),
    wishlist: read(K_WISH, []),
    token: getToken(),
  }
}

export function importData(obj) {
  if (!obj || obj.app !== 'roleta-tabuleiro' || !Array.isArray(obj.games)) {
    throw new Error('Arquivo de backup inválido (não é um backup da Roleta dos jogos).')
  }
  write(K_GAMES, obj.games)
  write(K_FAVS, Array.isArray(obj.favs) ? obj.favs : [])
  write(K_HIST, Array.isArray(obj.history) ? obj.history : [])
  write(K_DELETED, Array.isArray(obj.deleted) ? obj.deleted : [])
  write(K_WISH, Array.isArray(obj.wishlist) ? obj.wishlist : [])
  if (obj.token) setToken(obj.token) // restaura o token da API da Ludopedia
}
