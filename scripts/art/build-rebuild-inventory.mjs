#!/usr/bin/env node
// W01 read-only inventory: on-disk SHA-256 is calculated at the checked-out
// commit. This is evidence, NOT an approval of the asset's art quality.
import { ASSETS } from '../../fishing-game/js/config/assetManifest.js'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { resolve, relative, dirname, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const readJson = file => JSON.parse(readFileSync(resolve(root,file), 'utf8'))
const contract = readJson('docs/pipeline/art-rebuild-v2-contract.json')
const direction = readJson('docs/pipeline/art-direction-contract.json')
const golden = readJson('docs/pipeline/golden-screens.json')
const owners = readJson('docs/pipeline/visual-owners.json')
const hash = b => createHash('sha256').update(b).digest('hex')

function canonicalPath(raw) {
  if (typeof raw !== 'string' || /^(https?:)?\/\//.test(raw)) throw new Error('External/non-file source: ' + raw)
  const local = raw.replace(/^\/+/, '')
  const abs = resolve(root,local)
  if (!abs.startsWith(root + '/') || isAbsolute(local)) throw new Error('Unsafe asset path: ' + raw)
  return { local, abs }
}

const shaFor = raw => {
  const { local, abs } = canonicalPath(raw)
  if (!existsSync(abs)) return { path: local, exists: false, sha256: null, bytes: null }
  const bytes = readFileSync(abs)
  return { path: local, exists: true, sha256: hash(bytes), bytes: bytes.length }
}
const manifest = []
function flatten(node, prefix = '') {
  for(const [name,value] of Object.entries(node)) {
    const id=prefix ? prefix + '.' + name : name
    if(value && typeof value==='object' && typeof value.key==='string' && typeof value.path==='string') {
      const file=shaFor(value.path)
      manifest.push({
        id, textureKey: value.key, ...file,
        declaredStatus: value.status ?? 'unknown',
        inventoryClass: 'legacy-compatible-manifest',
        actualRuntimeUsage: 'unverified',
        provenanceVerified: false,
        artApprovedForRebuild: false,
      })
    } else if(value && typeof value==='object') flatten(value,id)
  }
}
flatten(ASSETS)
manifest.sort((a,b)=>a.id.localeCompare(b.id,'en'))

const anchors = direction.anchors.map(anchor => {
  const asset=manifest.find(item=>item.id===anchor.ref)
  if(!asset) throw new Error('Art-direction anchor missing from real manifest: ' + anchor.ref)
  return {
    id: anchor.id, reference: anchor.ref, purpose: anchor.role,
    path:asset.path, sha256:asset.sha256,
    exists:asset.exists, approval: 'historical-reference-only',
  }
})
const layoutRefs=direction.referencePolicy.layoutReferences.map(item=>({
  ...shaFor(item),kind:'composition-reference',notProductionPromotion:true,
}))
const qaOnly=contract.qaSources.map(item=>({
  id:item.id,...shaFor(item.path),
  inventoryClass:'qa-only',manifested:manifest.some(a=>a.path===item.path),artApproved:false,
}))
const scenes=golden.frames.map(frame=>({
  id:frame.id,file:frame.file,phase:frame.phase,
  bytes:null,sha256:null,evidenceType:'external-CI-artifact',
  hashVerified:false,reason:'capture exists in Actions run, not in repository checkout; fetch artifact for commit-matched hash',
}))
const missing=manifest.filter(a=>!a.exists)
const shouldFail=missing.filter(a=>a.declaredStatus==='ready')
const byTexture=new Map()
for(const a of manifest) {
  const group=byTexture.get(a.textureKey) ?? []
  group.push(a.id)
  byTexture.set(a.textureKey,group)
}
const duplicateKeys=[...byTexture].filter(([,ids])=>ids.length>1).map(([key,ids])=>({key,ids}))

const report={
  schemaVersion:1,kind:'AINAN W01 read-only asset-inventory',
  // GitHub Actions injects the exact sha. Locally this remains null rather
  // than falsely reporting a fixed/historical sha as the current main.
  headSha:process.env.GITHUB_SHA ?? null,
  observedAt:new Date().toISOString(),
  inventoryClassPolicy:contract.inventoryClassPolicy,
  sourceRegistry:'fishing-game/js/config/assetManifest.js',
  ownerRegistry:'docs/pipeline/visual-owners.json',
  visualOwners:owners.slots.map(({id,file,owner,presentationOwner,mode})=>({id,file,owner,presentationOwner:presentationOwner??null,mode})),
  historicalArtDirectionBaseline:direction.baselineCommit,
  manifest,layoutRefs,anchors,qaOnly,goldenScreenReferences:scenes,
  summary:{
    manifestEntries:manifest.length,missingReady:shouldFail.length,
    missingAll:missing.length,duplicateTextureKeys:duplicateKeys.length,
    qaSources:qaOnly.length,anchorSources:anchors.length,unverifiedGoldenFrames:scenes.length,
  },
  warnings:[
    ...missing.map(a=>'missing manifest file: '+a.id+' / '+a.path),
    ...duplicateKeys.map(a=>'duplicate texture key (review aliases): '+a.key+' / '+a.ids.join(', ')),
    ...qaOnly.filter(a=>a.manifested).map(a=>'QA file in manifest - ensure no production enable: '+a.id),
  ],
  artApprovalInferred:false,productionSwitched:false,physicalIPhoneVerified:false,
}
const outPath=process.argv[2] || 'artifacts/art-rebuild/w01-inventory.json'
const output=canonicalPath(outPath).abs
mkdirSync(dirname(output),{recursive:true})
writeFileSync(output,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({output:relative(root,output),...report.summary}))
if(!manifest.length || !anchors.length || !layoutRefs.length || !qaOnly.length) throw new Error('Empty source catalog')
if(shouldFail.length) throw new Error('Manifest ready files are absent: '+shouldFail.slice(0,8).map(a=>a.id).join(', '))
if(anchors.some(a=>!a.exists)||layoutRefs.some(a=>!a.exists)) throw new Error('Approved source reference missing')
if(qaOnly.some(a=>!a.exists)) throw new Error('QA atlas source missing')
