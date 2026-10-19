# AINAN Development Workflow

## 目的と制約

目標は「モックに近い1画面」ではなく「操作中も破綻しない1ループ」。最新mainと既存PRの変更を必ず先に確認する。ours/theirsの一括採用は禁止。RC3では安定性優先、バランス/経済/セーブ形式/認証/入力操作を勝手に変更しない。

## 標準1サイクル

1. **Discover** — main HEAD / open PR / Issue / CI / Pagesを確認し、既存実装・重複タスクを特定。
2. **Brief** — 目的、成果物、制約、Done条件、自走範囲、基準モック、画面フェーズを明記。
3. **Ownership** — visual-owners.jsonの最終描画ownerとsupportsを確認。同一slotへ新ownerを追加しない。
4. **Master** — 390×844基準モックに対し、代表素材1組を切り出し独立ファイル化。
5. **States** — asset-states.jsonにasset / procedural / plannedを分類。欠品をごまかさない。
   - 新素材への移行作業時は`asset-migration-inventory.json`の`treatment / candidateStage / sourceMaster / replacementRef / reviewEvidence`も管理する。旧assetがreadyでも新素材はnot-startedのまま。
6. **Integrate** — assetManifest、preload、画面配置、フェーズ遷移、既存ゲームイベントとの接続。
7. **Cleanup** — 旧見た目と入力hit areaを調査し、表示の責任を1か所へ寄せる。wrapper削除は別PRで安全に。
8. **Verify** — npm run qa:pipeline → 関連smoke → npm run build → 390×844実ブラウザ操作QA。
9. **Compare** — GOLDEN_SCREEN_RULES.mdでCast/Retrieve/HIT/Battle/Boss/Result/Townを比較。重なり、見切れ、読みにくさ、無効なCTA、白パネル/旧UIの復活を確認。
10. **Docs** — [文書更新ワークフロー](../DOCUMENTATION_WORKFLOW.md)に従い、[現行仕様書](../PRODUCT_SPEC.md)・[技術設計書](../TECHNICAL_DESIGN.md)の更新要否を判定。必要な変更は同じPRに含める。
11. **PR** — 差分・根拠・実測スクショ・検証コマンド・Docs impact/rationaleを提示。CI green、目視QA後にmerge。
12. **Review** — 必要なら1スライスずつ次の魚/場所へ横展開。次の変更の起点は常に最新main。

## @task-brief の雛形

    目的: アジ×港のCastからResultまでの素材差分・表示品質を整える
    成果物: 独立asset/manifest/asset-state差分/owner変更点/390×844証跡/PR
    制約: RC3維持、ゲーム性・釣果確率変更なし、旧表示owner重複禁止
    Done条件: 画面に欠損・重なり・旧UIなし、機能遷移維持、全smoke/CI green、PR merge
    自走範囲: 設計→実装→QA→安全な修正→PR/merge。実機iPhone判定は代行しない

## 変更規模と停止条件

- 一度に1つの画面owner、または1つの魚/漁場のvertical sliceを完成させる。
- 映像/素材の変更と経済・ゲーム性の変更を同一PRに混ぜない。
- 旧wrapperが多重に同じcreate/updateを包んでいる場所では、大型統合より再現テストを先に。
- QAで重大な操作不能・セーブ破損・画面重複を発見したらrelease holdとして記録。
- CIの単なるsuccessは実機OKを意味しない。Issue #27はiPhone実機でのみclose判断。

## PRテンプレ本文

    Summary:
    - 体験の狙い、追加/更新した分割asset、ownerの変更
    Validation:
    - npm run qa:pipeline
    - npm run build
    - 390×844固定スクショ + 実操作手順/動画（必要時）
    Visual review:
    - 正解モックとの相違、未解決の例外
    Release:
    - RC version維持、Issue #27の未完了項目を明記
    Docs impact: product|design|both|none
    Docs rationale: 変更と文書への影響／非影響の具体的な理由
