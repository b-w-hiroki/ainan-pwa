# 短画面：QA試作から通常表示への差分調査

調査基点: main `ab804e6e777dc39579326245716c47949c637018` (PR #312)。2026-11-03。
目的: 既存釣り・経済値・素材・390×844・save v3を維持し、通常URLへ安全に移せる単位を分離する。
成果物: Result入力保護の移行PR、4サイズ×通常/QAの比較、独立browser CI。
自走範囲: branch/実装/検証/PR。main merge・deploy・アート承認・実機合格の代行は含まない。

## 現在の公開版と移行範囲

調査時のmain CI [41432582644](https://github.com/b-w-hiroki/ainan-pwa/actions/runs/41432582644) とPages [41432582937](https://github.com/b-w-hiroki/ainan-pwa/actions/runs/41432582937) は同じmain SHAで成功。ただし配信成功だけで端末のSW更新・公開画面の全動作を保証しない。

通常URLは390×844のFIT。HTMLのcompact属性、main.jsのRESIZE、CastPresentationHostの再配置のすべてが `qa=1&compactPortrait=1` を要求する。一箇所の条件解除では揃わない。`compactPortrait=1` だけでも試作を有効にしない。

公開mainには、表示倍率によるTitle/Map/戻る/施設/釣果カードのタップ領域拡大、フッターとBattle指示の文字拡大が存在する。#312由来の主要短画面リフロー・岸壁・Wait/HITホスト表示は通常URLでは使われない。本PRの入力保護も未マージの間は公開版では使われない。

## 4サイズのレイアウト差

以下はsafe-areaなしのFIT算式とQA幅基準の設計値。実測JSON/PNGは`Compact input migration`のartifactに保存する。セーフエリア54pxの模擬は別の既存compact handoffゲートが担当する。

| CSS viewport | 通常FIT canvas（約） | QA canvas | QA host幅倍率 | 通常Result主操作高さ（約） | QA主操作高さ（約） |
| --- | --- | --- | --- | --- | --- |
| 320×480 | 222×480 | 320×480 | 0.821 | 49px | 71px |
| 320×568 | 262×568 | 320×568 | 0.821 | 58px | 71px |
| 375×667 | 308×667 | 375×667 | 0.962 | 68px | 83px |
| 390×844 | 390×844 | 390×844 | 1 | 86px | 86px |

Result数値はhost上の86設計pxの主操作領域。全操作44pxの保証ではない。通常FITのRetrieve円形領域96設計pxは320×480で約55pxだが、幅拡張・構図・文字の問題は残る。

| フェーズ/対象 | 通常表示 | QA短画面 | 採用判断 |
| --- | --- | --- | --- |
| Cast | 基準構図の全体縮小 | ドックを下端へ移動、人物・環境バッジ移動 | フェーズ通し・回転・実機の前に一括有効化しない |
| Retrieve | 基準背景と経路 | clean水面、別ルアー/糸/魚影、岸壁、進行保持 | 岸壁切出しと構図の独立美術承認が必要 |
| Wait/HIT | native演出・入力owner | Retrieve背景維持、下部合図、ホスト戻る除外 | host表示とGameScene入力の同時移行が必要 |
| Battle | 全体縮小と倍率別文字補正 | 魚/人物/糸/進捗を再配置、極短画面は魚縮小 | 実画像・3魚種・safe-area・回転を維持して検証 |
| Resultレイアウト | 基準構図 | 人物/魚/カード/ボス通知を再配置 | 構図の人による確認と実機が残る |
| Result押下の中断 | #312ではQA時のみ取り消し | resize/blur/pointercancel/hiddenで取消 | 本PRで通常URLへ移行。描画・素材変更なし |
| 回転 | FITのまま余白/縮小 | RESIZE、縦短画面flagを解除し戻す | 往復でphase・scale・保存を比較。横向き正式対応とは扱わない |
| 保存 | 通常の報酬確定とsave v3 | QA bootstrapが保存をseed、mock outcomeは通常と異なる | ordinary URLで釣果確定後の中断/町/reloadを検査する |

## 証拠と判定範囲

- `npm run build`: ローカル成功（既存smoke/TypeScript/Vite/PWA）。
- `verify-result-input-migration.mjs`: 通常URLとcompact QAを4サイズで比較する。通常URLのscene入口と魚の食いつき時点・釣果結果は制御fixture。Cast長押し、Retrieve長押し、HIT、Result/Townは実ブラウザpointer入力。魚抽選を含む自然な全プレイや実機合格とは扱わない。
- `compare-compact-layouts.mjs`: 通常配置も状態生成だけはQA fixture。Cast/Retrieve/Wait/Battle/Resultを別ケースで開始し、縦→横→縦のphase・描画倍率・compact復元・釣果/装備非変更を検査する。これ自体はフェーズ間遷移の証拠ではない。
- Resultで4種の中断を検査。回転前の押下は破棄、新しいタップのみTownへ遷移し、釣果/得点/在庫/装備/町/stockを再付与しない。通常URLでreload後も一致することを検査。Safariの実中断、PWA force-close、export/importは別ゲート。
- independent workflowはChromium/WebKitの別job。成功状態はPR head SHAのChecksで確認する。pending/failedは未合格。ローカルWebKit導入時には不足共有ライブラリを検出したため、CIはUbuntu 24.04と`install --with-deps`を使う。
- 既存の`capture-compact-phase-handoff.mjs`/`verify-compact-live-resize.mjs`を削除・skipしない。既存CIにあるQA構図検証と390×844の回帰を維持する。

## 残る正式反映条件

1. 本PR headのbuild、独立browser jobs、既存モバイルE2E/人物/Result gateがgreen。公開前にレビューとmain統合・main CI・Pages確認を別途実施する。
2. 岸壁切出し、clean水面と人物/魚/糸の位置、湾/岬の地名を含む新構図を人が明示承認。Issue #216/#218/#219と紐付ける。
3. Issue #27で物理iPhone Safari/installed PWAのsafe-area、ブラウザバー変化、回転中の長押し、背景復帰、HIT時の戻る、保存/再起動、10分性能を確認。エミュレータやdesktop WebKitで代替しない。
4. Title→Home→Map→全釣りphase→Townと他画面を通常URLの同じモードで通し確認。390×844の既存画面を維持。横向き#118は独立条件を満たすまでQA専用。

これらの前にcompact全体を自動適用しない。本PRは安全に切り離せる入力保護のみを通常表示へ移す第一段階であり、RC3/素材/保存形式/確率/報酬値は変更しない。
