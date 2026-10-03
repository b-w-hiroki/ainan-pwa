# AINAN Mobile Polish QA

Target viewport: **390 × 844**. Run once per fishing spot after a visual/gameplay polish pass.

## Fishing loop
- [ ] 汐風港: キャスト → 誘い → HIT → バトル → 釣果まで完走できる
- [ ] 蒼海湾: 同上。魚影・水面FX・操作UIが重ならない
- [ ] 黒潮崎: 同上。レア/クエ演出でも画面外にはみ出さない
- [ ] HIT文言が魚種ごとに変わり、タップ指示として読める
- [ ] バトル中、魚種ごとの動きに体感差がある
- [ ] 釣果画面でレアリティ演出が魚本体より目立ちすぎない

## Home / stamina
- [ ] スタミナ1以上: 「釣りに行く」でMapSceneへ進む
- [ ] スタミナ0: 回復待ちCTAになり、MapSceneへ直接遷移しない
- [ ] スタミナ0: 残り回復時間が表示される
- [ ] ジェム3以上: 全回復でき、ジェムが3減る
- [ ] ジェム不足: 回復処理が走らない
- [ ] 3回目ごとのデイリーボーナスでジェム1を受け取れる

## Town
- [ ] にぎわい12未満: 静かな状態
- [ ] にぎわい12以上: 光の気配が追加される
- [ ] にぎわい28以上: 水面/町の動きが増える
- [ ] にぎわい70以上: 祝祭感が明確に強くなる
- [ ] 施設Lvアップで施設本体・NPC・装飾の変化が確認できる

## Regression
- [ ] Title → Home → Map → Game → Result → Home が正常
- [ ] ミッション / ライセンス / 図鑑 / 強化 / 交換 / 町へ遷移できる
- [ ] localStorageの既存進行が保持される
- [ ] コンソールエラー0
- [ ] 目立つフレーム落ち・入力遅延なし

## Shared product-quality checks
- [ ] Readability is judged from the final CSS pixels at the real viewport and device-pixel ratio, not from nominal design coordinates.
- [ ] Spacing expresses meaningful grouping and hierarchy; avoid mechanically equal empty gutters.
- [ ] Visuals, labels, and hit areas share the same perceived alignment.
- [ ] Each phase gives the primary action clear priority; irrelevant controls are hidden or disabled.
- [ ] Every interactive hit area is at least 44 x 44 CSS pixels.
- [ ] State changes use color plus shape, text, or motion; color is never the only signal.
- [ ] Art assets remain independent from live text, values, and hitboxes so content can change safely.
- [ ] Input motion, gauge, character pose, and outcome are driven by one timeline/state clock.
- [ ] Interruptions are regression-tested: `pointercancel`, release outside, multi-touch, rapid repeat, Back, resize/rotation, reduced motion, and keyboard input.
- [ ] Reuse interaction and layout principles across products, but do not copy AINAN fish or sea visuals into another product.

## CI
- [ ] PRの `CI / build` が成功している
