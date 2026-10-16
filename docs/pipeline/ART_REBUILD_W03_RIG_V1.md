# W03.1 人物の共通ソケット／レイヤー契約

**Status:** in_progress (rig/QA contract only; 新規高品質画像・男女差分は未制作)
- 親: [Issue #216](https://github.com/b-w-hiroki/ainan-pwa/issues/216)
- Work Unit: [#219](https://github.com/b-w-hiroki/ainan-pwa/issues/219)
- 本番画像・装備ID・セーブ・釣り確率に変更なし

## 目的
姿勢によって帽子・鞄・竿先の場所が変わる問題を、共通 `modularPlayerParts.js` に集約する。PR #215 のQA帽子/鞄の重ね描き処理と新W03素材の座標変換が異なると、キャスト時に装備がずれるため、既存実装を共通座標に接続。

## 共通入力
- ソース基準: 320×420、人物足元を `[160,420]` とする（Phaser元画像 `origin(0.5,1)` に一致）
- 姿勢: 13ポーズを `CHARACTER_MOTION_POSES` から参照し、待機/振りかぶり/リリース/抵抗/喜び/失敗をすべて扱う
- `hand` と `rodTip` は握る/竿を表示するポーズのみ。魚を持って喜ぶポーズでは無理に竿を生成しない
- `hat`/`bag` は既存全ポーズのソケットを再利用し、各衣服パーツも `feet` / torso関連アンカーから相対配置できるよう拡張予定
- 新規体型IDは `body-a` / `body-b` (ラベル暫定)。新画像と別alpha、頭身・足元・握りソケットを共有。片方の旧画像を色変更して正式版と主張しない
- native rod/line は各1 owner。帽子・髪・上衣・下衣・靴・バッグ・猫は独立GameObject。

## 検証
`npm run qa:part-rig`で13ポーズ×共通ソケット、2体型×3竿、服装ID、不正データ拒否、既存QA帽子/鞄との一致を検証。ソース存在/美術承認は未検証なので `availableNewSourceFiles=0`、`independentBodiesApproved=false` 等で未完了を厳格化。

## 次の実制作
1. 2つの素体、idle/castWindupの**新規透過素材**を同じキャンバス・視点・骨格で制作
2. 手・帽子・髪・上衣・下衣・靴・鞄を個別alpha/pngに分け、実pivot/遮蔽を持つ
3. 竿3種を既存ロードアウトへ接続、猫の独立位置と巻取り射線を装備別に検証
4. Cast→Retrieve→Battle→Resultの各モーションで素材を差し替え、390×844/844×390にて実PNG画像と元モックを比較
5. 品質基準を満たすまで通常プレイには反映せず、視覚承認なしにW03をDoneとしない。
