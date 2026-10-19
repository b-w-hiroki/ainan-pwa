# AINAN 現行技術設計書

更新日: 2026-10-19 / 対象: `main` の 1.0.0-rc.3 系。構造・責務・データ契約の変更と同じPRで更新する。

## システム境界

ViteがReactの入口と `fishing-game/` のゲーム画面をビルドし、PWAとして配信する。実際の釣り画面はPhaser 3で動作する。公開パス、複数HTML入口、PWAの設定は `vite.config.ts` に集約する。通常導線とQA専用URLパラメータを混同しない。

```
React / Vite の入口
       ↓
fishing-game/js/main.js ── シーン登録・起動・PWA更新制御
       ↓
scenes/ (Title, Home, Map, Game, Result, Town など)
       ↓
game/ (釣りルール、状態遷移、表示インストーラ)
       ├─ データ・魚種・装備
       ├─ アセットと描画owner
       └─ セーブ／復旧
```

## 釣り場の責務

`fishing-game/js/scenes/GameScene.js` がPhaserシーンとゲーム状態の入口を持ち、`fishing-game/js/game/installFishingRuntime.js` がフェーズ別の振る舞い・表示・QA補助を順に組み込む。実装上の責任分割は [installer ownership](architecture/fishing-installer-ownership.md) に記録する。段階的移行中のラッパーを一度に削るとフェーズ遷移や描画順が変わるため、変更単位ごとにsmokeと実ブラウザで確認する。

Cast → Retrieve → HIT → Battle → Resultが主な状態遷移。入力処理、魚の判定、表示エフェクトを同じ条件のまま保つ。釣りの経済値・確率・疲労を見た目の修正に紛れ込ませない。位置合わせは仮想座標390×844を基準にし、高DPRや表示領域差で入力座標がずれないようにする。横画面の試作は専用ガードの下でのみ有効。

Retrieveの注目魚は `fishInterest.js` の選択結果を `CastViewModel`、ガイド、従来HUDで共有する。別の魚の警戒状態で注目魚の表示を上書きしない。注目魚がなくなった時だけ魚反応ヒントを中立へ戻し、操作直後のヒントを毎tick消さない。初回ガイドの既読フラグは `retrieveTutorialProgress.js` が任意保存する。保存領域の読み書き失敗はゲーム進行を止めず、メモリ上の当該セッションの状態を使う。

演出層はゲーム入力処理の前に成功演出を出さない。`retrieveInputAcceptance.js` がキャスト開始・ちょい巻き・ゆっくり巻きの状態遷移を判定し、音・振動・波紋・竿/ルアー表示は受理後だけ更新する。エサ不足や着水待ちで拒否したキャストは入力ロックを残さない。判定値、エサ消費、釣果保存は従来のゲーム層が担当する。

魚が掛からず手元へ巻き切った際は、`installRetrieveGameplay.js` が回収開始を通知し、`installRetrieveCompletion.js` だけが回収アニメーションとCast復帰を所有する。`_retrieveReturning` 中はRetrieveの更新と操作を停止し、魚の興味タイマーも解除する。別の遅延復帰を重ねない。

HIT前のWaitで手動引き上げまたはミス後に戻る場合は、`GameScene.js` の `_waitReturnPending` が戻り処理の重複と追加入力を防ぐ。Tweenや遅延処理の完了時には現在のphaseと `_waitReturnEpoch` を再確認し、後からBattleや新しいWaitをCastで上書きしない。Cast/Waitへ入り直す際にフラグを解除し世代を進める。

魚がいない案内の生成タイマーはWaitのタイマー集合で管理し、表示済みテキストと消去タイマーはシーンが所有する。Wait終了やシーン終了時に表示・Tween・タイマーを破棄し、遅延コールバックはWait世代を照合する。これにより前の投擲の案内が次のフェーズへ残らない。

## 描画・素材の契約

各画面スロットの最終描画責任は単一ownerにする。[visual-owners.json](pipeline/visual-owners.json)、[asset-states.json](pipeline/asset-states.json)、[asset-migration-inventory.json](pipeline/asset-migration-inventory.json) が所有者、現行/候補状態、移行証跡を扱う。アセットはmanifest・preload・シーン配置をそろえてから本番表示へ昇格する。候補画像を生成しただけでは採用ではない。過去素材は復旧可能に残し、背景・人物・髪・装備・竿・猫の独立レイヤー契約とアルファ品質を確認する。

港の世界・カメラ・キャスト経路の詳細案は [港キャスト技術設計](design/HARBOR_CAST_TECHNICAL_DESIGN.md) を参照。そこにある未導入の構造は現行コードの保証ではない。

## 永続化と更新

`fishing-game/js/game/saveSystem.js` がversion 3の保存形式、読み込み時検証、バックアップ、インポート／エクスポートを担う。セーブのschema、キー、報酬確定タイミングを変える際は既存データからの移行・破損時復旧・再起動後の再現を検証する。PWA更新は `fishing-game/js/main.js` のガードに従い、釣り途中のページ更新を避ける。

## 検証とリリースゲート

`npm run build` はパイプラインsmoke、ゲーム各種smoke、TypeScriptビルド、Viteビルドを含む。GitHub Actionsの `CI` はこれに加えてモバイルE2E、PWA配信確認、実ブラウザ操作を行う。変更したフェーズに応じ、390×844基準のスクリーンショットとタップ・ドラッグの動作を比較する。検証用URLだけの成功を通常導線の完成とみなさない。

デプロイとCIは別ゲート。CI greenは物理iPhoneの合格ではなく、素材候補の承認でもない。進行中のアート置換、横画面、実機確認の残作業は [現行仕様書](PRODUCT_SPEC.md) と各Issueの最新状態を参照する。

## 設計変更時に確認すること

- 新しい表示や入力を足す前に既存ownerと重複しないか。
- フェーズ遷移、保存形式、PWA更新ガード、通常導線に副作用がないか。
- 新素材の候補／採用状態とレビュー証跡が一致するか。
- 自動QAと実ブラウザで同じ結果が再現するか。

この文書を更新する判断とPRでの確認方法は [文書更新ワークフロー](DOCUMENTATION_WORKFLOW.md) に定める。
