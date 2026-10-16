# AINAN H04/H05｜既存の釣りゲームへの広域海・カメラ追従統合

2026-10-16。**QA限定。実装スライスであり、背景の美術承認や本番公開ではない。**

## 実装
通常の`GameScene`を改造した別作品ではなく、`installFishingRuntime`で既に動作するキャスト・竿・糸・浮き・巻取り・HIT/Result処理をそのまま利用する。

| 対象 | 実装 |
|---|---|
| QA URL | `/fishing-game/?qa=1&scene=GameScene&cameraPan=1&coneLoop=1&qaHarborPlayable=1` |
| 背景 | `installHarborPlayableQa.js`で`harbor-h02-{far,sea,quay}-qa.svg`をPhaserに**実ロード**し、ワールド座標・depthを維持して描画 |
| 元画面 | 既存`_blueprintWaterLayers`等のQA水面を隠し、旧900pxミラー画像が広域背景に混ざることを防止 |
| プレイヤー | 既存`_cameraPanPlayer`とnative竿/糸を維持。性別/衣装/猫の本格差し替えはH03/H06に残す |
| カメラ | 既存`FishingCameraController`のみ。QA中だけworld boundsを2160×1800にし、待機時は港の遠景を見せ、飛行中は竿先/ルアー方向にパン |
| 操作 | 既存の左下引っ張り式、キーボードキャスト、HIT/巻取りを流用。投擲軌道・水域の有効判定・距離制限・確率や報酬は変更しない |
| 終了 | resize listener/背景スプライト/QAバッジを解放し、通常プレイにQAアートが残らない |
| 通常版 | `qa=1`など4フラグがそろわなければ一切有効化しない。pointB/Cは対象外。既存`FISHING_WORLD`、Asset Manifest、RC3はそのまま |

## 試験
- `node scripts/harbor-playable-qa-smoke.mjs`: URLゲート、描画責務・world bounds・通常版非干渉を検査。
- `node scripts/capture-harbor-playable-game.mjs`: 390×844と844×390でPhaserの3背景が実際にロード/描画されることを確認し、**キーボードで右斜めへキャスト**、竿/浮きの位置、カメラ移動、前後スクリーンショットを記録。通常URLにQAテクスチャが入らないことも確認。
- CI: build + full mobile E2E と独立H02ブラウザQA。成功した検証のみDone。

## 未完了／制約
- 素材は依然として QA用ワイヤーフレームで、承認された高品質なworld-only背景ではない。H02未完了。
- 独立した男性/女性素体・上衣・下衣・靴・装備差分・猫はH03/H06。
- 竿先からルアーへのカメラ追従はQA実動作を確認するが、長距離キャストの再設計、着水後のゲーム全フェーズ、実タッチ・巻取り・アニメ・回転の総合検証はH05/H07。
- `qaHarborPlayable=1`のみ、あるいは通常起動では有効にならない。実機iPhone Safari/PWAは #27 の別チェックリスト。
- 美術承認がないまま通常ゲームの表示・manifest・釣獲率・セーブ形式・RCを変更しない。
