import { getBossStates } from './midgameProgression.js'

// One navigation registry for portrait and QA-only native landscape Menu.
// Badge states are derived from the same persisted boss progression.
export function getMenuEntries() {
    const bosses = Object.values(getBossStates())
    const clearedBosses = bosses.filter(item => item.cleared).length
    const claimableBoss = bosses.some(item => item.cleared && !item.claimed)
    const challengeDesc = 'エリアボス ' + clearedBosses + '/' + bosses.length + '　記録サイズに挑戦'
    return [
      { title: '魚図鑑', desc: '釣った魚と未発見の魚を確認', glyph: 'book', color: 0x5bb5d8, scene: 'CollectionScene' },
      { title: '大物挑戦', desc: challengeDesc, glyph: 'trophy', color: 0x173248, scene: 'ChallengeScene', badge: claimableBoss ? 'GET' : clearedBosses === bosses.length ? 'CLEAR' : 'NEW' },
      { title: '交換所', desc: 'ポイントを港の記念品と交換', glyph: 'gift', color: 0xff765a, scene: 'ExchangeScene' },
      { title: '魚屋・食堂', desc: '釣果を売って料理バフを受ける', glyph: 'shop', color: 0xff9b5e, scene: 'HarborServicesScene' },
      { title: 'ランク', desc: '釣り人としての成長を確認', glyph: 'rank', color: 0xffd95a, scene: 'RankScene' },
      { title: 'プロフィール', desc: '釣果・実績・育成状況をまとめて確認', glyph: 'profile', color: 0x71d6a2, scene: 'ProfileScene' },
      { title: '遊び方', desc: '釣りと町おこしの基本を確認', glyph: 'help', color: 0x8f80e8, scene: 'HelpScene' },
      { title: '設定・データ', desc: 'サウンド・バックアップ・復旧', glyph: 'settings', color: 0x5bb5d8, scene: 'SettingsScene' },
    ]
}
