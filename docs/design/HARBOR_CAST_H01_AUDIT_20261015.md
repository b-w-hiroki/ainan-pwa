# H01｜港キャスト現行実装の棚卸し（2026-10-15）
基準 main: `fe0b81eb1ff5dfb04b5250e965c81c6f40e55503` / 関連 #140, #118, #108

## 現行owner（コード確認済み）
| 対象 | 既存owner / 情報 | 今後の方針 |
| --- | --- | --- |
| Phaser scene | `fishing-game/js/scenes/GameScene.js`：cast/wait/battle/result、`BackgroundManager`、`BobberManager`、GameScene内部の入力とセーブ | 既存シーンを維持 |
| ランタイム統合 | `fishing-game/js/game/installFishingRuntime.js`：installFinalGuardsで cameraPan → cone → diagnostics の順にwrapper適用 | 追加wrapperを作る前に再利用 |
| 操作・投射軌道 | `game/pullCastTuning.js`、`game/cast.js`、`game/installConeCastRetrievePrototype.js` | 左下から斜め下に引き、逆方向（右上）に飛ばす既存入力を維持。入力の起点は論理world anchor、描画上の握り/竿先は別座標 |
| 釣りworld・camera | `scenes/components/FishingCameraController.js`：world 900×1400、player (138,1160)、水域 x70..830, y120..1020、足場はland polygon。Cast/aim/retrieve/HIT/battle/resultのカメラ関数あり | 新CameraControllerを併設しない。既存追従の先読み・停止/復帰を改善 |
| QA専用動的world | `game/installCastCameraPanPrototype.js`：URLのcameraPan/coneLoop/ネイティブ横画面QAでopt-in。拡張world背景、人物、竿、ライン、HUDを描画、release後に釣り餌とカメラを動かす | **通常版の見た目とは別**。既存の承認済み通常版は保持 |
| キャスト範囲 | `game/installConeCastRetrievePrototype.js`：角度fan、着水が水域かつ足場polygon外か確認 | **着水点だけであり、射線の障害物を保証しない**。隙間・桟橋突起・係船柱などは追加調査が必要 |
| 人物アニメ | `presentation/cast/CharacterMotionController.js`：idle/振りかぶり/左右耐え/喜び/悲しみの完成姿勢sprite、hand/grip/tip座標、QA ±18px。native竿線も描く | 姿勢とソケットを再利用、素体/衣装への本分離はまだ未達。native竿・糸描画ownerの二重化に注意 |
| 装備表示 | `presentation/equipmentVisuals.js`：basic/carbon/premiumの竿lengthScale・線の調子、cap/bagの装飾/取り付け位置 | 釣り竿差分は一部存在。性別・上下服・靴・猫等の独立素材・組合せは未完成 |
| アセット台帳 | `config/assetManifest.js`：動作ポーズPNG、竿SVG、背景、通常版画面パーツ。GameScene.preloadはQA導線のみ一部split assetを読み込む | asset provenance・alpha・pivot・描画ownerを管理し、明示承認まで本番には入れない |
| 保存 | `GameScene.js`から`game/progress.js`へ既存釣果/装備の参照と保存 | 新ビジュアルは装備IDを参照、セーブ形式/釣果確率を勝手に変更しない |

## 固定差分
1. **広域海**：現行world 900×1400・水域範囲では、画面外を長距離追う海の広がりは素材/カメラ/水域すべて不足。横向きはQA試作のみで本番ではない。
2. **人物下の欠損**：Harbor approved mockの人物背面（桟橋上面・正面側面・海面）が未復元。過去のTeleaと横コピーは不採用。アート担当による見た目承認を別gateとする。
3. **見た目差し替え**：竿3系統とcap/bagの表現は存在するが、性別差・上衣/下衣/靴・猫は承認済みの独立描画資産ではない。
4. **キャスト射線**：現行コードの着水点検証では途中の障害物を見ない。追加の`castClearZone.js`は明示配置物体の軌道交差を判定する**QA用純粋関数**。現行釣りへはまだ接続しない。足元の出発足場を障害物全体として指定すると誤判定するので、突起物を別ポリゴン/円形で指定する。
5. **カメラ**：QAではリリース・餌位置・カメラ開始が結ばれているが、竿先から海側へ自然に視線移動し、画面外でworldが広がる「長い追従」は未承認。従来の撮影された静止画スクロールと誤認しないよう、ワールド空間のルアー・camera実座標で証拠を残す。

## 次の順序
- H02：空・海面・桟橋上面・前面を背景として新規作画し、既存画と比較。候補は常にQA専用、承認前の本番利用禁止。
- H03：プレイヤー素体/服/竿/猫の独立alpha素材と `feet`/`grip`/`tip` socket定義。竿と糸の描画責務1箇所。
- H04/H05：`castClearZone.js`を作者指定propsとQA専用試作に接続し、現行`FishingCameraController`へ竿先→ルアー→着水→復帰の遷移を統合。
- H07：390×844のCast→Result実ブラウザ撮影、±18px、装備組合せ、承認済み原画との差比較、44pxタップ領域、CI。
- 横画面本番化#118・iPhone実機#27は独立した終了条件。ここで完了にしない。

## 検証と限界
`scripts/harbor-cast-clearzone-smoke.mjs`でowner順序と障害物交差の正常/異常を確認する。実際の背景に含まれる障害物をAIが完全に認識したこと、足場の遠近が自然なこと、動作が完成したことの証明ではない。既存ゲームのcast確率・セーブ・通常版画像には今回触れない。
