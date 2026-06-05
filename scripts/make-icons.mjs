// Gera os PNGs-fonte do ícone (assets/) a partir de um SVG colorido,
// depois rode: npx @capacitor/assets generate --android
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(__dirname, '..', 'assets')
mkdirSync(assetsDir, { recursive: true })

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

// Ícone completo (legado): fundo verde + roleta + dado
const full = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  ${defs}
  <rect width="${S}" height="${S}" rx="${S * 0.22}" fill="url(#bg)"/>
  ${wheel(330)}
  ${die(250)}
</svg>`

// Foreground do ícone adaptativo (conteúdo dentro da zona segura ~66%)
const fg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  ${defs}
  <g transform="translate(${cx} ${cy}) scale(0.62) translate(${-cx} ${-cy})">
    ${wheel(330)}
    ${die(250)}
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
