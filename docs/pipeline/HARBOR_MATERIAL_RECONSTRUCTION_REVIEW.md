# 港Cast：人物背面の海・桟橋の材質分離再構築（レビュー候補）

**状態：試作用。通常ゲーム表示・manifest・Asset State Matrix・RCは変更しない。**

## 問題
PR #126のTeleaだけでは水面がぼけ、PR #138の横方向水面コピーでは
人物の足元まで海になり桟橋の構造を壊す。どちらも本番不採用。
現在のmainでは承認済みコンポジットを維持する。

## 今回の候補
'scripts/art/reconstruct-harbor-material-review.py' は承認済み
'cast-harbor-composite-base.png' の人物形状に一致した透明領域だけを対象に、
**水面（水面と同じ高さ）と桟橋（右側の斜め材木面の方向に沿う）**を分けて
元の絵の色を候補としてサンプリングする。既知の全画素はRGBAを完全保持。
不明領域を平坦な海色や水面だけで埋めない。

人物にはmainで既に追跡中の'cast-player-silhouette-candidate.png'を使用。
位置-18、0、+18pxのレビュー用合成PNGを生成するが、これはゲーム内の本物の
モーションではない。材質分離の境界線 y≈423+0.315x は手検証用の仮定であり、
正確な桟橋の隠れた線を復元できたと主張しない。

## 再現・レビュー
- Python 3.12、numpy 1.26.4、opencv-python-headless 4.10.0.84
- python scripts/art/reconstruct-harbor-material-review.py --out artifacts/art-review/harbor-material
- PR内の独立 Harbor material-aware occlusion review workflow の
  harbor-material-aware-review artifactで3姿勢の比較画像とJSON指標を取得。

## Gate（本番切替禁止条件）
1. 桟橋の遠近・輪郭・継ぎ目、水面の光・反射、人物の髪・手・脚を目視評価する。
2. 竿・ラインと手の接続、-18/0/+18の端のちらつき・残像を**実ゲーム内**で再QA。
3. 390×844のCast→Retrieve→HIT→Battle→Resultで操作し、承認モックとの
   Before/Afterを比較。844×390は別のworld/UI分離gate。
4. 参照する画素の変更ではなく欠損の推定であり、背景パース・重複波模様
   等の不備が残れば採用しない。
5. 画質承認後に限り、独立パーツのmanifest・出所・state・Visual Ownerを
   更新し、再build・smoke・Playwright・CIを通して通常ゲームに昇格する。

この文書と候補生成は**Issue #140の検討証跡**であり、人物背面補完・
独立人物アニメーションのDoneではない。
## 材質境界の診断（2026-10-13）

レビュー候補には `seam-boundary-review.png` を追加。赤は海／桟橋の**推定境界**、黄色は人物で隠れていた穴の外周を示す（BGR描画上は赤・黄）。数値は `material-review.json.material_seam_diagnostic` に保存する。
これは縫い目の監査場所を示すだけで、繰り返し波・桟橋パース・足元・竿の自然さを自動保証しない。評価用のみで、本番素材は引き続き変更しない。

## 桟橋境界3案の同条件比較

背面に隠れている桟橋境界の推定を、元の `y≈423+0.315x` に対し `−6 / 0 / +6px` の3条件で試作する。`quay-edge-variants-board.jpg` と各中央姿勢PNGを生成し、水面・桟橋・足元の接続を横並びで審査する。全条件で同一の人物切り抜き・同一の補完穴・元の既知RGBAを保持する。メトリクスは `material-review.json.quay_edge_variants` に記録する。**いずれも自動承認せず、本番素材として組み込まない。**

## 複写構造物のドナー品質診断（H02）

元の参考画で既知の「係船柱」（概算 source x=209..271, y=485..554）と「ロープ」（x=133..322, y=518..563）を**参照元にしてはいけない構造物候補**として注記する。
`donor-structure-risk-map.png` の赤は係船柱が欠損領域に複写された画素、黄色はロープ、紫は重複した領域。割合と対象ピクセル数は `material-review.json.donor_structure_reuse` を参照する。

このROIは手指定の監査用推定値であり、被写体を正しく分割したマスクではない。既存の試作では桟橋ドナーの一部に柱・ロープが大量に含まれており、透明穴が埋まっただけで「桟橋復元」とする判断を禁止する。H02では桟橋の板・天面・縁線を**構造物と分けて**原画に忠実に設計し直す必要がある。H03の再試作後に同じ指標と `world-only` 画を確認する。**この変更だけでは候補画の絵も本番ゲームも改善していない。**
