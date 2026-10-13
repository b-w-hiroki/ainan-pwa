// Forensic contrast of actual archived failed CI screenshots versus a fresh
// positive-control Result capture. This is NOT old-code runtime replay.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync, inflateSync } from 'node:zlib'
import { countGetHeaderPixels } from './result-screen-pixel-guard.mjs'

const sha256 = b => createHash('sha256').update(b).digest('hex')
function inspectPng(data) {
  assert.ok(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'invalid screenshot PNG signature')
  let pos=8,width=0,height=0,depth=0,type=0,interlace=1
  const blocks=[]
  while (pos + 12 <= data.length) {
    const size=data.readUInt32BE(pos),kind=data.toString('ascii',pos+4,pos+8)
    const start=pos+8
    assert.ok(size>=0&&start+size+4<=data.length, 'truncated PNG chunk')
    if(kind==='IHDR') {
      width=data.readUInt32BE(start);height=data.readUInt32BE(start+4)
      depth=data[start+8];type=data[start+9];interlace=data[start+12]
    } else if(kind==='IDAT')blocks.push(data.subarray(start,start+size))
    pos=start+size+4
    if(kind==='IEND')break
  }
  assert.equal(width,390);assert.equal(height,844)
  assert.equal(depth,8);assert.ok(type===2||type===6)
  assert.equal(interlace,0,'interlaced PNG not a supported screenshot fixture')
  const bpp=type===2?3:4,stride=width*bpp
  const inflated=inflateSync(Buffer.concat(blocks))
  assert.ok(inflated.length >= (stride+1)*height, 'truncated pixel stream')
  let prev=Buffer.alloc(stride),ptr=0,firstRGB=null,uniform=true
  for(let y=0;y<height;y++) {
    const mode=inflated[ptr++],row=Buffer.alloc(stride)
    for(let i=0;i<stride;i++){
      const left=i<bpp?0:row[i-bpp],up=prev[i],ul=i<bpp?0:prev[i-bpp]
      let predictor=0
      if(mode===1)predictor=left
      else if(mode===2)predictor=up
      else if(mode===3)predictor=(left+up)>>1
      else if(mode===4){
        const p=left+up-ul,da=Math.abs(p-left),db=Math.abs(p-up),dc=Math.abs(p-ul)
        predictor=da<=db&&da<=dc?left:db<=dc?up:ul
      }else assert.equal(mode,0,'unknown PNG filter')
      row[i]=(inflated[ptr++]+predictor)&255
    }
    for(let i=0;i<stride;i+=bpp){
      const rgb=[row[i],row[i+1],row[i+2]]
      if(!firstRGB)firstRGB=rgb
      else if(uniform && rgb.some((v,j)=>v!==firstRGB[j]))uniform=false
    }
    prev=row
  }
  return {width,height,uniform,first_rgb:firstRGB}
}
const fixture=JSON.parse(readFileSync('scripts/fixtures/ainan-historical-blank-pngs.json','utf8'))
assert.equal(fixture.schema_version,1)
assert.equal(fixture.original_failure_replayed,false)
assert.equal(fixture.artifacts.length,2)
const negatives=[]
for(const item of fixture.artifacts){
  const bytes=gunzipSync(Buffer.from(item.gzip_base64,'base64'))
  assert.equal(bytes.length,item.size,item.file+': preserved historical PNG size mismatch')
  assert.equal(sha256(bytes),item.sha256,item.file+': original CI artifact SHA mismatch')
  const pixels=inspectPng(bytes)
  assert.deepEqual(pixels.first_rgb,item.uniform_rgb)
  assert.equal(pixels.uniform,true,item.file+': original screenshot unexpectedly non-blank')
  assert.ok(item.source_run.startsWith('https://github.com/b-w-hiroki/ainan-pwa/actions/runs/'))
  negatives.push({file:item.file,source_run:item.source_run,source_sha:item.historical_sha,
                  source_artifact_id:item.artifact_id,
                  bytes:item.size,sha256:item.sha256,pixels,
                  historical_capture_rejected_by_visual_guard:true})
}
const currentFile=join('artifacts/e2e','39-player-result.png')
const currentBytes=readFileSync(currentFile)
const current=inspectPng(currentBytes)
const gold=countGetHeaderPixels('39-player-result.png','artifacts/e2e')
assert.equal(current.uniform,false,'current Result became a single-color compositor blank')
assert.ok(currentBytes.length>15000,'current screenshot is suspiciously small')
assert.ok(gold>450,'current Result golden GET title is invisible')
assert.notEqual(sha256(currentBytes),negatives[0].sha256,'current and historic frame unexpectedly identical')
const report={
  task_id:'ainan-result-render-01',kind:'archived_real_failure_png_vs_fresh_current_capture',
  forensic_evidence_verified:true,old_game_runtime_replayed:false,
  historical_failure_in_live_old_code_reproduced:false,
  baseline_prepared_for_ai_ab:false,ai_agent_trials_executed:0,
  negatives,positive:{file:'39-player-result.png',sha256:sha256(currentBytes),
    bytes:currentBytes.length,pixels:current,result_gold_pixels:gold},
  limitations:['The old screenshots were copied losslessly from actual failing CI artifacts',
    'This does not run historical game code or reproduce timing-sensitive WebGL readback',
    'Current result was tested in Chromium only; not a physical iPhone or WebKit'],
}
mkdirSync('artifacts/benchmark',{recursive:true})
writeFileSync('artifacts/benchmark/ainan-historical-png-forensics.json',
              JSON.stringify(report,null,2)+'\n')
console.log('Verified historical blank captures and current live Result:',JSON.stringify({
  negatives:negatives.map(x=>({file:x.file,bytes:x.bytes,color:x.pixels.first_rgb})),
  current:{bytes:currentBytes.length,gold_pixels:gold,uniform:current.uniform},
  old_code_replayed:false,ai_executions:0
}))
