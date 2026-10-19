# AINAN｜AI開発再開・GitHub運用入口

**このファイルは固定URLの入口。仕様・Done/議論の全文はここへ複製しない。**
最終編集: 2026-10-19。今の進捗やmain SHAをこの文書の内容から決めない。

## リンクと正本
| 目的 | 正本 |
| --- | --- |
| 現行ゲームのコード | [ainan-pwa main](https://github.com/b-w-hiroki/ainan-pwa/tree/main) |
| リポジトリ内のAI固有制約 | [AGENTS.md](../AGENTS.md) |
| 現行の全体仕様・設計 | [仕様書](PRODUCT_SPEC.md) / [技術設計書](TECHNICAL_DESIGN.md) |
| 変更PRごとの文書更新 | [文書更新ワークフロー](DOCUMENTATION_WORKFLOW.md) |
| 進行中の素材全面再構築・決定・状態 | [親Issue #216](https://github.com/b-w-hiroki/ainan-pwa/issues/216) |
| 素材再構築の子作業 | [W01 #217](https://github.com/b-w-hiroki/ainan-pwa/issues/217) → [W02 #218](https://github.com/b-w-hiroki/ainan-pwa/issues/218) / [W03 #219](https://github.com/b-w-hiroki/ainan-pwa/issues/219) → [W04 #220](https://github.com/b-w-hiroki/ainan-pwa/issues/220) → [W05 #221](https://github.com/b-w-hiroki/ainan-pwa/issues/221) |
| 魚種/町・釣り場の既存仕事 | [Issue #108](https://github.com/b-w-hiroki/ainan-pwa/issues/108) |
| 物理iPhoneの最終リリースゲート | [Issue #27](https://github.com/b-w-hiroki/ainan-pwa/issues/27) |
| AINAN内の既存港・カメラ設計 | [仕様書](design/HARBOR_CAST_PRODUCT_SPEC.md) / [技術設計](design/HARBOR_CAST_TECHNICAL_DESIGN.md) |
| AI制作・引き継ぎ・共通品質ルール | [Studio Playbook](https://github.com/b-w-hiroki/studio-playbook/blob/main/README.md) / [Chat Resume](https://github.com/b-w-hiroki/studio-playbook/blob/main/docs/CHAT-RESUME.md) / [Asset Work Units](https://github.com/b-w-hiroki/studio-playbook/blob/main/docs/ASSET-WORK-UNITS.md) |

## 新チャットでの再開手順
1. `AGENTS.md`・この入口・現行仕様書/設計書・Playbook（接続できる場合）を確認
2. **最新**mainとopen PR/CIを確認。過去のチャットや記録されたSHAより現況を優先
3. [#216](https://github.com/b-w-hiroki/ainan-pwa/issues/216)から作業候補を決定し、子Issueの最新本文/コメント/リンク済みPRを確認する。優先はP0→P1、重複PRを作らない
4. 子Issueに入力・依存・成果物・Done・停止条件を記録。検証に失敗したら `blocked` または `rejected` と証拠を残す
5. 調査→差分実装→smoke/build→**実ブラウザ**とスクショレビュー→PR→CI→安全にマージ→main/公開確認。画質の人間承認、物理iPhone、セーブやデータ移行は別ゲート
6. 親Issueのチェックボックスを更新するのは、子IssueのDoneと必要な独立ゲートを達成した場合だけ

## 誰がどこへ何を書くか
- **Issue：** 検討・優先順・Done・判断待ち・失敗の理由・結果のリンク。原則として長文の進捗/タスク情報をここへ集約
- **GitHub Projects：** 可能ならIssueカードのStatus / Priority / Work unit / Blocked byを可視化。**連携機能がProjectsへ書けない場合は操作成功を偽らず、Issueの親チェックリストを唯一の進捗正本にする**
- **docs / コード：** 仕様/ADR/アセット契約/実装。Issueへ長大なソースや何度も同じ仕様全文を貼らず、**固定パスへリンク**
- **PR：** 差分、テスト実測（初回失敗も含む）、実画像artifact、未確認と安全な切替。1 PRは独立検証可能な一単位
- **チャット：** 作業完了/作業中/ブロック、必要な判断、PR・Issueの**リンク中心で短報**。通常は本文の再掲をしない。ユーザーが「詳しく」と希望する場合だけ展開

## 1作業の状態（子Issue冒頭）
`not_started → in_progress → review → accepted`。問題があれば `blocked` / `rejected`、原因と再実施条件を明記。
`accepted`は作業単位の証拠が揃った状態。**素材生成、PRマージ、本番採用、公開、実機検証を相互に代用しない。**

## AINAN固有の停止条件
- 「旧グラフィックを一旦破棄」は**新規デザイン基準から外す**意図。既存productionのファイル・セーブ・画面を直ちに削除する許可ではない。復帰可能なまま新候補をレビューし、段階的切替
- 猫・服装・性別・竿は独立レイヤー。左下→右上のキャストラインと巻取りに障害物を置かない。プレイヤー固定カメラではなくルアー追従
- `qa=1`やQA独立画面の成功は通常モードの完成ではない。390×844/横画面/物理iPhone #27までチェックし正式版へ昇格

## 運用上の注意
共通Playbookに既存の重複しないルールがあればそれを参照し、この文書へコピペで再定義しない。GitHub操作ができないときは作業を推測で完了扱いせず、Issue/PRへの反映未済と報告する。
