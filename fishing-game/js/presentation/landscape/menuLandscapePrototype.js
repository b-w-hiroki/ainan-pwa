import { isNativeLandscapeQaEnabled } from './nativeLandscapeQaFlags.js'
import { ASSETS } from '../../config/assetManifest.js'
import { FONT } from '../../config/fontStyles.js'
import { getMenuEntries } from '../../game/menuEntries.js'
import { addCoverImage } from '../../utils/imageLayout.js'

export function getNativeMenuLayout(width,height) {
  if(![width,height].every(Number.isFinite)||width<740||height<370||width<=height) return null
  const margin=18, gap=12
  const tileW=(width-2*margin-3*gap)/4
  const tileH=Math.min(106,Math.floor((height-110-22)/2))
  const startY=128
  const cards=Object.freeze(Array.from({length:8},(_,i)=>Object.freeze({
    index:i,x:margin+tileW/2+(i%4)*(tileW+gap),
    y:startY+tileH/2+Math.floor(i/4)*(tileH+gap),width:tileW,height:tileH,
  })))
  const back=Object.freeze({x:width-65,y:45,width:94,height:52})
  if(tileW<150||tileH<70||cards.some(c=>c.y+c.height/2>height-14))return null
  return Object.freeze({viewport:{width,height},cards,back})
}

function renderMenu(scene,layout) {
  const {width:W,height:H}=layout.viewport
  if(!addCoverImage(scene,ASSETS.backgrounds.townGrowing.key,W,H,0))
    scene.add.rectangle(W/2,H/2,W,H,0x74b5cc)
  const veil=scene.add.graphics().setDepth(1)
  veil.fillStyle(0x0d3046,0.48).fillRect(0,0,W,H)
  scene.add.text(23,22,'メニュー',{
    fontFamily:FONT,fontSize:'29px',fontStyle:'bold',color:'#ffffff',
    shadow:{offsetX:0,offsetY:2,color:'#082538',blur:2,fill:true},
  }).setDepth(5)
  scene.add.text(26,66,'港の施設と釣り人の記録を確認',{
    fontFamily:FONT,fontSize:'15px',color:'#e7f8ff',
  }).setDepth(5)
  const registry=getMenuEntries()
  const controls=Object.create(null)
  for(const [i,c] of layout.cards.entries()) {
    const item=registry[i]
    const x=c.x-c.width/2,y=c.y-c.height/2
    const g=scene.add.graphics().setDepth(9)
    g.fillStyle(0x08243a,0.17).fillRoundedRect(x+2,y+3,c.width,c.height,17)
    g.fillStyle(0xf8fdff,0.98).lineStyle(2,item.color,0.9)
      .fillRoundedRect(x,y,c.width,c.height,17).strokeRoundedRect(x,y,c.width,c.height,17)
    g.fillStyle(item.color,0.16).fillRoundedRect(x+12,y+10,c.width-24,9,5)
    scene.add.text(x+15,y+35,item.title,{
      fontFamily:FONT,fontSize:'18px',fontStyle:'bold',color:'#173248',
    }).setDepth(10)
    const desc=scene.add.text(x+15,y+61,item.desc,{
      fontFamily:FONT,fontSize:'11px',color:'#476a7d',
    }).setDepth(10)
    // Phaser word-wrap splits on spaces, not Japanese character boundaries.
    // Fit the actual measured text into the card; no tiny horizontal scaling.
    if(desc.width>c.width-30){
      const chars=Array.from(item.desc)
      const midpoint=Math.ceil(chars.length/2)
      desc.setText(chars.slice(0,midpoint).join('')+'\n'+chars.slice(midpoint).join(''))
    }
    if(item.badge){
      scene.add.text(x+c.width-12,y+21,item.badge,{
        fontFamily:FONT,fontSize:'9px',fontStyle:'bold',color:'#b66d18',
      }).setOrigin(1,0.5).setDepth(10)
    }
    const hit=scene.add.rectangle(c.x,c.y,c.width,c.height,0,0.001)
      .setDepth(11).setInteractive({useHandCursor:true})
      .on('pointerdown',()=>scene.scene.start(item.scene))
    controls[item.scene]={hit,title:item.title,description:item.desc,descriptionNode:desc}
  }
  const b=layout.back
  const g=scene.add.graphics().setDepth(12)
  g.fillStyle(0xf8fdff,0.98).lineStyle(2,0xb2dcec,0.92)
    .fillRoundedRect(b.x-b.width/2,b.y-b.height/2,b.width,b.height,16)
    .strokeRoundedRect(b.x-b.width/2,b.y-b.height/2,b.width,b.height,16)
  scene.add.text(b.x,b.y,'‹ 戻る',{
    fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:'#173248',
  }).setOrigin(0.5).setDepth(13)
  const backHit=scene.add.rectangle(b.x,b.y,b.width,b.height,0,0.001)
    .setDepth(14).setInteractive({useHandCursor:true}).on('pointerdown',()=>scene.scene.start('HomeScene'))
  scene._qaNativeMenuLayout=layout
  scene._qaNativeMenuControls=controls
  scene._qaNativeMenuBack=backHit
}

export function installNativeLandscapeMenuPrototype(MenuScene){
  if(MenuScene.prototype.__nativeLandscapeMenuInstalled)return
  MenuScene.prototype.__nativeLandscapeMenuInstalled=true
  const previous=MenuScene.prototype.create
  MenuScene.prototype.create=function(...args){
    if(isNativeLandscapeQaEnabled(typeof window === 'undefined' ? '' : window.location.search,'nativeLandscapeMenu')){
      const layout=getNativeMenuLayout(this.scale.width,this.scale.height)
      if(layout)return renderMenu(this,layout)
    }
    return previous.apply(this,args)
  }
}
