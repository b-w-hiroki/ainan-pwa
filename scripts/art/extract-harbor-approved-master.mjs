// AINAN approved-art-first master extraction (no new illustration style).
// Deterministically separates blue water pixels from the approved Cast master.
// Outputs are derived files, not newly imagined art. Re-compositing at native
// dimensions must reproduce every RGBA pixel of the approved source.
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync, deflateSync } from 'node:zlib'

const root = fileURLToPath(new URL('../../', import.meta.url))
const input = join(root, 'fishing-game/assets/approved-mock/cast-harbor-composite-base.png')
const outputFolder = join(root, 'fishing-game/assets/generated/harbor-aji-master-v2')
const signature = Buffer.from([137,80,78,71,13,10,26,10])
function decodePng(bytes) {
  assert.ok(bytes.subarray(0,8).equals(signature), 'approved master must be PNG')
  let pos=8,w=0,h=0,bitDepth=0,color=0
  const compressed=[]
  while(pos+12<=bytes.length) {
    const n=bytes.readUInt32BE(pos), kind=bytes.toString('ascii',pos+4,pos+8), at=pos+8
    assert.ok(at+n+4<=bytes.length,'malformed PNG chunk')
    if(kind==='IHDR') {
      w=bytes.readUInt32BE(at);h=bytes.readUInt32BE(at+4)
      bitDepth=bytes[at+8];color=bytes[at+9]
      assert.equal(bytes[at+12],0,'interlaced master unsupported')
    }
    if(kind==='IDAT')compressed.push(bytes.subarray(at,at+n))
    pos=at+n+4
    if(kind==='IEND')break
  }
  assert.equal(bitDepth,8,'8-bit RGB/RGBA master required')
  assert.ok(color===2||color===6,'RGB/RGBA master required')
  const bpp=color===6?4:3, stride=w*bpp
  const inflated=inflateSync(Buffer.concat(compressed))
  assert.ok(inflated.length>=(stride+1)*h,'incomplete PNG')
  const rgba=Buffer.alloc(w*h*4)
  let prev=Buffer.alloc(stride),row=Buffer.alloc(stride),p=0
  for(let y=0;y<h;y++) {
    const filter=inflated[p++];row.fill(0)
    for(let i=0;i<stride;i++) {
      const left=i<bpp?0:row[i-bpp],up=prev[i],ul=i<bpp?0:prev[i-bpp]
      let predictor=0
      if(filter===1)predictor=left
      else if(filter===2)predictor=up
      else if(filter===3)predictor=(left+up)>>1
      else if(filter===4){
        const pivot=left+up-ul,da=Math.abs(pivot-left),db=Math.abs(pivot-up),dc=Math.abs(pivot-ul)
        predictor=da<=db&&da<=dc?left:db<=dc?up:ul
      } else assert.equal(filter,0,'unknown PNG filter')
      row[i]=(inflated[p++]+predictor)&255
    }
    for(let x=0;x<w;x++) {
      const from=x*bpp,to=(y*w+x)*4
      rgba[to]=row[from];rgba[to+1]=row[from+1];rgba[to+2]=row[from+2]
      rgba[to+3]=bpp===4?row[from+3]:255
    }
    ;[prev,row]=[row,prev]
  }
  return {width:w,height:h,rgba}
}
const crcTable=Array.from({length:256},(_,n)=>{
  for(let k=0;k<8;k++)n=(n&1)?(0xedb88320^(n>>>1)):(n>>>1)
  return n>>>0
})
function pngChunk(name,data) {
  const label=Buffer.from(name,'ascii')
  const len=Buffer.alloc(4);len.writeUInt32BE(data.length)
  let crc=0xffffffff
  for(const c of Buffer.concat([label,data]))crc=crcTable[(crc^c)&255]^(crc>>>8)
  const last=Buffer.alloc(4);last.writeUInt32BE((crc^0xffffffff)>>>0)
  return Buffer.concat([len,label,data,last])
}
function encodePng(w,h,rgba) {
  const ihdr=Buffer.alloc(13)
  ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6
  const rowBytes=w*4,rows=Buffer.alloc((rowBytes+1)*h)
  for(let y=0;y<h;y++)rgba.copy(rows,y*(rowBytes+1)+1,y*rowBytes,(y+1)*rowBytes)
  return Buffer.concat([signature,pngChunk('IHDR',ihdr),pngChunk('IDAT',deflateSync(rows,{level:9})),pngChunk('IEND',Buffer.alloc(0))])
}
const master=decodePng(readFileSync(input))
const {width:w,height:h,rgba}=master
assert.ok(w>=380 && w<=400 && h>=760 && h<=860,'unexpected approved Cast master geometry')
const water=Buffer.alloc(rgba.length),nonwater=Buffer.alloc(rgba.length)
let splitCount=0
for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
  const at=(y*w+x)*4
  const r=rgba[at],g=rgba[at+1],b=rgba[at+2],a=rgba[at+3]
  // Protect the character, rod, pier, boats and sky. Water pixels are
  // selected conservatively by location + hue; the two outputs together
  // exactly preserve the source even across antialiasing and tiny islands.
  const inSea=y>110 && y<620 && !(y>345 && x<165) && !(y>495 && x<298)
  const isBlue=inSea && a>0 && g>r+13 && b>r+19 && b>g-55 && g>67 && b>95
  rgba.copy(isBlue?water:nonwater,at,at,at+4)
  if(isBlue)splitCount++
}
// Foreground extraction is a reversible, *static* segmentation pilot.
 // Background pixels behind the player and quay are not hallucinated here.
 // Moving extracted parts requires a separately reviewed background restoration.
const player=Buffer.alloc(rgba.length),pier=Buffer.alloc(rgba.length),background=Buffer.alloc(rgba.length)
let playerCount=0,pierCount=0
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const at=(y*w+x)*4
  if(nonwater[at+3]===0)continue
  // In the approved 391x783 frame, the fishing character occupies the
  // lower-left region; rod and line are still controlled by native code.
  const belongsToPlayer = x<184 && y>=345 && y<560
    && x<172-(Math.max(0,345-y)*0.06)
  const belongsToPier = y>=495 && (x>=150 || y>=562)
  const target=belongsToPlayer?player:belongsToPier?pier:background
  nonwater.copy(target,at,at,at+4)
  if(belongsToPlayer)playerCount++
  else if(belongsToPier)pierCount++
}
const recomposed=Buffer.alloc(rgba.length)
for(let at=0;at<rgba.length;at+=4){
  const from=water[at+3]?water:player[at+3]?player:pier[at+3]?pier:background
  from.copy(recomposed,at,at,at+4)
}
assert.ok(recomposed.equals(rgba),'water/remaining recomposition lost approved art pixels')
assert.ok(splitCount>w*h*.08,'water mask too small; not a usable separate texture')
assert.ok(splitCount<w*h*.66,'water mask accidentally includes most of the environment')
mkdirSync(outputFolder,{recursive:true})
const outputs=[
  ['cast-harbor-water-extracted.png',water],
  ['cast-harbor-nonwater-extracted.png',nonwater],
  ['cast-harbor-background-extracted.png',background],
  ['cast-harbor-player-region-extracted.png',player],
  ['cast-harbor-pier-region-extracted.png',pier],
]
for(const [name,pixels] of outputs)writeFileSync(join(outputFolder,name),encodePng(w,h,pixels))
console.log(JSON.stringify({source:'cast-harbor-composite-base.png',width:w,height:h,
  selectedWaterPixels:splitCount,waterFraction:Math.round(splitCount/(w*h)*1000)/1000,
  playerRegionPixels:playerCount,pierRegionPixels:pierCount,
  outputs:outputs.map(x=>x[0]),sourcePixelsPreserved:true}))
