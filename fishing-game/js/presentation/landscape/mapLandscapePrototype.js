import { isNativeLandscapeQaEnabled } from './nativeLandscapeQaFlags.js'
import { ASSETS } from '../../config/assetManifest.js'
import { FONT } from '../../config/fontStyles.js'
import { getFishingGroundName } from '../../game/fishingGroundNames.js'
import { getFishingPointUnlock } from '../../game/townUnlocks.js'
import { addCoverImage } from '../../utils/imageLayout.js'

const POINTS = Object.freeze([
  { id:'pointA',subtitle:'港で基本を覚える',accent:0x5bb5d8 },
  { id:'pointB',subtitle:'静かな入り江へ',accent:0x71d6a2 },
  { id:'pointC',subtitle:'黒潮の大物に挑む',accent:0xffb16a },
])

export function getNativeMapLayout(width,height) {
  if(![width,height].every(Number.isFinite)||width<740||height<370||width<=height) return null
  const margin=18,gap=12,cardWidth=(width-2*margin-2*gap)/3
  const cardY=height-80
  const cards=Object.freeze(POINTS.map((point,i)=>Object.freeze({
    point:point.id,x:margin+cardWidth/2+i*(cardWidth+gap),
    y:cardY,width:cardWidth,height:124,
  })))
  const back=Object.freeze({x:width-56,y:47,width:76,height:52})
  if(cards.some(c=>c.width<150||c.y+c.height/2>height-16||c.y-c.height/2<160))return null
  return Object.freeze({viewport:{width,height},cards,back})
}

function renderMap(scene,layout) {
  const {width:W,height:H}=layout.viewport
  if(!addCoverImage(scene,ASSETS.backgrounds.mapTown.key,W,H,0))
    scene.add.rectangle(W/2,H/2,W,H,0x71badd)
  const overlay=scene.add.graphics().setDepth(2)
  overlay.fillGradientStyle(0x082a40,0x082a40,0x082a40,0x082a40,0.64,0.13,0.04,0.05)
  overlay.fillRect(0,0,W,H)
  scene.add.text(30,23,'釣り場を選ぼう',{fontFamily:FONT,fontSize:'28px',fontStyle:'bold',
    color:'#ffffff',shadow:{offsetX:0,offsetY:2,color:'#092b40',blur:2,fill:true}}).setDepth(10)
  scene.add.text(30,64,'地図から海へ。釣果が町を変えていく。',{
    fontFamily:FONT,fontSize:'14px',color:'#f6fcff',
  }).setDepth(10)
  const back=layout.back
  const backG=scene.add.graphics().setDepth(20)
  backG.fillStyle(0xf8fdff,0.97).lineStyle(1.6,0xd7effa,0.88)
    .fillRoundedRect(back.x-back.width/2,back.y-back.height/2,back.width,back.height,15)
    .strokeRoundedRect(back.x-back.width/2,back.y-back.height/2,back.width,back.height,15)
  scene.add.text(back.x,back.y,'‹ 戻る',{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',
    color:'#173248'}).setOrigin(0.5).setDepth(21)
  const backHit=scene.add.rectangle(back.x,back.y,back.width,back.height,0,0.001)
    .setDepth(22).setInteractive({useHandCursor:true})
    .on('pointerdown',()=>scene.scene.start('HomeScene'))
  const controls=Object.create(null)
  for(const [i,b] of layout.cards.entries()) {
    const point=POINTS[i]
    const unlocked=getFishingPointUnlock(point.id).unlocked
    const g=scene.add.graphics().setDepth(20)
    g.fillStyle(0x08253a,0.17).fillRoundedRect(b.x-b.width/2+2,b.y-b.height/2+3,b.width,b.height,20)
    g.fillStyle(unlocked?0xf8fdff:0xd5e2e7,0.98)
      .lineStyle(2,unlocked?point.accent:0xa2acb4,0.95)
      .fillRoundedRect(b.x-b.width/2,b.y-b.height/2,b.width,b.height,20)
      .strokeRoundedRect(b.x-b.width/2,b.y-b.height/2,b.width,b.height,20)
    g.fillStyle(point.accent,unlocked?0.24:0.09)
      .fillRoundedRect(b.x-b.width/2+12,b.y-b.height/2+12,b.width-24,8,4)
    scene.add.text(b.x,b.y-27,getFishingGroundName(point.id),{
      fontFamily:FONT,fontSize:'22px',fontStyle:'bold',color:'#173248',
    }).setOrigin(0.5).setDepth(21)
    scene.add.text(b.x,b.y+9,unlocked?point.subtitle:'町を育てて解放',{
      fontFamily:FONT,fontSize:'13px',color:unlocked?'#45687f':'#6a7983',
    }).setOrigin(0.5).setDepth(21)
    scene.add.text(b.x,b.y+39,unlocked?'釣りに行く ›':'未解放 ›',{
      fontFamily:FONT,fontSize:'14px',fontStyle:'bold',color:unlocked?'#1f6f9f':'#76818a',
    }).setOrigin(0.5).setDepth(21)
    const hit=scene.add.rectangle(b.x,b.y,b.width,b.height,0,0.001)
      .setDepth(22).setInteractive({useHandCursor:true})
      .on('pointerdown',()=>scene._goToFishing(point.id))
    controls[point.id]={hit,unlocked,label:getFishingGroundName(point.id)}
  }
  scene._qaNativeMapLayout=layout
  scene._qaNativeMapControls=controls
  scene._qaNativeMapBack=backHit
}

export function installNativeLandscapeMapPrototype(MapScene) {
  if(MapScene.prototype.__nativeLandscapeMapPrototypeInstalled) return
  MapScene.prototype.__nativeLandscapeMapPrototypeInstalled=true
  const previous=MapScene.prototype.create
  MapScene.prototype.create=function(...args) {
    if(isNativeLandscapeQaEnabled(typeof window === 'undefined' ? '' : window.location.search,'nativeLandscapeMap')){
      const layout=getNativeMapLayout(this.scale.width,this.scale.height)
      if(layout) return renderMap(this,layout)
    }
    return previous.apply(this,args)
  }
}
