# H03｜港プレイヤーの独立装備・オプション描画（QA）
作成 2026-10-16 / #140、H03/H06

## 実装範囲
本番の釣り人画像を加工・差し替えず、`installHarborModularQa`を既存GameSceneの`installHarborPlayableQa`後に適用。**通常のURLでは無効。**

QA URL（実ブラウザのみ）:
`?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&qaHarborPlayable=1&qaParts=1&qaCap=1&qaBag=1&qaCat=1&qaRod=basic`

- 帽子・鞄: 既存`ACCESSORY_VISUALS`のポーズ別ソケット位置と`createAccessoryAccent`を再利用し、胴体と別のPhaser GameObjectとして描画。待機・振りかぶり・放出等のポーズが変わってもactor位置/角度/拡縮に追従。未承認の色アクセントなので本番アートには使わない。
- 釣り竿: `ROD_VISUALS`のbasic/carbon/premiumを既存`_cameraPanRod`描画ownerに紐づけ。**二重描画なし**。QA URLによる差し替えはセーブに書き込まない。
- オプション（猫）: 独立したPhaser Containerとして追加。人物後ろの安全位置に配置し、投擲軌道から外す。**シルエットの仮表示**であり、高品質な猫PNGではない。
- `qaParts`がない通常ゲーム・既存の別QAでは追加しない。表示物とメタ情報はScene終了時に破棄する。
- 独立した性別/服装のアニメ差分はまだ素材がないため、`independentBodyVariantsReady=false` / `independentClothingArtReady=false`を常に保持し、完了としない。

## 検証
`npm run qa:harbor-modular`はポーズ別の座標変換、URLゲート、竿描画owner、保存処理非干渉を検査。
専用Playwrightは390×844の**実GameScene**で帽子/バッグ/猫/竿basic、実キャスト、猫と飛行軌道の非交差、通常`qaParts`未指定時の非表示を撮影。

## 残課題
1. 男性/女性などの素体差分を同じ画角・骨格/pivotで制作する
2. 帽子・上衣・下衣・靴・バッグを最終品質の透過PNGへ置き換え、各ポーズで欠損・重複を解消する
3. 猫などオプションを独立した高品質アセットにして装備IDとセーブへ正式接続する
4. H02背景に人物のみの綺麗なalpha素材を組み合わせ、−18/0/+18pxで原画と比較する
5. Cast→Retrieve→Battle→Result、縦横画面、iPhone実機でタッチ・音・保存をQAし、明示承認後に本番化する

**重要：QAシステム/仮素材の稼働はH03、H06、Issue #140の完了を意味しない。**
