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

// Retorna os dados do 1º resultado da busca, ou null se não encontrar.
export async function buscarNaLudopedia(query) {
  const s = await getText(`/search?search=${encodeURIComponent(query)}`)
  const slug = (s.match(/\/jogo\/([a-z0-9-]+)/i) || [])[1]
  if (!slug) return null
  const raw = await getText(`/jogo/${slug}`)
  return parse(raw, slug)
}
