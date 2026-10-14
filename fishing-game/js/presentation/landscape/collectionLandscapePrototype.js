import { ASSETS } from '../../config/assetManifest.js'
import { FONT } from '../../config/fontStyles.js'
import { FISH_META, getCatches } from '../../game/progress.js'
import { TOWN_CATCH_ICONS } from '../../game/townCatchReactions.js'
import { addCoverImage } from '../../utils/imageLayout.js'

const RARITY=Object.freeze({
  common:{name:'COMMON',accent:0x5bb5d8},
  uncommon:{name:'UNCOMMON',accent:0x71d6a2},
  rare:{name:'RARE',accent:0xa08beb},
  legendary:{name:'LEGEND',accent:0xffc465},
})

// QA-only native-wide gallery. Reuses the same fish names, rarity and saved
// catches as the portrait Collection; selecting a fish never grants points.
export function getNativeCollectionLayout(width,height) {
  if(![width,height].every(Number.isFinite)||width<740||height<370||width<=height) return null
  const entries=Object.keys(FISH_META)
  if(entries.length!==9) return null
  const side=18,gapX=10,gapY=8
  const cardW=(width-side*2-gapX*2)/3
  const available=height-110
  const cardH=Math.floor((available-gapY*2)/3)
  if(cardW<210||cardH<68)return null
  const cards=Object.freeze(entries.map((id,i)=>Object.freeze({
    id,x:side+cardW/2+(i%3)*(cardW+gapX),
    y:100+cardH/2+Math.floor(i/3)*(cardH+gapY),width:cardW,height:cardH,
  })))
  const back=Object.freeze({x:width-62,y:43,width:86,height:52})
  if(cards.some(card=>card.y+card.height/2>height-12))return null
  return Object.freeze({viewport:{width,height},cards,back})
}

function drawButton(scene,bounds,label,onTap,depth=12) {
  const {x,y,width,height}=bounds
  const g=scene.add.graphics().setDepth(depth)
  g.fillStyle(0xf8fdff,0.98).lineStyle(1.8,0xb2def0,0.95)
    .fillRoundedRect(x-width/2,y-height/2,width,height,15)
    .strokeRoundedRect(x-width/2,y-height/2,width,height,15)
  scene.add.text(x,y,label,{
    fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:'#173248',
  }).setOrigin(0.5).setDepth(depth+1)
  return scene.add.rectangle(x,y,width,height,0,0.001)
    .setDepth(depth+2).setInteractive({useHandCursor:true})
    .on('pointerdown',pointer=>{pointer?.event?.stopPropagation?.();onTap()})
}

function showFish(scene,id,count) {
  scene._qaNativeCollectionModal?.destroy(true)
  const {width:W,height:H}=scene.scale
  const fish=FISH_META[id]
  const rarity=RARITY[fish?.rarity]??RARITY.common
  const items=[]
  const scrim=scene.add.rectangle(W/2,H/2,W,H,0x09273b,0.75)
    .setInteractive().on('pointerdown',()=>{scene._qaNativeCollectionModal?.destroy(true);scene._qaNativeCollectionModal=null})
  items.push(scrim)
  const w=Math.min(450,W-60),h=230,x=W/2-w/2,y=H/2-h/2
  const bg=scene.add.graphics()
  bg.fillStyle(0xf8fdff,0.99).lineStyle(2.5,rarity.accent,1)
    .fillRoundedRect(x,y,w,h,24).strokeRoundedRect(x,y,w,h,24)
  items.push(bg)
  const art=TOWN_CATCH_ICONS[id]
  if(art?.key&&scene.textures.exists(art.key))
    items.push(scene.add.image(x+105,y+102,art.key).setDisplaySize(142,122))
  items.push(scene.add.text(x+196,y+49,fish.name,{
    fontFamily:FONT,fontSize:'24px',fontStyle:'bold',color:'#173248',
  }))
  items.push(scene.add.text(x+196,y+96,`${rarity.name} / 捕獲 ${count}匹`,{
    fontFamily:FONT,fontSize:'14px',fontStyle:'bold',color:'#42647b',
  }))
  const c=scene.add.container(0,0,items).setDepth(100)
  scene._qaNativeCollectionModal=c
  const close=drawButton(scene,{x:W/2,y:y+h-37,width:170,height:52},'閉じる',()=>{
    scene._qaNativeCollectionModal?.destroy(true)
    scene._qaNativeCollectionModal=null
    close.destroy()
  },101)
  c.add(close)
  scene._qaNativeCollectionSelection=id
}

function renderCollection(scene,layout) {
  const {width:W,height:H}=layout.viewport
  if(!addCoverImage(scene,ASSETS.backgrounds.homeBase.key,W,H,0))
    scene.add.rectangle(W/2,H/2,W,H,0x67b7d9)
  const cover=scene.add.graphics().setDepth(1)
  cover.fillStyle(0x06273e,0.55).fillRect(0,0,W,H)
  const catches=getCatches()
  const counts=Object.create(null)
  for(const c of catches) if(Object.hasOwn(FISH_META,c.fishId))
    counts[c.fishId]=(counts[c.fishId]??0)+1
  const found=Object.keys(counts).length
  scene.add.text(23,22,'魚図鑑',{
    fontFamily:FONT,fontSize:'26px',fontStyle:'bold',color:'#ffffff',
  }).setDepth(5)
  scene.add.text(126,34,`収集 ${found}/9  /  釣果 ${catches.length}匹`,{
    fontFamily:FONT,fontSize:'15px',color:'#e7faff',
  }).setDepth(5)
  const back=layout.back
  const backHit=drawButton(scene,back,'‹ 戻る',()=>scene.scene.start('HomeScene'))
  const controls=Object.create(null)
  for(const b of layout.cards){
    const fish=FISH_META[b.id]
    const count=counts[b.id]??0
    const known=count>0
    const rarity=RARITY[fish.rarity]??RARITY.common
    const g=scene.add.graphics().setDepth(6)
    g.fillStyle(0x081e30,0.16)
      .fillRoundedRect(b.x-b.width/2+2,b.y-b.height/2+3,b.width,b.height,15)
    g.fillStyle(known?0xf8fdff:0xe1e9ee,known?0.97:0.88)
      .lineStyle(2,known?rarity.accent:0x97a7b0,0.9)
      .fillRoundedRect(b.x-b.width/2,b.y-b.height/2,b.width,b.height,15)
      .strokeRoundedRect(b.x-b.width/2,b.y-b.height/2,b.width,b.height,15)
    const x=b.x-b.width/2
    if(known){
      const art=TOWN_CATCH_ICONS[b.id]
      if(art?.key&&scene.textures.exists(art.key))
        scene.add.image(x+49,b.y,art.key).setDisplaySize(80,Math.min(65,b.height-10)).setDepth(7)
    } else {
      scene.add.text(x+49,b.y,'?',{
        fontFamily:FONT,fontSize:'29px',fontStyle:'bold',color:'#8198a5',
      }).setOrigin(0.5).setDepth(7)
    }
    scene.add.text(x+94,b.y-14,known?fish.name:'未発見',{
      fontFamily:FONT,fontSize:'17px',fontStyle:'bold',color:'#173248',
    }).setDepth(7)
    scene.add.text(x+94,b.y+14,known?`${count}匹 / ${rarity.name}`:'まだ見ぬ魚',{
      fontFamily:FONT,fontSize:'12px',color:'#57788b',
    }).setDepth(7)
    const hit=scene.add.rectangle(b.x,b.y,b.width,b.height,0,0.001)
      .setDepth(9).setInteractive({useHandCursor:true})
      .on('pointerdown',()=>showFish(scene,b.id,count))
    controls[b.id]={hit,count}
  }
  scene._qaNativeCollectionLayout=layout
  scene._qaNativeCollectionControls=controls
  scene._qaNativeCollectionBack=backHit
}

export function installNativeLandscapeCollectionPrototype(CollectionScene) {
  if(CollectionScene.prototype.__nativeLandscapeCollectionInstalled)return
  CollectionScene.prototype.__nativeLandscapeCollectionInstalled=true
  const previous=CollectionScene.prototype.create
  CollectionScene.prototype.create=function(...args){
    const params=typeof window==='undefined'?null:new URLSearchParams(window.location.search)
    if(params?.get('qa')==='1'&&params.get('nativeLandscapeCollection')==='1'){
      const layout=getNativeCollectionLayout(this.scale.width,this.scale.height)
      if(layout)return renderCollection(this,layout)
    }
    return previous.apply(this,args)
  }
}
