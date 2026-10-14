# AINAN — 固定残タスク基準（2026-10-15）

このファイルはユーザー合意の**対象範囲と Done 条件の固定基準**。チケットの実装状況・PR番号・SHAは変化するため、着手時には必ず最新 main / PR / CI / Issue を照合する。古い状態やCI成功を根拠に未検証項目を完了扱いしない。

| 優先 | Issue | 固定した目標 | Doneの判定 |
| --- | --- | --- | --- |
| P0 | [#140](https://github.com/b-w-hiroki/ainan-pwa/issues/140) | 港Harborの隠れた水面・桟橋の再構築、人物の透過・竿・手元、可動アニメーション | 遠近と材質が自然なworld-only原画、シルエットとpivot、−18/0/+18px実演出、Cast→Result実ブラウザ、approved mockとの視覚比較・人による明示的承認、CI成功・PRマージ。候補に縦帯・複写・継ぎ目が残れば不合格 |
| P1 | [#118](https://github.com/b-w-hiroki/ainan-pwa/issues/118) | 縦横両持ちの全シーン対応 | 390×844の既存画面を維持しつつ、844×390/932×430でFishingの全フェーズ、Home/Map/Town/図鑑/Menu/Settingsと残るシーンを**本番モードで**ネイティブ配置。44 CSS px、safe-area、回転・背景復帰、スクロール・二重入力なし。QA-only試作の実装は部分完了のみ |
| P1 | [#108](https://github.com/b-w-hiroki/ainan-pwa/issues/108) | 魚種状態、釣果→町、釣り場ごとの体験、美術統一 | 9魚種のJump+FXと保存しない演出、Result→Townの永続的かつ重複なしの反応、Harbor/Bay/CapeのCast/Retrieve/Battleで承認画と整合する差分、魚素材と背景・人物の質感/空間関係の実画像QA |
| P0・リリース最終gate | [#27](https://github.com/b-w-hiroki/ainan-pwa/issues/27) | 物理iPhone Safari/PWAで最終検証しRC3から1.0.0へ | 実機Safe Area/操作/音/PWA install・force-close・再起動、Catch/装備/Town保存、export/restore/import、background復帰、ボス3体、10分以上性能。重大不具合0とRC承認まで版昇格しない |

## 2026-10-15 時点の既知進捗

- [x] PR #190：釣果→町の操作領域・レアリティ入力安全性／マージ済み。
- [x] PR #191、#192：Retrieve地名の二重表示解消・釣り場名称の共有／マージ済み。
- [x] PR #193：横画面Homeの**QA専用**試作／マージ済み。
- [x] PR #195：9魚種Jump FXの素材台帳・参照整合性／マージ済み。
- [x] PR #196：横画面Mapの**QA専用**試作・Home→Map→Fishing実操作／マージ済み。
- [x] PR #197：横画面Townの**QA専用**試作／マージ済み。
- [x] PR #198：横画面図鑑の**QA専用**試作／マージ済み。
- [x] PR #199：横画面Menuの**QA専用**試作／マージ済み。
- [x] PR #200：横画面Settingsの**QA専用**試作。最新mainに統合・PR CI green・実画像確認のうえマージ済み。
- [ ] PR #202：Home/Map/Fishing/Town/図鑑/Menu/Settingsの連続した横画面**QA専用**導線。通常版への昇格ではなく、CI・実画面確認後に判定。
- [ ] #140：背景・桟橋・人物の美術承認。本番不採用となったPR #194の縦帯・複写問題を繰り返さない。
- [ ] #118：本番横画面の全シーン統合・端末回転と安全領域の確認。
- [ ] #108：3地点のCast/Retrieve背景・大型魚の質感統一の美術承認。
- [ ] #27：物理iPhone Safari/installed PWAでの検証。自動化の画面は実機の代用にならない。

「[x]」は**その独立スライスがマージ済み**を意味し、親Issue全体のDoneではない。この部分進捗は将来の作業時に GitHub を見て更新してよい。ただし4 Issueの定義とDone条件は、ユーザーの新たな意図による変更があるまでは変更しない。

## 実行順序・運用

1. 未マージPRのhead SHA・build + mobile E2E・実PNGをチェックし、品質が通れば最新mainと安全に統合する。失敗/スクリーンショット不合格は修正または不採用とする。
2. #140のH02/H03を本質的に再制作し、桟橋縁・板面・海面・足元の幾何と塗りを復元する。材料コピーや inpainting の成功をアート承認とみなさず、明らかな不具合があれば本番に昇格しない。
3. #118では横向きQA試作を無条件に本番有効化せず、全シーンのフェーズ/回転と入力、承認済みartのGateを先にクリアする。
4. #108の魚種表現・釣り場世界観の最終美術比較を行う。画像出所、描画owner、画素の実評価を証跡に残す。
5. #27は**物理iPhone**でチェックリストを完遂し、合格後のみ正式1.0.0とする。

共有ルール: mainを正とし、コンフリクトでのours/theirs一括採用は禁止。小さなPRに分離し、build/smoke、実ブラウザQAとスクリーンショット、CI、レビュー、merge-main CI、Pagesをそれぞれ分けて記録。未検証項目をDoneにしない。将来のタスク着手時の最新版は GitHub Issue / PR / main。
