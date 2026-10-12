// Species identity is expressed through the existing Town arrival owner.
// This is a short line of dialogue, not a claim of new market inventory or
// cooking/unlock functionality. Those systems have separate progression data.
const REACTIONS = Object.freeze({
  aji: '魚市場「いいアジだ！」食堂でも今日の一皿を考えている。',
  tai: '食堂「マダイが届いた！」祝い膳の話題で港がにぎわう。',
  bass: '案内人「ブラックバスの記録だ！」釣り談議が弾みそうだ。',
  buri: '魚屋「ブリが来た！」売り場を見に人が集まってくる。',
  kue: '市場から「クエだ！」の声。町じゅうに知らせが広がる。',
  saba: '魚屋「サバは鮮度が命！」食堂では塩焼きの相談中。',
  isaki: '料理人「イサキなら炙りかな？」今日の料理を考えている。',
  hirame: '食堂「ヒラメの薄造りにしたい！」市場も注目している。',
  kanpachi: '魚屋「カンパチが入った！」刺身の話で店先がにぎわう。',
})

export const TOWN_CATCH_REACTION_IDS = Object.freeze(Object.keys(REACTIONS))

// Returns null for unknown IDs, allowing rarity-based copy to remain safe.
export function getTownCatchReaction(fishId) {
  return Object.hasOwn(REACTIONS, fishId) ? REACTIONS[fishId] : null
}
