import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const originals = join(root, 'fishing-game/assets/generated/hero')
const destination = join(root, 'fishing-game/assets/generated/jump-v2')

// Keep the original fish-body path/painting. Only change the authored pose and
// isolate short splash/wake FX so pilot variants can be reviewed one by one.
const PILOT = Object.freeze({
  aji: { tilt: -17, translateY: -12, streak: '#b4f7ff' },
  saba: { tilt: -12, translateY: -19, streak: '#d4fcff' },
  kue: { tilt: -7, translateY: -11, streak: '#b6ebef' },
})
const fishIds = Object.keys(PILOT)
assert.deepEqual(fishIds.sort(), ['aji','kue','saba'])
mkdirSync(destination, { recursive: true })
for (const id of fishIds) {
  const src = readFileSync(join(originals, 'fish_hero_' + id + '.svg'), 'utf8')
  assert.match(src, /^<svg[^>]+viewBox="0 0 640 360"/)
  const inner = src.slice(src.indexOf('>') + 1, src.lastIndexOf('</svg>')).trim()
  assert.ok(inner.includes('<defs>') && inner.includes('url(#'), id + ': source painting unexpectedly changed')
  const i = PILOT[id]
  const body = `<g transform="translate(320 177) rotate(${i.tilt}) scale(.81) translate(-320 -177)">
${inner}
</g>`
  const splash = `<g fill="none" stroke-linecap="round">
<path d="M126 286 C196 258 247 280 311 270 S411 266 507 289" stroke="${i.streak}" stroke-width="7" stroke-opacity=".78"/>
<path d="M154 301 Q242 274 304 297 T484 300" stroke="#f8ffff" stroke-width="2.5" stroke-opacity=".68"/>
<path d="M185 267 Q174 250 189 228 M468 268 Q487 249 475 231" stroke="#c6faff" stroke-width="5" stroke-opacity=".68"/>
</g>
<g fill="#ebffff" opacity=".86"><ellipse cx="167" cy="247" rx="5" ry="8"/><ellipse cx="478" cy="252" rx="4" ry="7"/><ellipse cx="505" cy="282" rx="3" ry="5"/></g>`
  const art = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
<!-- Source: fish_hero_${id}.svg, independently posed Jump pilot, not new species anatomy -->
${splash}
${body}
</svg>
`
  assert.ok(!/<(script|foreignObject|image)\b/i.test(art), id + ': forbidden external content')
  writeFileSync(join(destination, 'fish_jump_' + id + '.svg'), art)
  console.log('Built fish Jump candidate:', id, art.length, 'bytes')
}
