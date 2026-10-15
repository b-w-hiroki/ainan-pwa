# Harbor H02 — 構造を描き直す素材候補（2026-10-15）

## 対象と位置づけ
対象: Issue #140 / H02。従来のTelea全面修復・横コピー・係船柱やロープをドナーにした欠損補完を使用せず、人物の背後の **水面・桟橋天面・桟橋正面側面** を別々に着色した候補を生成する。

**本番不採用・アート未承認。** 本番の `approved-mock` 原画、Asset Manifest、通常版Scene、セーブ、RCバージョンを変更しない。人物の切り抜きは #140 H03 で未完了。広い海（画面外へのカメラ追従に耐えるワールド素材）も未完成。

## 新しく描き直す仕組み
- `scripts/art/reconstruct-harbor-authored-review.py`: 承認原画391×783の既知RGBAを保持し、既存の透明なプレイヤー形状の穴だけを埋める。
- 水面: 原画の既知水域（柱・ロープより上、人物欠損より右側）からサンプル。過剰な水面複写が自然であることは保証しない。
- 桟橋天面: 可視アンカー6点の後縁 `y=intercept+slope*x` と `y=495+0.22*x` の前縁の間に、**独立した板面の色・明暗・遠近方向の継ぎ目とテクスチャ**を描く。桟橋の柱・ロープの色をコピーしない。
- 桟橋正面側面: 天面とは別の陰影、縦継ぎ目と質感を描く。
- 3pxの継ぎ目だけInpaintを使う。ピア全体を塗りつぶすinpaint/ドナー複写は避ける。
- 比較: 同一worldで人物-18/0/+18pxを合成し、欠損の見え方をチェック。現状の人物素材自体には海や桟橋の残像が含まれるため**人物の独立可動には使えない**。

## 出力（GitHub Actions artifact）
`artifacts/art-review/harbor-material/authored-h02/`:
- `h02-authored-world-candidate.png`：world-only候補
- `h02-authored-material-mask.png`：水面／天面／側面の区分
- `h02-authored-edge-diagnostic.png`：後縁・前縁・切り抜き外周を可視化
- `h02-authored-player--18.png` 等と `h02-authored-motion-board.jpg`：静止比較
- `h02-authored-review.json`：材料面積、元画像のハッシュ、修復範囲以外の画素完全一致、人による未承認状態
- `deck-texture-guard.json`：平坦化・縦帯の自動警告（これが通っても美術承認ではない）

生成: `python scripts/art/harbor-authored-review-smoke.py` と
`python scripts/art/reconstruct-harbor-authored-review.py --out artifacts/art-review/harbor-material/authored-h02`。

## 残る必須ゲート
1. **目視審査**：人物裏の桟橋天面・前面の遠近、海/桟橋境界、波、色味、筆致が原画と一致するか。候補に違和感があれば修正。
2. **広域海**：キャスト方向左下→右上に視線が抜ける背景を再構築。キャスト先の移動量+画面幅を覆うworldサイズ、全フェーズのカメラ追従、背景の継ぎ目を検証。現行391×783だけでは不足。
3. **人物 alpha / pivot / ソケット（H03）**：現行の人物抜き出し候補に水面や桟橋の画素が残る問題、帽子・手・竿・糸の独立ownerを解決する。
4. **キャスト射線**：桟橋と係船柱/猫などが竿先から投射・巻取りラインを塞がない。H01のQA用clear-zone検査は実地物体と未接続。
5. **QA**：390×844実ブラウザ Cast→Retrieve→HIT→Battle→Result、-18/0/+18px実モーションとWebGLキャプチャ、CI green、人による原画対比の明示承認。
6. 横画面の本番対応とiPhone実機は #118/#27の別ゲート。

**注**: 画像差分や自動品質指標が合格しても海・桟橋の再制作完了や1.0.0リリース可とは判定しない。
