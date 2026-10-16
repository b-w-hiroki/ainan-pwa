import assert from 'node:assert/strict'
import { existsSync, mkdirSync, realpathSync, statSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

const executable=process.env.PATH.split(':').map(dir=>join(dir,'playwright')).find(existsSync)
assert.ok(executable,'Playwright executable unavailable')
const {chromium}=await import(pathToFileURL(join(dirname(realpathSync(executable)),'index.mjs')).href)
const browser=await chromium.launch({headless:true})
const root='artifacts/art-review/harbor-playable'
mkdirSync(root,{recursive:true})
const url='http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&qaHarborPlayable=1&castMotion=charged'
const runs=[]

try{
  for(const [width,height] of [[390,844],[844,390]]) {
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',err=>{ if (err.message !== 'service worker disabled in QA') errors.push(err.message) })
    await page.addInitScript(()=>{
      localStorage.setItem('ainan_sound_enabled','0')
      localStorage.setItem('ainan_inventory',JSON.stringify({rods:{basic:1,carbon:1,premium:1},baits:{worm:30,shrimp:30,special:30}}))
      localStorage.setItem('ainan_equipment',JSON.stringify({rodType:'carbon',baitType:'shrimp'}))
    })
    try{
      await page.goto(url,{waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>{
        const scene=window.__game?.scene?.getScene?.('GameScene')
        return scene?.sys?.isActive?.() && scene._qaHarborPlayable === true
          && scene._qaHarborWorldLayers?.length === 3
          && scene._coneCastHudNodes && scene._cameraPanPlayer?.active
          && scene.fishingCamera?.world?.width === 2160
      },null,{timeout:22000})

      // Verify those are *actually decoded*, live world-space Phaser sprites.
      const before=await page.evaluate(()=>{
        const scene=window.__game.scene.getScene('GameScene')
        return {
          point:scene.env.point,phase:scene.phase,
          world:[scene.fishingCamera.world.width,scene.fishingCamera.world.height],
          camera:[scene.cameras.main.scrollX,scene.cameras.main.scrollY],
          layers:scene._qaHarborWorldLayers.map(l=>({
            key:l.texture?.key,depth:l.depth,scrollFactorX:l.scrollFactorX,
            active:l.active,visible:l.visible,decoded:l.texture?.source?.[0]?.image?.width===2160,
            approved:l.getData('artApproved'),
          })),
          sourceChanged:scene._qaHarborPlayableError??null,
          skylineViolations:(scene.bg?._fishGfx??[]).filter(f=>f.active && f.visible && f.y<484).length,
          bobberVisible:scene.bobber?.visible,
        }
      })
      assert.equal(before.point,'pointA')
      assert.equal(before.phase,'cast')
      assert.deepEqual(before.world,[2160,1800])
      assert.equal(before.layers.length,3)
      assert.deepEqual(before.layers.map(l=>l.depth),[19,20,25], 'QA art must paint above legacy screen-space scenery but below fish and actor')
      assert.ok(before.layers.every(l=>l.active&&l.visible&&l.scrollFactorX===1&&!l.approved&&l.decoded),
        'Actual Phaser panorama failed texture decode/draw: '+JSON.stringify(before.layers))
      assert.equal(before.sourceChanged,null)
      assert.equal(before.skylineViolations,0,'QA cast fish silhouettes must remain below the panorama waterline')
      const start=`${root}/h02-game-${width}x${height}-before.png`
      await page.screenshot({path:start})
      assert.ok(statSync(start).size>20000,'Blank before PNG: '+start)

      // REAL keyboard actions hit the canonical ConeCast input wrapper;
      // no separate simulator or cast trajectory is driven by this test.
      for(let i=0;i<12;i++) await page.keyboard.press('ArrowRight')
      const aim=await page.evaluate(()=>{
        const scene=window.__game.scene.getScene('GameScene')
        return {
          angle:scene._coneCastState?.angleDeg,
          valid:scene._coneCastPreview?.valid,
          distance:scene._coneCastState?.distancePx,
          camera:[scene.cameras.main.scrollX,scene.cameras.main.scrollY],
        }
      })
      assert.ok(aim.angle>=34 && aim.angle<=38,'Real keyboard diagonal cast not armed: '+JSON.stringify(aim))
      await page.keyboard.press('Enter')
      await page.waitForFunction(()=>{
        const scene=window.__game?.scene?.getScene?.('GameScene')
        return scene?._pullCastTimeline?.lureReleasedAt != null || scene?.phase==='retrieve'
      },null,{timeout:14000})
      // The world camera must ACTUALLY move after the lure is released.
      await page.waitForFunction(({cx,cy})=>{
        const scene=window.__game?.scene?.getScene?.('GameScene')
        return scene?._qaHarborPlayable && scene.bobber?.visible
          && Math.hypot(scene.cameras.main.scrollX-cx,scene.cameras.main.scrollY-cy)>45
      },{cx:before.camera[0],cy:before.camera[1]},{timeout:12000})
      const after=await page.evaluate(()=>{
        const scene=window.__game.scene.getScene('GameScene')
        return {
          camera:[scene.cameras.main.scrollX,scene.cameras.main.scrollY],
          phase:scene.phase,lure:[scene.bobber.x,scene.bobber.y],
          rodTip:scene._cameraPanRodTip,
          casting:scene._cameraPanCasting,
          world:[scene.fishingCamera.world.width,scene.fishingCamera.world.height],
          artApproved:scene._qaHarborWorldLayers.some(l=>l.getData('artApproved')),
          visualOwner:scene._cameraPanRod?.active && scene._cameraPanRodLine?.active,
        }
      })
      assert.ok(after.visualOwner,'Canonical rod/line graphics not in game scene')
      assert.deepEqual(after.world,[2160,1800])
      assert.equal(after.artApproved,false)
      assert.ok(Math.hypot(after.camera[0]-before.camera[0],after.camera[1]-before.camera[1])>45)
      const end=`${root}/h02-game-${width}x${height}-cast.png`
      await page.screenshot({path:end})
      assert.ok(statSync(end).size>20000,'Blank flight PNG: '+end)
      const digest=filename=>createHash('sha256').update(readFileSync(filename)).digest('hex')
      assert.notEqual(digest(start),digest(end),'The render did not change between idle and cast')
      assert.deepEqual(errors,[])
      runs.push({viewport:`${width}x${height}`,before,aim,after,visualApproval:false})
      console.log('Harbor GameScene camera followed REAL cast',width,height,JSON.stringify({before:before.camera,after:after.camera,angle:aim.angle}))
    }finally{await context.close()}
  }
  // Real pointer drag on the actual Phaser canvas (not a synthetic
  // scene._onUp invocation). Check the same QA world on a phone viewport.
  const touchContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1})
  const touch=await touchContext.newPage()
  const touchErrors=[]
  touch.on('pageerror',error=>{ if(error.message!=='service worker disabled in QA') touchErrors.push(error.message) })
  await touch.addInitScript(()=>{
    localStorage.setItem('ainan_sound_enabled','0')
    localStorage.setItem('ainan_inventory',JSON.stringify({rods:{basic:1,carbon:1,premium:1},baits:{worm:30,shrimp:30,special:30}}))
    localStorage.setItem('ainan_equipment',JSON.stringify({rodType:'carbon',baitType:'shrimp'}))
  })
  try {
    await touch.goto(url,{waitUntil:'domcontentloaded'})
    await touch.waitForFunction(()=>{
      const scene=window.__game?.scene?.getScene?.('GameScene')
      return scene?.sys?.isActive?.() && scene._qaHarborPlayable && scene._cameraPanRodGrip
    },null,{timeout:18000})
    const grip=await touch.evaluate(()=>{
      const scene=window.__game.scene.getScene('GameScene')
      const cam=scene.cameras.main
      return {x:cam.x+(scene._cameraPanRodGrip.x-cam.scrollX)*cam.zoom,
        y:cam.y+(scene._cameraPanRodGrip.y-cam.scrollY)*cam.zoom,
        initialCamera:{x:cam.scrollX,y:cam.scrollY}}
    })
    const dest={x:grip.x-25,y:grip.y+73}
    assert.ok(grip.x>40 && grip.x<350 && grip.y>60 && dest.y<840 && dest.x>5,
      'Playable character grip unreachable for a swipe: '+JSON.stringify({grip,dest}))
    await touch.mouse.move(grip.x,grip.y)
    await touch.mouse.down()
    await touch.mouse.move(dest.x,dest.y,{steps:14})
    await touch.waitForFunction(()=>{
      const scene=window.__game.scene.getScene('GameScene')
      return scene._coneCastState?.inputMode==='pull' && scene._coneCastState?.pullArmedAt != null
        && scene._coneCastPreview?.valid === true
    },null,{timeout:5000})
    await touch.waitForTimeout(670)
    await touch.mouse.up()
    await touch.waitForFunction(()=>{
      const scene=window.__game.scene.getScene('GameScene')
      return scene?._pullCastTimeline?.lureReleasedAt != null || scene?.phase==='retrieve'
    },null,{timeout:12000})
    await touch.waitForFunction(({x,y})=>{
      const scene=window.__game.scene.getScene('GameScene')
      const cam=scene.cameras.main
      return scene._qaHarborPlayable && Math.hypot(cam.scrollX-x,cam.scrollY-y)>35
    },grip.initialCamera,{timeout:12000})
    const swipeResult=await touch.evaluate(()=>{
      const scene=window.__game.scene.getScene('GameScene')
      return {world:[scene.fishingCamera.world.width,scene.fishingCamera.world.height],
        inputMode:scene._coneCastState?.inputMode,phase:scene.phase,
        pose:scene._cameraPanPose,rodType:scene._cameraPanRod?.getData('rodType')??null,
        scroll:{x:scene.cameras.main.scrollX,y:scene.cameras.main.scrollY}}
    })
    assert.deepEqual(swipeResult.world,[2160,1800])
    assert.deepEqual(touchErrors,[])
    const file=`${root}/h02-game-390x844-touch.png`
    await touch.screenshot({path:file})
    assert.ok(statSync(file).size>20000)
    runs.push({viewport:'390x844',input:'real-pointer-swipe',grip,dest,after:swipeResult,visualApproval:false})
    console.log('Actual mouse/touch-equivalent drag triggered Harbor fishing camera',JSON.stringify(swipeResult))
  }finally{await touchContext.close()}

  // The ordinary release path must not acquire an unapproved wide background.
  const page=await browser.newPage({viewport:{width:390,height:844}})
  await page.goto('http://127.0.0.1:4173/fishing-game/?qa=1&scene=GameScene',{waitUntil:'domcontentloaded'})
  await page.waitForFunction(()=>window.__game?.scene?.getScene?.('GameScene')?.sys?.isActive?.(),null,{timeout:15000})
  const regular=await page.evaluate(()=>{
    const scene=window.__game.scene.getScene('GameScene')
    return {world:scene.fishingCamera?.world?.width,extra:scene._qaHarborPlayable===true,
      hasUnapprovedTexture:scene.textures.exists('qa_harbor_playable_far')}
  })
  assert.equal(regular.world,900)
  assert.equal(regular.extra,false)
  assert.equal(regular.hasUnapprovedTexture,false)
  await page.close()
  writeFileSync(`${root}/gameplay-qa-evidence.json`,JSON.stringify({runs,regular,artApproved:false,deviceVerified:false},null,2)+'\n')
  console.log('H02 actual GameScene integration PASS; not art approval or physical iPhone QA')
}finally{await browser.close()}
