// Atualiza, a partir da LUDOPEDIA (mesma fonte da sua lista):
//   - capa do jogo, BAIXADA para public/capas/<id>.jpg (funciona OFFLINE)
//   - nota (Nota Média) e ranking (Rank BG) atualizados
//   - link da página na Ludopedia
// Grava tudo em src/data/games.json.
//
//   npm run enrich            -> só jogos sem imagem local
//   npm run enrich -- --force -> refaz todos (capas + notas + rank)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dataPath = join(root, 'src', 'data', 'games.json')
const capasDir = join(root, 'public', 'capas')
const force = process.argv.includes('--force')

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const overrides = {
  'detetive-estrela': 'Detetive',
  'stop-classico-uestop': 'UeStop',
  'mega-senha-2-1': 'Mega Senha',
  'imagem-acao-2': 'Imagem & Ação 2',
  'taco-gato-cabra-queijo-pizza': 'Taco Gato',
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

async function buscarSlug(query) {
  const html = await fetchText(
    `https://www.ludopedia.com.br/search?search=${encodeURIComponent(query)}`,
  )
  const m = html.match(/\/jogo\/([a-z0-9-]+)/i)
  return m ? m[1] : null
}

// O número aparece após o rótulo, possivelmente dentro de tags aninhadas.
function aposRotulo(html, rotulo) {
  const re = new RegExp(rotulo + '\\s*:\\s*((?:<[^>]*>\\s*)+)([\\d.,]+)', 'i')
  const m = html.match(re)
  return m ? parseFloat(m[2].replace(',', '.')) : null
}

async function dadosDaPagina(slug) {
  const raw = await fetchText(`https://www.ludopedia.com.br/jogo/${slug}`)
  const ogImg = raw.match(/<meta property="og:image" content="([^"]+)"/i)
  const html = raw.replace(/\s+/g, ' ')
  return {
    img: ogImg ? ogImg[1].replace(/_t(\.[a-z]+)(\?|$)/i, '$1$2') : null,
    nota: aposRotulo(html, 'Nota M[eé]dia'),
    rank: aposRotulo(html, 'Rank BG'),
  }
}

async function baixarImagem(url, id) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`img HTTP ${res.status}`)
  const ext = (url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg').toLowerCase()
  const buf = Buffer.from(await res.arrayBuffer())
  const file = `${id}.${ext}`
  writeFileSync(join(capasDir, file), buf)
  return `capas/${file}`
}

async function resolver(game) {
  const tentativas = [
    overrides[game.id],
    game.nome.replace(/\s*\(.*?\)\s*/g, '').trim(),
    ...(game.busca || []),
  ].filter(Boolean)
  for (const q of tentativas) {
    try {
      const slug = await buscarSlug(q)
      if (!slug) continue
      await sleep(500)
      const d = await dadosDaPagina(slug)
      if (d.img) return { slug, ...d }
    } catch {
      /* tenta próxima */
    }
    await sleep(400)
  }
  return null
}

if (!existsSync(capasDir)) mkdirSync(capasDir, { recursive: true })
const data = JSON.parse(readFileSync(dataPath, 'utf8'))
let updated = 0
for (const game of data.jogos) {
  const temLocal = game.imageUrl && game.imageUrl.startsWith('capas/')
  if (!force && temLocal) continue
  try {
    const info = await resolver(game)
    if (info) {
      const local = await baixarImagem(info.img, game.id)
      game.imageUrl = local
      game.ludopediaUrl = `https://www.ludopedia.com.br/jogo/${info.slug}`
      if (info.nota != null) game.nota_ludopedia = info.nota
      if (info.rank != null) game.rank_ludopedia = info.rank
      updated++
      console.log(`✔ ${game.nome} -> ${local} | nota ${info.nota ?? '—'} | rank ${info.rank ?? '—'}`)
    } else {
      console.log(`… ${game.nome}: nada encontrado`)
    }
  } catch (e) {
    console.log(`✖ ${game.nome}: ${e.message}`)
  }
  await sleep(900)
}

if (updated > 0) data.atualizado_em = new Date().toISOString()
writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8')
console.log(`\nConcluído. ${updated} jogo(s) atualizado(s). Capas em public/capas/`)
