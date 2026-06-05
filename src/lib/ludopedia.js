// Busca de jogos na Ludopedia, usada pelo formulário "Adicionar jogo".
//
// - No app Android (Capacitor) o fetch é feito nativamente (CapacitorHttp),
//   sem restrição de CORS.
// - No navegador (dev), usa o proxy "/lp" configurado no vite.config.js.
// - No Node (scripts/testes) usa a URL completa.

const SITE = 'https://ludopedia.com.br'

function isNative() {
  return !!(
    typeof window !== 'undefined' &&
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform()
  )
}

function base() {
  if (typeof window === 'undefined') return SITE // Node
  if (isNative()) return SITE // app Android: fetch nativo, sem CORS
  return '/lp' // navegador: proxy do Vite
}

async function getText(path) {
  const res = await fetch(base() + path, {
    headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

function meta(raw, prop) {
  const m = raw.match(new RegExp(`<meta property="${prop}" content="([^"]+)"`, 'i'))
  return m ? decode(m[1]) : null
}

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function numAposRotulo(h, rotulo) {
  const m = h.match(new RegExp(rotulo + '\\s*:?\\s*((?:<[^>]*>\\s*)+)([\\d.,]+)', 'i'))
  return m ? parseFloat(m[2].replace(',', '.')) : null
}

// Extrai os campos da ficha técnica da página do jogo.
function parse(raw, slug) {
  const h = raw.replace(/\s+/g, ' ')

  const ogImg = meta(raw, 'og:image')
  const imageUrl = ogImg ? ogImg.replace(/_t(\.[a-z]+)(\?|$)/i, '$1$2') : null

  // Bloco compacto da ficha: ">Idade | 8 + | |45 min| |2 a 5 jogadores |"
  const i = h.indexOf('>Idade')
  const ficha = i >= 0 ? h.slice(i, i + 240).replace(/<[^>]+>/g, ' ') : ''

  const idadeM = ficha.match(/(\d+)\s*\+/)
  const tempoM = ficha.match(/(\d+)\s*(?:a|–|-)\s*(\d+)\s*min/) || ficha.match(/(\d+)\s*min/)
  const jogM =
    ficha.match(/(\d+)\s*(?:a|–|-)\s*(\d+)\s*jogador/) || ficha.match(/(\d+)\s*jogador/)

  const tempo_min = tempoM ? Number(tempoM[1]) : null
  const tempo_max = tempoM ? Number(tempoM[2] ?? tempoM[1]) : null
  const jogadores_min = jogM ? Number(jogM[1]) : null
  const jogadores_max = jogM ? Number(jogM[2] ?? jogM[1]) : null

  return {
    slug,
    nome: meta(raw, 'og:title'),
    imageUrl,
    nota_ludopedia: numAposRotulo(h, 'Nota M[eé]dia'),
    rank_ludopedia: numAposRotulo(h, 'Rank BG'),
    idade: idadeM ? `${idadeM[1]}+` : null,
    tempo_min,
    tempo_max,
    jogadores_min,
    jogadores_max,
    ludopediaUrl: `${SITE}/jogo/${slug}`,
  }
}

// ---------------- API oficial (com token) ----------------
const K_TOKEN = 'rt_ludo_token'

export const getToken = () => {
  try {
    return localStorage.getItem(K_TOKEN) || ''
  } catch {
    return ''
  }
}
export const setToken = (t) => {
  try {
    if (t) localStorage.setItem(K_TOKEN, t.trim())
    else localStorage.removeItem(K_TOKEN)
  } catch {
    /* ignore */
  }
}

function apiBase() {
  if (typeof window === 'undefined' || isNative()) return `${SITE}/api/v1`
  return '/lp/api/v1' // navegador: proxy do Vite
}

async function apiGet(path, params = {}) {
  const token = getToken()
  if (!token) throw new Error('SEM_TOKEN')
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v != null) qs.set(k, String(v))
  }
  const url = `${apiBase()}${path}${qs.toString() ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (res.status === 401) throw new Error('TOKEN_INVALIDO')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Busca jogos na API oficial (filtros server-side: search, categoria, tema).
export async function buscarJogosApi({ search = '', idCategoria = '', idTema = '', rows = 100, page = 1 } = {}) {
  const data = await apiGet('/jogos', {
    rows,
    page,
    search: search.trim(),
    id_categoria: idCategoria,
    id_tema: idTema,
  })
  return data.jogos || data || []
}

// Normaliza itens de listas de filtro vindas da API (categorias/temas).
function normLista(arr, idKeys, nomeKeys) {
  return (arr || [])
    .map((o) => ({
      id: idKeys.map((k) => o[k]).find((v) => v != null),
      nome: nomeKeys.map((k) => o[k]).find((v) => v != null),
    }))
    .filter((o) => o.id != null && o.nome)
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
}

export async function listarCategorias() {
  const d = await apiGet('/categorias', { rows: 200 })
  return normLista(d.categorias || d, ['id_categoria', 'id'], ['nm_categoria', 'nome'])
}

export async function listarTemas() {
  const d = await apiGet('/temas', { rows: 200 })
  return normLista(d.temas || d, ['id_tema', 'id'], ['nm_tema', 'nome'])
}

// Converte um jogo vindo da API para o formato da coleção do app.
export function jogoApiParaColecao(j) {
  const tp = String(j.tp_jogo || '').toLowerCase()
  const ehExp = tp === 'e' || tp.includes('expan')
  const idade = j.idade_minima ? `${j.idade_minima}+` : null
  const tempo = j.vl_tempo_jogo != null ? Number(j.vl_tempo_jogo) : null
  const cats = (j.categorias || []).map((c) => c.nm_categoria || c.nome).filter(Boolean)
  return {
    nome: j.nm_jogo || j.nome || 'Sem nome',
    tipo: ehExp ? 'Expansão' : 'Base',
    estilo: cats.slice(0, 3).join(' / '),
    jogadores_min: j.qt_jogadores_min != null ? Number(j.qt_jogadores_min) : null,
    jogadores_max: j.qt_jogadores_max != null ? Number(j.qt_jogadores_max) : null,
    idade,
    idade_min: j.idade_minima ? Number(j.idade_minima) : null,
    tempo_min: tempo,
    tempo_max: tempo,
    ano: j.ano_publicacao ? String(j.ano_publicacao) : null,
    imageUrl: j.thumb || null,
    ludopediaUrl: j.link || null,
    descricao: '',
    preco: null,
    bggId: null,
  }
}

// Retorna os dados do 1º resultado da busca, ou null se não encontrar.
export async function buscarNaLudopedia(query) {
  const s = await getText(`/search?search=${encodeURIComponent(query)}`)
  const slug = (s.match(/\/jogo\/([a-z0-9-]+)/i) || [])[1]
  if (!slug) return null
  const raw = await getText(`/jogo/${slug}`)
  return parse(raw, slug)
}
