import { ASSETS } from '../../config/assetManifest.js'
import { FONT } from '../../config/fontStyles.js'
import { getCatches, getScore } from '../../game/progress.js'
import { addCoverImage } from '../../utils/imageLayout.js'

// Native horizontal Home is deliberately an opt-in QA slice. The normal
// portrait Home, its daily reward, storage, and navigation remain untouched.
// Do NOT enable this in production until Map/Town/Menu etc. are reflowed.
export function getNativeHomeLayout(width, height) {
  if (![width, height].every(Number.isFinite) || width < 740 || height < 370 || width <= height)
    return null
  const inset = 18
  const panelWidth = Math.min(306, Math.floor(width * 0.38))
  const panel = Object.freeze({ x: width - inset - panelWidth, y: 16, width: panelWidth, height: height - 32 })
  const center = panel.x + panel.width / 2
  const buttonWidth = panelWidth - 44
  const main = Object.freeze({ x: center, y: panel.y + 138, width: buttonWidth, height: 64 })
  const left = Object.freeze({ x: center - (buttonWidth + 10) / 4, y: panel.y + 220, width: (buttonWidth - 10) / 2, height: 52 })
  const right = Object.freeze({ x: center + (buttonWidth + 10) / 4, y: panel.y + 220, width: (buttonWidth - 10) / 2, height: 52 })
  const settings = Object.freeze({ x: center, y: panel.y + panel.height - 38, width: buttonWidth, height: 48 })
  const actions = Object.freeze({ fish:main, town:left, collection:right, settings })
  const rect = item => ({
    left: item.x - item.width / 2, right: item.x + item.width / 2,
    top: item.y - item.height / 2, bottom: item.y + item.height / 2,
  })
  if (Object.values(actions).some(item => {
    const r = rect(item)
    return item.width < 44 || item.height < 44 || r.left < panel.x + 12 ||
      r.right > panel.x + panel.width - 12 || r.top < panel.y || r.bottom > panel.y + panel.height
  })) return null
  const boxes = Object.values(actions).map(rect)
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++)
      if (boxes[i].left < boxes[j].right && boxes[i].right > boxes[j].left &&
        boxes[i].top < boxes[j].bottom && boxes[i].bottom > boxes[j].top) return null
  return Object.freeze({ viewport: {width,height}, panel, actions })
}

function addHomeAction(scene, bounds, label, destination, primary = false) {
  const {x,y,width,height} = bounds
  const bg = scene.add.graphics().setDepth(31)
  const radius = Math.min(18, height / 3)
  bg.fillStyle(0x081f30, 0.18).fillRoundedRect(x-width/2+2, y-height/2+3, width, height, radius)
  bg.fillStyle(primary ? 0xffd95a : 0xf7fbff, 1)
    .lineStyle(1.8,primary ? 0xf9eaa6 : 0xb3def0, 0.95)
    .fillRoundedRect(x-width/2,y-height/2,width,height,radius)
    .strokeRoundedRect(x-width/2,y-height/2,width,height,radius)
  const text = scene.add.text(x,y,label,{
    fontFamily:FONT,fontSize:primary?'21px':'15px',fontStyle:'bold',
    color:'#173248',align:'center',
  }).setOrigin(0.5).setDepth(32)
  const hit = scene.add.rectangle(x,y,width,height,0,0.001).setDepth(33)
    .setInteractive({useHandCursor:true})
    .on('pointerdown',pointer=>{
      pointer?.event?.stopPropagation?.()
      scene.scene.start(destination)
    })
  return { hit, text, destination }
}

function renderHome(scene, layout) {
  const {width:W,height:H}=layout.viewport
  if (!addCoverImage(scene,ASSETS.backgrounds.homeBase.key,W,H,0))
    scene.add.rectangle(W/2,H/2,W,H,0x4aa7d2).setDepth(0)
  const dim = scene.add.graphics().setDepth(1)
  dim.fillGradientStyle(0x092d45,0x092d45,0x092d45,0x092d45,0.68,0.18,0.40,0.10)
  dim.fillRect(0,0,W,H)
  scene.add.text(30,30,'AINAN  /  釣りで育つ港町',{
    fontFamily:FONT,fontSize:'15px',fontStyle:'bold',color:'#e4faff',
  }).setDepth(10)
  scene.add.text(29,77,'今日も、海へ。',{
    fontFamily:FONT,fontSize:'34px',fontStyle:'bold',color:'#ffffff',
    shadow:{offsetX:0,offsetY:2,color:'#08243a',blur:3,fill:true},
  }).setDepth(10)
  scene.add.text(30,128,'釣った魚が、町を少しずつ変えていく。',{
    fontFamily:FONT,fontSize:'15px',color:'#e8f9ff',
  }).setDepth(10)
  scene.add.text(30,H-66,`${getCatches().length}匹の釣果  /  ${getScore().toLocaleString()} pt`,{
    fontFamily:FONT,fontSize:'17px',fontStyle:'bold',color:'#ffffff',
    backgroundColor:'rgba(4,39,62,0.74)',padding:{x:12,y:9},
  }).setDepth(10)
  const character = ASSETS.characters.guideDefault
  if (scene.textures.exists(character.key)) {
    const image = scene.add.image(Math.round(layout.panel.x*0.69),H-14,character.key)
      .setDepth(8).setOrigin(0.5,1)
    const source=image.texture.getSourceImage()
    const sx=source.naturalWidth??source.width??1,sy=source.naturalHeight??source.height??1
    const factor=Math.min(162/sx,Math.max(130,H-155)/sy)
    image.setDisplaySize(sx*factor,sy*factor)
  }
  const p=layout.panel
  const panel=scene.add.graphics().setDepth(20)
  panel.fillStyle(0x081f30,0.26).fillRoundedRect(p.x+3,p.y+4,p.width,p.height,24)
  panel.fillStyle(0xf5fcff,0.97).lineStyle(2,0xd5f7ff,0.84)
    .fillRoundedRect(p.x,p.y,p.width,p.height,24)
    .strokeRoundedRect(p.x,p.y,p.width,p.height,24)
  scene.add.text(p.x+p.width/2,p.y+42,'次の一投を選ぶ',{
    fontFamily:FONT,fontSize:'23px',fontStyle:'bold',color:'#173248',
  }).setOrigin(0.5).setDepth(24)
  scene.add.text(p.x+p.width/2,p.y+83,'釣り場を探す、町を育てる。',{
    fontFamily:FONT,fontSize:'13px',color:'#426b82',
  }).setOrigin(0.5).setDepth(24)
  const a=layout.actions
  scene._qaNativeHomeControls={
    fish:addHomeAction(scene,a.fish,'釣り場を選ぶ','MapScene',true),
    town:addHomeAction(scene,a.town,'町を見る','TownScene'),
    collection:addHomeAction(scene,a.collection,'魚図鑑','CollectionScene'),
    settings:addHomeAction(scene,a.settings,'設定','SettingsScene'),
  }
  scene._qaNativeHomeLayout=layout
}

export function installNativeLandscapeHomePrototype(HomeScene) {
  if(HomeScene.prototype.__nativeLandscapeHomePrototypeInstalled) return
  HomeScene.prototype.__nativeLandscapeHomePrototypeInstalled=true
  const previous=HomeScene.prototype.create
  HomeScene.prototype.create=function(...args) {
    const params=typeof window==='undefined' ? null : new URLSearchParams(window.location.search)
    if(params?.get('qa')==='1'&&params.get('nativeLandscapeHome')==='1') {
      const layout=getNativeHomeLayout(this.scale.width,this.scale.height)
      if(layout) return renderHome(this,layout)
    }
    return previous.apply(this,args)
  }
}
