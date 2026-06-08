// Gera os PNGs-fonte do ícone (assets/) a partir de um SVG colorido,
// depois rode: npx @capacitor/assets generate --android
import sharp from 'sharp'
import { mkdirSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const assetsDir = join(root, 'assets')
const publicDir = join(root, 'public')
mkdirSync(assetsDir, { recursive: true })

// Se houver uma imagem própria da roleta, usa ela como ícone do app e do rodapé.
const SRC = join(assetsDir, 'roleta-source.png')
if (existsSync(SRC)) {
  const S = 1024
  const green = { create: { width: S, height: S, channels: 4, background: '#0a7d6e' } }
  // foreground: a roleta dentro da zona segura (transparente)
  const fg = await sharp(SRC).resize(900, 900, { fit: 'contain', background: '#00000000' }).toBuffer()
  await sharp({ create: { width: S, height: S, channels: 4, background: '#00000000' } })
    .composite([{ input: fg, gravity: 'center' }])
    .png()
    .toFile(join(assetsDir, 'icon-foreground.png'))
  // background verde
  await sharp(green).png().toFile(join(assetsDir, 'icon-background.png'))
  // ícone completo (legado): roleta sobre o verde
  await sharp(green).composite([{ input: fg, gravity: 'center' }]).png().toFile(join(assetsDir, 'icon-only.png'))
  // ícone do rodapé (alta resolução, fundo transparente)
  await sharp(SRC).resize(256, 256, { fit: 'contain', background: '#00000000' }).png().toFile(join(publicDir, 'roleta.png'))
  console.log('Ícones gerados a partir de assets/roleta-source.png')
  console.log('Agora rode: npx @capacitor/assets generate --android')
  process.exit(0)
}
console.log('(sem assets/roleta-source.png — gerando o ícone padrão por SVG)')

const S = 1024
const cx = S / 2
const cy = S / 2

// Cores usadas no app (tema + paleta dos placeholders dos cards)
const PALETA = [
  '#0a7d6e', '#2e7d32', '#1565c0', '#6b3fa0',
  '#c0392b', '#d4860b', '#00838f', '#ad1457',
]

function wheel(radius) {
  const n = PALETA.length
  let slices = ''
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2
    const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2
    const x0 = cx + radius * Math.cos(a0)
    const y0 = cy + radius * Math.sin(a0)
    const x1 = cx + radius * Math.cos(a1)
    const y1 = cy + radius * Math.sin(a1)
    slices += `<path d="M${cx},${cy} L${x0.toFixed(1)},${y0.toFixed(1)} A${radius},${radius} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)} Z" fill="${PALETA[i]}"/>`
  }
  return `<g>${slices}<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#ffffff" stroke-width="14"/></g>`
}

// Dado branco (face 5) com pinos laranja, girado levemente
function die(size) {
  const half = size / 2
  const x = cx - half
  const y = cy - half
  const off = size * 0.26
  const r = size * 0.085
  const pips = [
    [cx - off, cy - off], [cx + off, cy - off],
    [cx, cy],
    [cx - off, cy + off], [cx + off, cy + off],
  ]
    .map(([px, py]) => `<circle cx="${px}" cy="${py}" r="${r}" fill="#f4a23b"/>`)
    .join('')
  return `<g transform="rotate(-12 ${cx} ${cy})">
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.2}" fill="#ffffff"/>
    ${pips}
  </g>`
}

const defs = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0a7d6e"/>
    <stop offset="1" stop-color="#06564c"/>
  </linearGradient>
</defs>`

// Ícone completo (legado): fundo verde + roleta GRANDE + dado
const full = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  ${defs}
  <rect width="${S}" height="${S}" rx="${S * 0.22}" fill="url(#bg)"/>
  ${wheel(470)}
  ${die(220)}
</svg>`

// Foreground do ícone adaptativo: roleta o maior possível dentro da zona segura.
const fg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  ${defs}
  <g transform="translate(${cx} ${cy}) scale(0.92) translate(${-cx} ${-cy})">
    ${wheel(360)}
    ${die(180)}
  </g>
</svg>`

// Background do ícone adaptativo (verde)
const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  ${defs}<rect width="${S}" height="${S}" fill="url(#bg)"/>
</svg>`

async function png(svg, file) {
  await sharp(Buffer.from(svg)).png().toFile(join(assetsDir, file))
  console.log('gerado:', file)
}

await png(full, 'icon-only.png')
await png(fg, 'icon-foreground.png')
await png(bg, 'icon-background.png')

// também atualiza o favicon/web
writeFileSync(join(__dirname, '..', 'public', 'dice.svg'), full)
console.log('favicon atualizado: public/dice.svg')
