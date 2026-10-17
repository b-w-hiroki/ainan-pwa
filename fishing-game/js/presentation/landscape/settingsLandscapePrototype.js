import { characterAppearanceCard } from '../../game/characterAppearance.js'
import { isNativeLandscapeQaEnabled } from './nativeLandscapeQaFlags.js'
import { ASSETS } from '../../config/assetManifest.js'
import { FONT } from '../../config/fontStyles.js'
import { buildSettingsCards } from '../../game/settingsEntries.js'
import { SAVE_VERSION } from '../../game/saveSystem.js'
import { addCoverImage } from '../../utils/imageLayout.js'

export function getNativeSettingsLayout(width,height) {
  if(![width,height].every(Number.isFinite)||width<740||height<370||width<=height)return null
  const margin=18,gap=12
  const cardW=(width-2*margin-gap)/2,cardH=54,rowGap=8
  const cards=Object.freeze(Array.from({length:8},(_,i)=>Object.freeze({
    index:i,x:margin+cardW/2+Math.floor(i/4)*(cardW+gap),
    y:116+(i%4)*(cardH+rowGap),
    width:cardW,height:cardH,
  })))
  const back=Object.freeze({x:width-65,y:43,width:94,height:52})
  if(cards.some(c=>c.y+c.height/2>height-20||c.width<44||c.height<44))return null
  return Object.freeze({viewport:{width,height},cards,back})
}

function renderSettings(scene,layout){
  const {width:W,height:H}=layout.viewport
  if(!addCoverImage(scene,ASSETS.backgrounds.townGrowing.key,W,H,0))
    scene.add.rectangle(W/2,H/2,W,H,0x70b9d4)
  scene.add.rectangle(W/2,H/2,W,H,0x072d43,0.62).setDepth(1)
  scene.add.text(24,18,'設定・データ',{
    fontFamily:FONT,fontSize:'27px',fontStyle:'bold',color:'#ffffff',
  }).setDepth(3)
  scene.add.text(24,58,'サウンド・操作・保存データを管理',{
    fontFamily:FONT,fontSize:'14px',color:'#e5faff',
  }).setDepth(3)
  const [appearanceTitle, appearanceValue, changeAppearance] = characterAppearanceCard(scene)
  scene.add.text(W / 2, 42, appearanceTitle + '：' + appearanceValue + ' ›', {
    fontFamily:FONT,fontSize:'14px',color:'#ffffff',backgroundColor:'#173248',padding:{x:12,y:16},
  }).setOrigin(0.5).setDepth(12).setInteractive({useHandCursor:true}).on('pointerdown',changeAppearance)
  const cards=buildSettingsCards(scene)
  const controls=Object.create(null)
  for(const [index,layoutCard] of layout.cards.entries()){
    const [title,value,action]=cards[index]
    const c=layoutCard,x=c.x-c.width/2,y=c.y-c.height/2
    const g=scene.add.graphics().setDepth(6)
    g.fillStyle(0x0a2538,0.18).fillRoundedRect(x+2,y+3,c.width,c.height,14)
    g.fillStyle(0xf8fdff,0.98).lineStyle(1.6,0xb7dbea,0.94)
      .fillRoundedRect(x,y,c.width,c.height,14)
      .strokeRoundedRect(x,y,c.width,c.height,14)
    scene.add.text(x+15,y+14,title,{
      fontFamily:FONT,fontSize:'15px',fontStyle:'bold',color:'#173248',
    }).setDepth(7)
    scene.add.text(x+15,y+35,value,{
      fontFamily:FONT,fontSize:'11px',color:'#446c84',
    }).setDepth(7)
    scene.add.text(x+c.width-16,c.y,'実行 ›',{
      fontFamily:FONT,fontSize:'13px',fontStyle:'bold',color:'#b37212',
    }).setOrigin(1,0.5).setDepth(7)
    const hit=scene.add.rectangle(c.x,c.y,c.width,c.height,0,0.001)
      .setDepth(8).setInteractive({useHandCursor:true}).on('pointerdown',action)
    controls[title]={hit,label:value,index}
  }
  const b=layout.back
  const g=scene.add.graphics().setDepth(11)
  g.fillStyle(0xf8fdff,0.98).lineStyle(2,0xc1e5f2,0.9)
    .fillRoundedRect(b.x-b.width/2,b.y-b.height/2,b.width,b.height,16)
    .strokeRoundedRect(b.x-b.width/2,b.y-b.height/2,b.width,b.height,16)
  scene.add.text(b.x,b.y,'‹ 戻る',{
    fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:'#173248',
  }).setOrigin(0.5).setDepth(12)
  const back=scene.add.rectangle(b.x,b.y,b.width,b.height,0,0.001)
    .setDepth(13).setInteractive({useHandCursor:true})
    .on('pointerdown',()=>scene.scene.start('MenuScene'))
  scene.add.text(24,H-17,'SAVE VERSION '+SAVE_VERSION,{
    fontFamily:FONT,fontSize:'11px',color:'#f3fdff',
  }).setDepth(3)
  scene._qaNativeSettingsLayout=layout
  scene._qaNativeSettingsControls=controls
  scene._qaNativeSettingsBack=back
}

export function installNativeLandscapeSettingsPrototype(SettingsScene){
  if(SettingsScene.prototype.__nativeLandscapeSettingsInstalled)return
  SettingsScene.prototype.__nativeLandscapeSettingsInstalled=true
  const original=SettingsScene.prototype.create
  SettingsScene.prototype.create=function(...args){
    if(isNativeLandscapeQaEnabled(typeof window === 'undefined' ? '' : window.location.search,'nativeLandscapeSettings')){
      const layout=getNativeSettingsLayout(this.scale.width,this.scale.height)
      if(layout)return renderSettings(this,layout)
    }
    return original.apply(this,args)
  }
}
