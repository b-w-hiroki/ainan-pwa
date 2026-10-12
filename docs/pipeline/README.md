# AINAN Production Pipeline v1

真相ガチャで整理した「体験 → 部品 → 状態 → データ → UI → QA → PR」の制作方式をAINAN用に実装する入口。

## P0 アート制作の正本

- [ART_DIRECTION_BIBLE.md](ART_DIRECTION_BIBLE.md) — **現行インゲーム＆承認モックの品質を優先**する画風・構図・レイヤー・審査ルール（新素材生成前に必読）。
- [art-direction-contract.json](art-direction-contract.json) — 既存承認アセット、390×844の比較画面、守るべき仕様の検証可能な台帳。
- [asset-migration-inventory.json](asset-migration-inventory.json) — manifestに登録された185件の素材の現行状態と、保護・再制作候補・要評価の移行台帳。**新素材の実装済み/完成済みとは解釈しない**。
- `scripts/asset-migration-contract-smoke.mjs` — `qa:pipeline`内で185件の参照整合性、保護対象、証跡なしの採用宣言を検査。
- 元となるユーザー要望は [Issue #110](https://github.com/b-w-hiroki/ainan-pwa/issues/110)。素材制作の次ステップは港×アジの master / layers / states / 実プレイまで、別PRで実装。

新制作フローは画風変更の許可ではありません。良質な既存素材を保持し、候補の実スクショ・実操作・CIが同等以上になるまで新素材へ置換しません。

## まず使う

1. 最新main、open PR、CI、Issue #27を確認する（古い引き継ぎは参考情報）。
2. DEVELOPMENT_WORKFLOW.mdの1サイクルを実施する。
3. ASSET_PIPELINE.mdで素材の役割・分割方法・由来を決める。
4. asset-states.jsonとvisual-owners.jsonを更新してから実装する。
5. GOLDEN_SCREEN_RULES.mdに沿って390×844の実画面を確認する。
6. npm run qa:pipeline、npm run build、PRのCI/スクショを確認してからmergeする。

## このディレクトリの役割

- ASSET_PIPELINE.md — 生成・分割・命名・由来・組み込み
- DEVELOPMENT_WORKFLOW.md — @task-briefからDoneまでの標準フロー
- VISUAL_OWNER_REGISTRY.md — 描画ownerと旧wrapperの整理方針
- ASSET_STATE_MATRIX.md — アセットの状態差分と未制作の見える化
- GOLDEN_SCREEN_RULES.md — 正解モックとCIスクショの扱い
- visual-owners.json — 自動検証可能なowner台帳
- asset-states.json — 既存素材の代表的な状態台帳
- golden-screens.json — CIが撮影すべき画面台帳
- scripts/pipeline-contract-smoke.mjs — 参照先実在・台帳構造・CI連携の検査

## 他の既存ドキュメントとの関係

- 実装の現状: fishing-game/js/game/installFishingRuntime.js と fishing-game/js/config/assetManifest.js が正。
- 基本の責務境界: docs/architecture/fishing-installer-ownership.md。
- 漁場の素材仕様と由来: docs/art-spec/README.md、docs/art-spec/GENERATED_ASSET_PROVENANCE.md。
- 正解画の原典: docs/concept-art/canonical/（承認版）。
- 実機リリースゲート: docs/qa/iphone-release-checklist.md と Issue #27。

本ディレクトリは既存仕様を上書きしない。台帳は初期対象（アジ、3漁場、釣り4フェーズ、町）の代表セットであり、すべての実装済みassetを網羅したという意味ではない。

## リリース制約

RCは1.0.0-rc.3を維持し、実機iPhone QAが未承認の間は正式1.0.0を発行しない。外観パイプライン整備を理由にゲームの数値・確率・入力仕様を変更しない。公開画像の見た目と正解モックの差異はCI成功だけで承認済みにしない。
