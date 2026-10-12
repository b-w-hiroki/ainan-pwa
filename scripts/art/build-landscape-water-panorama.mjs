// Preview-only approved-water panorama. Does NOT replace the in-game world.
// Mirrors horizontal patches of the existing luminous Harbor material to
// eliminate hard x-axis seams without synthesizing low-quality flat gradients.
// A true 2.5D shore/pier/world still needs authored independent layers.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../',import.meta.url))
const source = join(root,'fishing-game/assets/approved-mock/harbor-clean-water-390x844.png')
const output = join(root,'artifacts/orientation/landscape-approved-water-candidate.svg')
const png = readFileSync(source)
assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a','approved PNG header missing')
const w=png.readUInt32BE(16), h=png.readUInt32BE(20)
assert.equal(w,390,'approved Harbor master unexpectedly changed')
assert.equal(h,844,'approved Harbor master unexpectedly changed')
const digest=createHash('sha256').update(png).digest('hex')
const data=png.toString('base64')
assert.ok(data.length>100000,'source image looks incomplete')
const image = `<image id="approvedWater" x="0" y="0" width="${w}" height="${h}"
  href="data:image/png;base64,${data}"/>`
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 844 390"
  width="844" height="390" role="img" aria-label="Unapproved Harbor water material panorama">
<!-- PREVIEW ONLY. Approved source SHA-256: ${digest} -->
<defs>${image}<clipPath id="viewport"><rect width="844" height="390"/></clipPath></defs>
<g clip-path="url(#viewport)">
  <!-- Sample only the high-detail water region y=220..610. Reflect tiles at
       x=390 and x=780 so edge colors match rather than creating a hard line. -->
  <g transform="translate(0,-220)"><use href="#approvedWater"/></g>
  <g transform="translate(780,-220) scale(-1,1)"><use href="#approvedWater"/></g>
  <g transform="translate(780,-220)"><use href="#approvedWater"/></g>
</g>
</svg>\n`
assert.ok(!/<script|<foreignObject/i.test(svg),'invalid generated SVG content')
mkdirSync(join(root,'artifacts/orientation'),{recursive:true})
writeFileSync(output,svg)
console.log('Approved Harbor water panorama candidate:',JSON.stringify({
  source:'harbor-clean-water-390x844.png',
  sourceSha256:digest,sourceWidth:w,sourceHeight:h,
  outputWidth:844,outputHeight:390,sourceY:[220,610],
  mirroredSeams:[390,780],status:'review-only-not-integrated',
}))
