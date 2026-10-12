import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodePng, encodePng } from './extract-harbor-approved-master.mjs'

const root=fileURLToPath(new URL('../../',import.meta.url))
const artDir=join(root,'fishing-game/assets/approved-mock')
const outputDir=join(root,'fishing-game/assets/generated/harbor-aji-master-v2')
const original=decodePng(readFileSync(join(artDir,'cast-harbor-composite-base.png')))
const figure=decodePng(readFileSync(join(artDir,'cast-player-visible.png')))
assert.equal(original.width,391)
assert.equal(original.height,783)
assert.equal(figure.width,180)
assert.equal(figure.height,230)
const px=(img,x,y)=>4*(y*img.width+x)

// Align actual approved player artwork to the painted Cast master.
// Using alpha-weighted *source pixels* prevents guessing a new illustration.
function distance(dx,dy,step=9){
  let error=0, samples=0
  for(let y=6;y<figure.height-6;y+=step){
    for(let x=6;x<figure.width-6;x+=step){
      const p=px(figure,x,y),q=px(original,x+dx,y+dy)
      const opacity=figure.rgba[p+3]
      if(opacity<210 || original.rgba[q+3]<210)continue
      for(let channel=0;channel<3;channel++)
        error+=Math.abs(figure.rgba[p+channel]-original.rgba[q+channel])
      samples++
    }
  }
  return {error:samples?error/(3*samples):Infinity,samples}
}
let best={x:0,y:0,error:Infinity,samples:0}
for(let y=260;y<=520;y+=5)for(let x=0;x<=210;x+=5){
 if(x+figure.width>original.width||y+figure.height>original.height)continue
 const result=distance(x,y,12)
 if(result.samples>30&&result.error<best.error)best={x,y,...result}
}
const rough={...best}
for(let y=Math.max(0,rough.y-8);y<=Math.min(original.height-figure.height,rough.y+8);y++)
  for(let x=Math.max(0,rough.x-8);x<=Math.min(original.width-figure.width,rough.x+8);x++){
    const result=distance(x,y,5)
    if(result.samples>50&&result.error<best.error)best={x,y,...result}
  }
assert.ok(Number.isFinite(best.error) && best.samples>50,'approved subject alignment not found')
const background=Buffer.from(original.rgba)
let repaired=0
for(let y=0;y<figure.height;y++)for(let x=0;x<figure.width;x++){
  const a=figure.rgba[px(figure,x,y)+3]
  if(a<8)continue
  const worldX=x+best.x,worldY=y+best.y
  const target=px(original,worldX,worldY)
  // Sample unoccluded original water/quay alongside the subject, preserving
  // palette, caustics and material detail. No global flat-color paint.
  let donorX=Math.min(original.width-2,worldX+182)
  let donorY=worldY
  if(worldY>520){
    donorX=Math.min(original.width-2,worldX+148)
    donorY=Math.min(original.height-2,worldY+4)
  }
  const donor=px(original,donorX,donorY)
  if(original.rgba[donor+3]===0)continue
  const coverage=Math.min(1,a/255)
  for(let channel=0;channel<3;channel++){
    background[target+channel]=Math.round(
      original.rgba[target+channel]*(1-coverage)+original.rgba[donor+channel]*coverage
    )
  }
  background[target+3]=Math.max(original.rgba[target+3],original.rgba[donor+3])
  repaired++
}
mkdirSync(outputDir,{recursive:true})
writeFileSync(join(outputDir,'cast-harbor-player-backfill-pilot.png'),
  encodePng(original.width,original.height,background))
writeFileSync(join(outputDir,'cast-harbor-player-alignment.json'),
  JSON.stringify({source:'cast-harbor-composite-base.png',
    figure:'cast-player-visible.png',x:best.x,y:best.y,
    maeRgb:Math.round(best.error*100)/100,samples:best.samples,
    repairedPixels:repaired,artApproved:false,motionReady:false,
    note:'Backfill is source-derived prototype. Clean alpha edges and visible holes must be reviewed before production.'},null,2)+'\n')
console.log('Harbor subject alignment and inpaint pilot:',JSON.stringify({
  best,donorMode:'source-matched adjacent water/quay',
  repairedPixels:repaired,artApproved:false,motionReady:false,
}))
