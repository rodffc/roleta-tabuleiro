// Preenche o "preço médio" de cada jogo com base nos anúncios da loja da Ludopedia
// (página ?v=anuncios, renderizada no servidor). Usa a MEDIANA dos anúncios para
// representar o preço típico, ignorando valores fora da curva.
//   node scripts/enrich-prices.mjs            -> só jogos sem preço
//   node scripts/enrich-prices.mjs --force    -> recalcula todos
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataPath = join(__dirname, '..', 'src', 'data', 'games.json')
const force = process.argv.includes('--force')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function slugDe(game) {
  const m = (game.ludopediaUrl || '').match(/\/jogo\/([a-z0-9-]+)/i)
  return m ? m[1] : null
}

function mediana(nums) {
  if (!nums.length) return null
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

async function precoDoJogo(slug) {
  const res = await fetch(`https://ludopedia.com.br/jogo/${slug}?v=anuncios`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  // parseia cada linha da tabela: prioriza condição "Novo" e descarta acessórios
  const novos = []
  const todos = []
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = tr[1]
    const val = row.match(/R\$\s*([\d.]+,\d{2})/)
    if (!val) continue
    const preco = Number(val[1].replace(/\./g, '').replace(',', '.'))
    if (!(preco >= 10 && preco <= 10000)) continue
    todos.push(preco)
    if (/<td[^>]*>\s*Novo\s*<\/td>/i.test(row)) novos.push(preco)
  }
  const base = novos.length >= 3 ? novos : todos
  if (base.length < 3) return { preco: null, n: base.length }
  const m0 = mediana(base)
  const limpo = base.filter((v) => v >= m0 * 0.5) // tira acessórios/peças avulsas
  return { preco: Math.round(mediana(limpo) * 100) / 100, n: base.length, novos: novos.length }
}

const data = JSON.parse(readFileSync(dataPath, 'utf8'))
let updated = 0
for (const game of data.jogos) {
  if (!force && game.preco != null) continue
  const slug = slugDe(game)
  if (!slug) {
    console.log(`… ${game.nome}: sem link da Ludopedia`)
    continue
  }
  try {
    const { preco, n } = await precoDoJogo(slug)
    if (preco != null) {
      game.preco = preco
      updated++
      console.log(`✔ ${game.nome}: R$ ${preco.toFixed(2)} (mediana de ${n} anúncios)`)
    } else {
      game.preco = null // em branco: menos de 3 anúncios (ou nenhum)
      console.log(`… ${game.nome}: ${n} anúncio(s) — em branco (mín. 3)`)
    }
  } catch (e) {
    console.log(`✖ ${game.nome}: ${e.message}`)
  }
  await sleep(800)
}

writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8')
console.log(`\nConcluído. ${updated} jogo(s) com preço atualizado.`)
