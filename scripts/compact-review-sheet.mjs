import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const sizes=[[320,480],[320,568],[375,667],[390,844]];
const phases=['cast','retrieve','wait','battle','result'];
export function buildSheet(records,hasImage){
 const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let missing=0;
 const html=sizes.map(([w,h])=>phases.map(phase=>{
  const cards=['ordinary-layout-with-qa-fixture','compact-qa'].map(mode=>{
   const file=`${mode==='compact-qa'?'qa':'ordinary-layout'}-${w}x${h}-${phase}.png`;
   const rows=records.filter(r=>r.width===w&&r.height===h&&r.phase===phase&&r.mode===mode);
   const ok=rows.length===1&&hasImage(file);if(!ok)missing++;
   const r=rows[0];return `<figure><figcaption>${mode==='compact-qa'?'候補（QA専用）':'現在の構図（QA fixture）'}</figcaption>${ok?`<img src="${file}" alt="${w}×${h} ${phase} ${escape(mode)}"><p>Result操作高: ${escape(r.before?.resultActionCssHeight??'未記録')} CSS px</p>`:'<p class="missing">証拠が不足または重複。採用判定不可。</p>'}</figure>`;
  }).join('');return `<section><h2>${w}×${h} / ${phase}</h2><div class="pair">${cards}</div></section>`;
 }).join('')).join('');
 return {missing,html:`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AINAN 短画面比較</title><style>body{font:16px sans-serif;background:#eee;color:#222;max-width:1000px;margin:auto;padding:20px}.pair{display:flex;gap:12px;overflow:auto}figure{margin:0;min-width:160px;flex:1}img{width:100%;height:auto}figcaption{font-weight:bold;padding:8px}section{margin:24px 0}.missing{color:#a21}p{line-height:1.6}</style><h1>AINAN 同条件の構図比較</h1><p>これは自動撮影したQA fixtureの比較です。人の評価・実機確認・通常版への採用を証明しません。顔・服・色・素材は変更していません。</p><p>確認: 主要操作の読みやすさ、人物と竿の接続、射線、余白、回転復帰。候補は自動採用せず、既存の素材・保存・390×844を維持します。</p>${html}</html>`};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const dir=process.argv[2]||'artifacts/compact-migration-comparison';
 const records=JSON.parse(readFileSync(join(dir,'results.json'),'utf8'));
 if(!Array.isArray(records))throw Error('Expected capture records array');
 const result=buildSheet(records,f=>existsSync(join(dir,f)));
 writeFileSync(join(dir,'index.html'),result.html);
 console.log(`Review sheet written; ${result.missing}/40 views missing or duplicate`);
 if(result.missing)process.exitCode=1;
}
