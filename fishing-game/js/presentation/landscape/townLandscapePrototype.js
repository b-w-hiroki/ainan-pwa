import { isNativeLandscapeQaEnabled } from './nativeLandscapeQaFlags.js'
import { ASSETS } from '../../config/assetManifest.js'
import { FONT } from '../../config/fontStyles.js'
import { getTownFacilityArt } from '../../game/townFacilityArt.js'
import { getTownSummary, getCatches, getScore } from '../../game/progress.js'
import { addCoverImage } from '../../utils/imageLayout.js'

const FACILITIES=Object.freeze([
  {id:'market',name:'魚市場',accent:0xff765a},
  {id:'pier',name:'桟橋',accent:0x5bb5d8},
  {id:'guide',name:'案内所',accent:0x71d6a2},
  {id:'festival',name:'広場',accent:0xffd95a},
])

// A read-only horizontal Town staging slice. Facility purchases and unlock
// celebration still belong to the approved portrait scene, never to a
// second experimental transaction owner.
export function getNativeTownLayout(width,height) {
  if (![width,height].every(Number.isFinite) || width<740 || height<370 || width<=height) return null
  const side=18,gap=10
  const tileWidth=(width-side*2-gap*3)/4
  const cards=Object.freeze(FACILITIES.map((facility,i)=>Object.freeze({
    id:facility.id,x:side+tileWidth/2+i*(tileWidth+gap),
    y:202,width:tileWidth,height:136,
  })))
  const actionWidth=Math.min(226,Math.floor((width-60)/2))
  const navigation=Object.freeze({
    map:Object.freeze({x:width/2-actionWidth/2-9,y:height-40,width:actionWidth,height:52}),
    home:Object.freeze({x:width/2+actionWidth/2+9,y:height-40,width:actionWidth,height:52}),
  })
  const within=(item)=>item.width>=44&&item.height>=44&&
    item.x-item.width/2>=side&&item.x+item.width/2<=width-side&&
    item.y-item.height/2>=10&&item.y+item.height/2<=height-12
  if([...cards,...Object.values(navigation)].some(item=>!within(item)))return null
  if(cards.some(card=>card.y+card.height/2>navigation.map.y-navigation.map.height/2-8))return null
  return Object.freeze({viewport:{width,height},cards,navigation})
}

function addAction(scene,item,label,target,primary) {
  const g=scene.add.graphics().setDepth(30)
  g.fillStyle(primary?0xffd95a:0xf8fdff,1)
    .lineStyle(2,primary?0xffe998:0xb5e2f5,1)
    .fillRoundedRect(item.x-item.width/2,item.y-item.height/2,item.width,item.height,16)
    .strokeRoundedRect(item.x-item.width/2,item.y-item.height/2,item.width,item.height,16)
  scene.add.text(item.x,item.y,label,{
    fontFamily:FONT,fontSize:'17px',fontStyle:'bold',color:'#173248',
  }).setOrigin(0.5).setDepth(31)
  return scene.add.rectangle(item.x,item.y,item.width,item.height,0,0.001)
    .setDepth(32).setInteractive({useHandCursor:true})
    .on('pointerdown',()=>scene.scene.start(target))
}

function renderTown(scene,layout) {
  const {width:W,height:H}=layout.viewport
  const summary=getTownSummary()
  const fishes=getCatches()
  const total=summary.totalLevel??0
  const background=total>=12?ASSETS.backgrounds.townBustling
    :total>=6?ASSETS.backgrounds.townGrowing:ASSETS.backgrounds.townQuiet
  if(!addCoverImage(scene,background.key,W,H,0))
    scene.add.rectangle(W/2,H/2,W,H,0x7bbbd6)
  const shade=scene.add.graphics().setDepth(1)
  shade.fillGradientStyle(0x062437,0x062437,0x062437,0x062437,0.45,0.15,0.25,0.1)
  shade.fillRect(0,0,W,H)
  scene.add.text(24,19,'みんなの港町',{
    fontFamily:FONT,fontSize:'27px',fontStyle:'bold',color:'#ffffff',
    shadow:{offsetX:0,offsetY:2,color:'#0a2a3c',blur:3,fill:true},
  }).setDepth(10)
  scene.add.text(26,59,`釣果 ${fishes.length}匹  /  ${getScore().toLocaleString()} pt  /  施設Lv ${total}`,{
    fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:'#ebfaff',
    backgroundColor:'rgba(6,38,58,0.70)',padding:{x:12,y:7},
  }).setDepth(10)
  const controls=Object.create(null)
  for(const [i,b] of layout.cards.entries()){
    const {id,name,accent}=FACILITIES[i]
    const lv=summary.facilities?.[id]??0
    const g=scene.add.graphics().setDepth(15)
    g.fillStyle(0x0b2d44,0.16).fillRoundedRect(b.x-b.width/2+2,b.y-b.height/2+3,b.width,b.height,19)
    g.fillStyle(0xf8fdff,0.97).lineStyle(2,accent,0.95)
      .fillRoundedRect(b.x-b.width/2,b.y-b.height/2,b.width,b.height,19)
      .strokeRoundedRect(b.x-b.width/2,b.y-b.height/2,b.width,b.height,19)
    g.fillStyle(accent,0.16).fillRoundedRect(b.x-b.width/2+11,b.y-b.height/2+10,b.width-22,72,13)
    const art=getTownFacilityArt(id,lv)
    if(art?.key&&scene.textures.exists(art.key))
      scene.add.image(b.x,b.y-27,art.key).setDisplaySize(78,61).setDepth(16)
    scene.add.text(b.x,b.y+21,name,{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',
      color:'#173248'}).setOrigin(0.5).setDepth(17)
    scene.add.text(b.x,b.y+47,lv>0?`Lv.${lv} / 5`:'未発展',{
      fontFamily:FONT,fontSize:'13px',fontStyle:'bold',color:'#476c80',
    }).setOrigin(0.5).setDepth(17)
    controls[id]={level:lv,artKey:art?.key??null}
  }
  const actions=layout.navigation
  scene._qaNativeTownControls={
    map:addAction(scene,actions.map,'次の釣り場へ','MapScene',true),
    home:addAction(scene,actions.home,'ホームへ','HomeScene',false),
  }
  scene._qaNativeTownLayout=layout
  scene._qaNativeTownFacilityState=controls
}

export function installNativeLandscapeTownPrototype(TownScene) {
  if(TownScene.prototype.__nativeLandscapeTownInstalled)return
  TownScene.prototype.__nativeLandscapeTownInstalled=true
  const previous=TownScene.prototype.create
  TownScene.prototype.create=function(...args){
    if(isNativeLandscapeQaEnabled(typeof window === 'undefined' ? '' : window.location.search,'nativeLandscapeTown')){
      const layout=getNativeTownLayout(this.scale.width,this.scale.height)
      if(layout){
        renderTown(this,layout)
        // Result→Town owns the catch once. The horizontal staging view must
        // preserve that same arrival instead of silently dropping it.
        const catchArrival=args[0]?.catchArrival
        if(catchArrival?.fishId)this._showCatchArrival(catchArrival)
        return
      }
    }
    return previous.apply(this,args)
  }
}
