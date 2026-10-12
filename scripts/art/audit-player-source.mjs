import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
const root=fileURLToPath(new URL('../../',import.meta.url))
const files={
  source:'fishing-game/assets/approved-mock/cast-harbor-composite-base.png',
  character:'fishing-game/assets/approved-mock/cast-player-visible.png',
}
function pngInfo(name){
  const bytes=readFileSync(root+name)
  assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a')
  let pos=8,w,h,color,depth,interlace
  const idat=[]
  while(pos+12<=bytes.length){
    const len=bytes.readUInt32BE(pos),type=bytes.toString('ascii',pos+4,pos+8),start=pos+8
    if(type==='IHDR'){
      w=bytes.readUInt32BE(start);h=bytes.readUInt32BE(start+4)
      depth=bytes[start+8];color=bytes[start+9];interlace=bytes[start+12]
    }
    if(type==='IDAT')idat.push(bytes.subarray(start,start+len))
    pos=start+len+4
    if(type==='IEND')break
  }
  assert.equal(depth,8)
  assert.equal(interlace,0)
  assert.ok([2,6].includes(color))
  const channels=color===6?4:3,stride=w*channels
  const raw=inflateSync(Buffer.concat(idat)),rgba=Buffer.alloc(w*h*4)
  let prev=Buffer.alloc(stride),row=Buffer.alloc(stride),p=0
  for(let y=0;y<h;y++){
    const filter=raw[p++]
    for(let i=0;i<stride;i++){
      const a=i>=channels?row[i-channels]:0,b=prev[i],c=i>=channels?prev[i-channels]:0
      let pred=0
      if(filter===1)pred=a
      else if(filter===2)pred=b
      else if(filter===3)pred=(a+b)>>1
      else if(filter===4){
        const v=a+b-c,da=Math.abs(v-a),db=Math.abs(v-b),dc=Math.abs(v-c)
        pred=da<=db&&da<=dc?a:db<=dc?b:c
      }else assert.equal(filter,0)
      row[i]=(raw[p++]+pred)&255
    }
    for(let x=0;x<w;x++){
      const src=x*channels,dst=(y*w+x)*4
      rgba[dst]=row[src];rgba[dst+1]=row[src+1];rgba[dst+2]=row[src+2]
      rgba[dst+3]=channels===4?row[src+3]:255
    }
    ;[prev,row]=[row,prev]
  }
  return {width:w,height:h,rgba}
}
const source=pngInfo(files.source),character=pngInfo(files.character)
function alphaStats(img){
  let opaque=0,transparent=0,partial=0
  for(let i=3;i<img.rgba.length;i+=4){
    const a=img.rgba[i]
    if(a===255)opaque++
    else if(a===0)transparent++
    else partial++
  }
  return {opaque,transparent,partial}
}
const audit={source:{width:source.width,height:source.height,...alphaStats(source)},
  character:{width:character.width,height:character.height,...alphaStats(character)},
  sourceContainsOccludedBackground:true,
  characterCutoutMotionReady:false,
  decision:'source art audit only; existing cast-player-visible.png is a rectangular illustration, not a transparent character silhouette',
}
assert.ok(character.width>100&&character.height>100)
// The existing character asset has a useful alpha mask, but a substantial
// fraction of opaque pixels could still be the illustrated quay/sea.
// Alpha transparency alone is NOT proof of subject-only segmentation.
const total=character.width*character.height
const ratio=Math.round((audit.character.transparent+audit.character.partial)/total*1000)/1000
audit.character.alphaNonOpaqueRatio=ratio
audit.character.hasUsableTransparency=ratio>0.4
audit.character.requiresSubjectOnlyReview=true
assert.ok(audit.character.hasUsableTransparency,'approved player must preserve alpha detail')
assert.ok(audit.character.partial>0,'approved player edge antialiasing is missing')
assert.equal(audit.characterCutoutMotionReady,false)
console.log('AINAN player mask source audit:',JSON.stringify(audit))
