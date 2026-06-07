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

  // Descrição (textarea oculto id="jogo_desc")
  const descM = raw.match(/id="jogo_desc"[^>]*>([\s\S]*?)<\/textarea>/i)
  let descricao = ''
  if (descM) {
    descricao = decode(descM[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    if (descricao.length > 800) descricao = descricao.slice(0, 797).trimEnd() + '…'
  }

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
    descricao,
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
const PARAM = { categorias: 'id_categoria', temas: 'id_tema', mecanicas: 'id_mecanica' }
const MAX_PAGINAS = 4 // ranking traz 50 por página

// Caches em memória (somem ao recarregar) para acelerar buscas repetidas.
const cacheTaxonomia = new Map() // tipo -> [{id,nome}]
const cachePagina = new Map() // `${tipo}:${id}:${pag}` -> jogos[]

// Lista as opções de um filtro (categorias / temas / mecanicas) -> [{id, nome}].
export async function listarFiltro(tipo) {
  if (cacheTaxonomia.has(tipo)) return cacheTaxonomia.get(tipo)
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
  out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  cacheTaxonomia.set(tipo, out)
  return out
}

// Extrai os jogos (capa + nome) de uma página de listagem do site.
function parseListaJogos(html) {
  const itens = []
  const seen = new Set()
  // tolera tanto o ranking (div-capa + img-capa) quanto a busca por nome (img-capa-md)
  const reCapa = /\/jogo\/([a-z0-9-]+)"[^>]*>\s*(?:<div[^>]*>\s*)?<img[^>]*class="[^"]*img-capa[^"]*"[^>]*src="([^"]+)"/gi
  let m
  while ((m = reCapa.exec(html))) {
    if (seen.has(m[1])) continue
    seen.add(m[1])
    itens.push({ slug: m[1], cover: m[2] })
  }
  const nomes = {}
  // busca por nome: <a .../jogo/slug" class="full-link"> <h4>Nome <label>(ano)</label>
  for (const n of html.matchAll(/\/jogo\/([a-z0-9-]+)"[^>]*class="full-link"[^>]*>\s*<h4[^>]*>\s*([^<]{1,70})/gi)) {
    const txt = decode(n[2].trim())
    if (txt && !nomes[n[1]]) nomes[n[1]] = txt
  }
  // ranking/categoria: o nome vem logo após o link
  for (const n of html.matchAll(/\/jogo\/([a-z0-9-]+)"[^>]*>\s*([^<]{2,70})/gi)) {
    const txt = decode(n[2].trim())
    if (txt && !nomes[n[1]] && /[a-zA-ZÀ-ÿ]/.test(txt)) nomes[n[1]] = txt
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

// Uma página (50 jogos) do ranking filtrado por um critério. Com cache.
async function rankingPagina(tipo, id, pag) {
  const chave = `${tipo}:${id}:${pag}`
  if (cachePagina.has(chave)) return cachePagina.get(chave)
  const html = await getText(`/ranking?${PARAM[tipo]}=${id}&pagina=${pag}`)
  const jogos = parseListaJogos(html)
  cachePagina.set(chave, jogos)
  return jogos
}

// Junta as primeiras páginas de um filtro (dedup, mantém a ordem do ranking).
async function poolDoFiltro(tipo, id) {
  const reqs = []
  for (let p = 1; p <= MAX_PAGINAS; p++) reqs.push(rankingPagina(tipo, id, p))
  const paginas = await Promise.all(reqs)
  const out = []
  const seen = new Set()
  for (const pg of paginas) {
    for (const g of pg) {
      if (!seen.has(g.slug)) {
        seen.add(g.slug)
        out.push(g)
      }
    }
  }
  return out
}

// Descobre jogos por 1+ filtros. Com vários filtros, faz interseção (E lógico).
// filtros = [{ tipo, id, nome }]
export async function descobrirJogos(filtros) {
  if (!filtros.length) return []
  const [primeiro, ...resto] = filtros
  const base = await poolDoFiltro(primeiro.tipo, primeiro.id)
  const estilo = filtros.map((f) => f.nome).join(' / ')
  if (!resto.length) return base.map((g) => ({ ...g, estilo: g.estilo || primeiro.nome }))
  const conjuntos = await Promise.all(
    resto.map((f) => poolDoFiltro(f.tipo, f.id).then((l) => new Set(l.map((g) => g.slug)))),
  )
  return base
    .filter((g) => conjuntos.every((s) => s.has(g.slug)))
    .map((g) => ({ ...g, estilo: g.estilo || estilo }))
}

// Busca jogos por NOME (página /search). Com cache.
export async function buscarPorNome(nome) {
  const q = nome.trim()
  if (!q) return []
  const chave = `nome:${q.toLowerCase()}`
  if (cachePagina.has(chave)) return cachePagina.get(chave)
  const reqs = [1, 2].map((p) =>
    getText(`/search?search=${encodeURIComponent(q)}&pagina=${p}`).then(parseListaJogos).catch(() => []),
  )
  const paginas = await Promise.all(reqs)
  const out = []
  const seen = new Set()
  for (const pg of paginas) {
    for (const g of pg) {
      if (!seen.has(g.slug)) {
        seen.add(g.slug)
        out.push(g)
      }
    }
  }
  cachePagina.set(chave, out)
  return out
}

// Busca os dados completos de um jogo pela sua slug (para enriquecer ao adicionar).
export async function dadosPorSlug(slug) {
  const raw = await getText(`/jogo/${slug}`)
  return parse(raw, slug)
}

// Preço típico (mediana dos anúncios da loja); null se houver menos de 3 anúncios.
export async function precoPorSlug(slug) {
  const html = await getText(`/jogo/${slug}?v=anuncios`)
  const vals = [...html.matchAll(/R\$\s*([\d.]+,\d{2})/g)]
    .map((m) => Number(m[1].replace(/\./g, '').replace(',', '.')))
    .filter((v) => v >= 10 && v <= 10000)
  if (vals.length < 3) return null
  const s = [...vals].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  const med = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  return Math.round(med * 100) / 100
}

// Retorna os dados do 1º resultado da busca, ou null se não encontrar.
export async function buscarNaLudopedia(query) {
  const s = await getText(`/search?search=${encodeURIComponent(query)}`)
  const slug = (s.match(/\/jogo\/([a-z0-9-]+)/i) || [])[1]
  if (!slug) return null
  const raw = await getText(`/jogo/${slug}`)
  return parse(raw, slug)
}
