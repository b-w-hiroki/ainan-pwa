# W02 港背景 v2｜人物なし新規原画と独立素材化の記録

- 進捗正本: [Issue #218](https://github.com/b-w-hiroki/ainan-pwa/issues/218) / [親 #216](https://github.com/b-w-hiroki/ainan-pwa/issues/216)
- **状態: 素材分割試作（review / 未承認）、本番未採用**
- 入力: 新しい人物・猫・竿・UIなしの港風景原画、1536×1024 RGB、SHA-256 `0b12f339a946deb17370528b82f9623a450966db13e4727bcd50f9b1ddd7d274`
- 第1候補: [PR #224](https://github.com/b-w-hiroki/ainan-pwa/pull/224)のprocedural SVGは、港町・波・桟橋が平坦で**美術不採用**。QAコードのmainマージは美術承認ではない

## 第2候補で変えたこと
- 船・山・雲・住宅・石質感・水中地形・不規則な波の密度を備えた**新規港風景の全体像**を作成。説明ボード・人物・竿・猫・UIを含めない。
- 水面は右上へ開けており、前景はプレイヤー側の左下に限定。
- `scripts/art/split-w02-v2-source.py`で空・遠景（FAR）／海（SEA）／桟橋と後方の設置物（QUAY）をそれぞれ透過PNGとして切り出す。**重ならないマスクで1536×1024全画素を完全復元**するQAを追加。
- 元の絵を横コピー・Teleaで穴埋め・単純反転/引伸ししてはいない。
- 透過素材と再合成PNGおよびハッシュ付きmanifestが会話内のローカルレビュー用ZIPに生成された。ただしGitHubへ**画像のバイナリはまだ取り込まれていない**ため、ここに存在するのは制作用ソースコードとsource hash / 受入記録。画像ファイルがGitHubに存在すると記載しない。

## W02-v2 制作単位
1. **W02-v2-A 原画レビュー**：明るい港、青緑の奥行き、水面/石の密度はv1と比べて改善候補。横画角では景色が主役、縦画角ではプレイヤーを重ねたときの視認性・重なりを実撮影で確認する
2. **W02-v2-B レイヤー境界修正**：左の船・手すり・係船柱をfar/sea/quayで精密に分け、人物の陰影とworld座標の一致を確認する。現段階の境界は手描き多角形でありアニメ・パララックスに耐える品質承認をしていない
3. **W02-v2-C 海の世界範囲拡張**：原画は1536×1024。現行QA world2160×1800・複数画角の飛行/着水/巻取りを覆わない。**不足領域を新規制作**し、既存絵の拡大、繰り返し波、水色塗りで埋めない
4. **W02-v2-D GameScene実QA**：原画バイナリをGitHubに登録し専用QAフラグでのみ読み込み、390×844 / 844×390 / 932×430でCast→Retrieve→Battle→Result画像を実確認。既存画像・確率・セーブはそのまま
5. **W02-v2-E アート承認**：承認モックと同じ実画面・主役の見え方・縫い目・竿先/カメラをレビュー。**人による明示承認**後のみ `artApproved` を更新

## 作業用コマンド
```bash
python -m pip install Pillow
python scripts/art/split-w02-v2-source.py \
  --source path/to/w02-v2-original-world.png --out artifacts/art-review/w02-harbor-v2
# 画像がまだないCIでも以下の合成ダミーで台帳・画素復元ロジックだけを検査
python scripts/art/split-w02-v2-source.py --synthetic --out artifacts/art-review/w02-harbor-v2-synthetic
```

## 実装制約
- W02 sourceがGitHubへ入るまではW02の高解像度素材を「repo実装済み」としない
- 3枚の素材が復元できても実GameScene／遊びの視認性／広域海が完成したわけではない
- 画質承認までは旧production artとQA v1への復帰を可能にする
- W03素体/装備の制作は並行して進める
