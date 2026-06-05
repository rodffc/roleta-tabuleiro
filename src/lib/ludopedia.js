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

// ---------------- Descobrir jogos (sem token, via páginas do site) ----------------
const SINGULAR = { categorias: 'categoria', temas: 'tema', mecanicas: 'mecanica' }

// Lista as opções de um filtro (categorias / temas / mecanicas) -> [{id, nome}].
export async function listarFiltro(tipo) {
  const singular = SINGULAR[tipo]
  const html = await getText(`/${tipo}`)
  const re = new RegExp(`/${singular}/(\\d+)">([^<]{1,60})<`, 'gi')
  const out = []
  const seen = new Set()
  for (const m of html.matchAll(re)) {
    if (seen.has(m[1])) continue
    seen.add(m[1])
    out.push({ id: m[1], nome: decode(m[2].trim()) })
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

// Extrai os jogos (capa + nome) de uma página de listagem do site.
function parseListaJogos(html) {
  const itens = []
  const seen = new Set()
  const reCapa = /\/jogo\/([a-z0-9-]+)">\s*<div class="div-capa[^"]*">\s*<img class="img-capa" src="([^"]+)"/gi
  let m
  while ((m = reCapa.exec(html))) {
    if (seen.has(m[1])) continue
    seen.add(m[1])
    itens.push({ slug: m[1], cover: m[2] })
  }
  const nomes = {}
  for (const n of html.matchAll(/\/jogo\/([a-z0-9-]+)"[^>]*>([^<]{2,70})<\/a>/gi)) {
    if (!nomes[n[1]]) nomes[n[1]] = decode(n[2].trim())
  }
  return itens.map((it) => ({
    slug: it.slug,
    nome: nomes[it.slug] || it.slug,
    tipo: 'Base',
    estilo: '',
    jogadores_min: null,
    jogadores_max: null,
    idade: null,
    idade_min: null,
    tempo_min: null,
    tempo_max: null,
    ano: null,
    nota_ludopedia: null,
    rank_ludopedia: null,
    descricao: '',
    preco: null,
    imageUrl: it.cover.replace(/_[a-z]\.(jpg|jpeg|png|webp)/i, '.$1'),
    ludopediaUrl: `${SITE}/jogo/${it.slug}`,
    bggId: null,
  }))
}

// Lista os jogos de uma categoria / tema / mecânica.
export async function descobrirJogos(tipo, id) {
  const singular = SINGULAR[tipo]
  const html = await getText(`/${singular}/${id}`)
  return parseListaJogos(html)
}

// Busca os dados completos de um jogo pela sua slug (para enriquecer ao adicionar).
export async function dadosPorSlug(slug) {
  const raw = await getText(`/jogo/${slug}`)
  return parse(raw, slug)
}

// Retorna os dados do 1º resultado da busca, ou null se não encontrar.
export async function buscarNaLudopedia(query) {
  const s = await getText(`/search?search=${encodeURIComponent(query)}`)
  const slug = (s.match(/\/jogo\/([a-z0-9-]+)/i) || [])[1]
  if (!slug) return null
  const raw = await getText(`/jogo/${slug}`)
  return parse(raw, slug)
}
