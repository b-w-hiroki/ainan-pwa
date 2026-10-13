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