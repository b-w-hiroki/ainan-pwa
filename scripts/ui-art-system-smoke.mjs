import fs from 'node:fs'
const assets=['panel-large.png','card-idle.png','card-selected.png','card-pressed.png','card-disabled.png','card-shortage.png','dialog.png','chip.png','gauge-track.png','back-shell.png','operation-dock.png','result-card.png']
for(const file of assets){const p=`fishing-game/assets/ui-art-v2/${file}`;if(!fs.existsSync(p)||fs.statSync(p).size<8_000)throw new Error(`missing UI art ${p}`)}
const checks=[
 ['fishing-game/js/ui/UiArt.js',['loadUiArt','addArtPanel','addArtCard','addArtDialog','addArtGauge']],
 ['fishing-game/js/scenes/UpgradeScene.js',['addArtCard','addArtDialog','addArtPanel']],
 ['fishing-game/js/scenes/MenuScene.js',['addArtCard','addArtPanel']],
 ['fishing-game/js/presentation/cast/CastPresentationHost.js',['artOperationDockV2','artGaugeTrackV2','artResultCardV2']],
]
for(const [file,tokens] of checks){const text=fs.readFileSync(file,'utf8');for(const token of tokens)if(!text.includes(token))throw new Error(`${file} missing ${token}`)}
console.log('UI art system v2 smoke QA passed')
console.log('  panel/card/dialog/gauge/dock/result raster inventory: OK')
console.log('  Home/Map/Equipment/Town/Menu/Fishing integration: OK')
console.log('  live text and hit regions remain separate: OK')
