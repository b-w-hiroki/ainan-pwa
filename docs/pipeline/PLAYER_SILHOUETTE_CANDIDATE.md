# 港Cast人物シルエット｜分離候補・本番未採用

2026-10-12。承認済み `cast-player-visible.png`（180×230）を原本とする、手指定Seed+GrabCutによる候補の成果。**キャラ動作の実装完了ではない**。

## ファイルと再生成

- 元素材：`fishing-game/assets/approved-mock/cast-player-visible.png`。手元や背景が合成されているため、そのまま移動すると矩形アーティファクトが出る。
- 生成用コード：`scripts/art/segment-approved-player.py`。実行時に`opencv-python-headless`と`numpy`が必要。GUI/ネットワーク不要。
- 実体の候補PNG：`fishing-game/assets/generated/harbor-aji-master-v2/cast-player-silhouette-candidate.png`。**manifest未登録・通常preloadなし・本番非表示**。
- 透明度とApproved RGBを`scripts/art/player-silhouette-candidate-smoke.mjs`で検査。
- [実行証跡：専用候補生成CI](https://github.com/b-w-hiroki/ainan-pwa/actions/runs/38207670618)。ソース比較画像をレビューし、帽子・髪・服・脚の主要輪郭が抽出されていることを確認。

## ソース比較の機械判定

| 画素項目 | 実測 |
| --- | ---: |
| Sourceサイズ | 180×230 |
| 人物と推定したalpha>127 | 12,752 px |
| 部分透過のエッジ | 1,020 px |
| 元画像RGBの変更 | 0 px |
| 元素材alphaを超えた描画 | 0 px |

この数値は**見た目の自然さを保証しない**。カットアウト端・釣竿の接続・肩/手の形状は、動作状態ごとのスクリーンショットで判定が必要。

## 背面補完に関する失敗

[試作PR #126](https://github.com/b-w-hiroki/ainan-pwa/pull/126)では人物領域をOpenCV Teleaで補完した2候補（3px/8px膨張）。水の光学模様が曇り、桟橋の構造が失われたため**両候補とも視覚不合格**。これらを表示／本番アセットとして採用しない。

## 次の受入条件

1. 海面/桟橋の**それぞれの材質を保持**して人物の背後を補完。画素の外部コピー/構造線の手修正を使い、色の塗り広げのみを不採用。
2. 元の`CharacterMotionController`の12ポーズ＋ネイティブ釣竿/ラインと重複しない単一ownerを定める。既存アニメーションを黙って消さない。
3. 運動の両端姿勢で背景欠損、アルファ境界、髪/手/釣竿、影を390×844で比較。844×390は別の横レイアウト機能と統合後にQA。
4. Cast→Retrieve→HIT→Battle→Result→Townを実ブラウザで通し、タッチ・魚確率・保存・経済の非回帰を確認。
5. 本番へ切替えるのは人間による画質レビューとCIを通過した後。完了前はapproved compositeを保持。

新素材の生成＝ゲーム組込済み／アニメーション完成ではない。
