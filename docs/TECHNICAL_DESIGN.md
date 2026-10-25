# AINAN 現行技術設計書

更新日: 2026-10-20 / 対象: `main` の 1.0.0-rc.3 系。構造・責務・データ契約の変更と同じPRで更新する。

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

横画面QAのTownは `townLandscapePrototype.js` が通常Townの `create` を置き換えるため、Resultから渡された `catchArrival` を同じTownの釣果カードownerへ明示的に引き渡す。`installTownCatchArrival.js` は縦横のカード座標を一元化し、横画面の魚・反応文・2操作を同一カード内に配置する。釣果の保存・報酬確定は既存のResult側のままで、QA用Town表示は追加の書き込みをしない。
同じレイアウト関数は縦画面でCanvasの実表示倍率を受け取り、縮小時だけ釣果カードと2操作の高さを拡張する。仮想390×844を維持しつつ、表示上のタップ領域を確保する。
Townの施設発展ダイアログは同じ表示倍率を使ってカードと2操作の間隔を広げる。Town内のボタン描画・ヒット領域は同じ高さを使い、縮小後にタップ領域だけが見た目からずれる状態を避ける。
タイトルとマップは `ui/touchLayout.js` でCanvasのCSS表示倍率を読み、短い縦画面だけ主要ボタンの描画・ヒット領域を同じ比率で拡張する。マップのヘッダーは戻るボタンとの距離を確保し、釣り場詳細カードは準備情報と魚アイコンを別段に配置する。詳細カードは表示倍率が0.75未満なら説明を要約し、準備・状態・操作ラベルを短くして文字を拡大する。QA専用の幅拡張時は `MapScene` が実Canvas幅320・375に合わせて詳細カードを縦に広げ、情報・魚アイコン・釣りボタンの段差と入力領域を再計算する。通常表示は維持する。390×844と320×568で実タップ・画面比較を行う。
タイトルの補助コピーは表示倍率が0.75未満ならカード内の収まりを保ちながら文字を拡大する。`capture-compact-entry-map.mjs` は実表示の文字サイズとカード幅を検査する。この措置は短い端末向けの可読性改善であり、釣りフェーズの仮想寸法の再構成は別途行う。
Battleの進捗・予兆・操作指示はCanvasの表示倍率が0.9未満の縦画面で文字を拡大し、0.75付近で急に小さくならないようにする。0.75未満では魚名とテンションゲージの間に挟まる装飾的な `BATTLE` 表記を隠し、重なりを防ぐ。通常の390×844では従来の表示を維持し、320×568・375×667では指示文のカード幅と実表示の最小文字サイズをブラウザQAで確認する。釣り場の構図と画面全体のリフローは引き続き別の作業単位とする。
`?qa=1&compactPortrait=1` は短い縦画面でのリフローを検証する試作。Phaserの実画面寸法を使い、Cast・Retrieve・Battle・Resultを幅基準で表示する。CastとRetrieveのドック、Battleの下部操作、Resultのカードと2操作を短い画面の下端に合わせて配置し、入力座標も同じオフセットで変換する。CastとRetrieveでは環境表示バッジをホスト前面の水面側へ移し、フェーズを離れたら従来の位置と深度へ戻す。Battleでは魚・水しぶき・釣り糸の表示を一緒に上へ移し、人物の頭と竿の上を魚が覆わないようにする。暴れる予兆はヘッダーと魚の間へ置く。背景や装飾の下部は切り取り、HUDと主要操作を画面内に残す。独立した人物レイヤーは各フェーズで下部パネルの上へ移す。通常導線は従来の全体縮小配置を維持する。`capture-compact-entry-handoff.mjs` は320×568・375×667・390×844・430×932でTitle→Home→Map→Castの実タップと、短画面Map詳細の非重なりを検査し、320×568の上下セーフエリアも初期読み込みから模擬する。`capture-compact-cast-prototype.mjs` と `capture-compact-fishing-loop.mjs` が320×568・375×667の幅、操作位置、入力、および390×844・430×932基準画面を検査する。`capture-compact-phase-handoff.mjs` は320×568でCast入力、Retrieveの2操作、制御した食いつき、実際のHITタップ、Battleの巻き操作、制御したResult、Townへの戻りを検査する。魚の抽選を含む通常導線での連続プレイや物理iPhoneの合格は代替しない。
縦画面Canvasの中央寄せは `#game-container` のflex配置を唯一の担当にする。Phaserが付与するinline marginはルートと釣り画面の両HTMLで打ち消し、PWAのnavigation fallback経由でも左右の見え方と座標変換を対称に保つ。`capture-compact-entry-map.mjs` は両入口のCanvas実表示余白を検査する。
共通フッターも同じ表示倍率を読み、0.9未満なら5タブのラベルを拡大する。ラベルとアイコンの配置は固定し、`capture-compact-entry-map.mjs` で実表示の文字サイズと既存タップ領域を検証する。

Retrieveの注目魚は `fishInterest.js` の選択結果を `CastViewModel`、ガイド、従来HUDで共有する。別の魚の警戒状態で注目魚の表示を上書きしない。注目魚がなくなった時だけ魚反応ヒントを中立へ戻し、操作直後のヒントを毎tick消さない。初回ガイドの既読フラグは `retrieveTutorialProgress.js` が任意保存する。保存領域の読み書き失敗はゲーム進行を止めず、メモリ上の当該セッションの状態を使う。

演出層はゲーム入力処理の前に成功演出を出さない。`retrieveInputAcceptance.js` がキャスト開始・ちょい巻き・ゆっくり巻きの状態遷移を判定し、音・振動・波紋・竿/ルアー表示は受理後だけ更新する。エサ不足や着水待ちで拒否したキャストは入力ロックを残さない。判定値、エサ消費、釣果保存は従来のゲーム層が担当する。

魚が掛からず手元へ巻き切った際は、`installRetrieveGameplay.js` が回収開始を通知し、`installRetrieveCompletion.js` だけが回収アニメーションとCast復帰を所有する。`_retrieveReturning` 中はRetrieveの更新と操作を停止し、魚の興味タイマーも解除する。別の遅延復帰を重ねない。

HIT前のWaitで手動引き上げまたはミス後に戻る場合は、`GameScene.js` の `_waitReturnPending` が戻り処理の重複と追加入力を防ぐ。Tweenや遅延処理の完了時には現在のphaseと `_waitReturnEpoch` を再確認し、後からBattleや新しいWaitをCastで上書きしない。Cast/Waitへ入り直す際にフラグを解除し世代を進める。

魚がいない案内の生成タイマーはWaitのタイマー集合で管理し、表示済みテキストと消去タイマーはシーンが所有する。Wait終了やシーン終了時に表示・Tween・タイマーを破棄し、遅延コールバックはWait世代を照合する。これにより前の投擲の案内が次のフェーズへ残らない。

## 描画・素材の契約

W03の候補素材は `fishing-game/qa/w03-art-review.html` でA/Bの同一13ポーズ、Bの独立髪、猫・帽子・バッグと3種の竿原画を透過背景と海色で比較できる。Viteの独立HTML入口としてビルドするレビュー専用画面であり、画像の重ね位置・実プレイ・美術承認を代替しない。`qa=1&qaRodArt=1` かつcute人物を選んだGameSceneでは、3種の竿候補を既存の手元・竿先ソケットに回転・等比率で仮接続し、native竿Graphicを隠して二重描画を防ぐ。糸は既存ownerのまま。候補画像が欠けた装備だけnative竿へ戻し、他の候補は表示を続ける。竿を持たないポーズでは手元・竿先・糸の目標座標を消す。全ポーズ・全画角の目視承認は未完了であり、通常URLの竿ownerと素材選択は変更しない。

各画面スロットの最終描画責任は単一ownerにする。[visual-owners.json](pipeline/visual-owners.json)、[asset-states.json](pipeline/asset-states.json)、[asset-migration-inventory.json](pipeline/asset-migration-inventory.json) が所有者、現行/候補状態、移行証跡を扱う。アセットはmanifest・preload・シーン配置をそろえてから本番表示へ昇格する。候補画像を生成しただけでは採用ではない。過去素材は復旧可能に残し、背景・人物・髪・装備・竿・猫の独立レイヤー契約とアルファ品質を確認する。

WindowsのChromiumではSVGをPhaserの通常画像ローダーからWebGLへ直接アップロードすると黒い矩形になる場合がある。各シーン、UIアート、釣り場表示のmanifest素材は `utils/loadGameTexture.js` を通し、SVGをCanvasへラスタライズしてからテクスチャに登録する。PNGは同じ関数から通常の画像ローダーへ渡す。マップの地点ピンと町の施設・背景を含め、読み込み経路を統一する。

W03のかわいい男女キャラクターの待機・振りかぶりフレームは、1254pxの透過原画を既存の倍率・足位置・手元ソケットで640×840へ配置する。RGBA画像を自身のアルファでマスク付き貼り付けすると境界アルファが二重適用されるため、単一のRGBA貼り付けを使う。生成元のほぼ透明な点のみ除き、低アルファの彩度ノイズを補正する。原画とソケットは変更しない。再生成と検査は `python scripts/art/repair-cute-frame-alpha.py` と同 `--check`、従来のRGB境界補正は `python scripts/art/clean-transparent-edge-rgb.py --check` で確認する。これらは採用可否の承認や実機評価の代替ではない。

W03の猫候補は原画と境界補正版を別々に保持し、`python scripts/art/prepare-w03-cat.py --check` でRGBA・輪郭・透明余白を検証する。`qaHarborPlayable=1&cameraPan=1&coneLoop=1&qaParts=1&qaCat=1&qaCatArt=1` のQA条件だけで独立GameObjectとして読み込み、既存の猫シルエットと比較できる。通常導線の描画・装備保存は変えず、アート承認前は候補のままとする。

通常URLで人物が握る竿は `CharacterMotionController` の単一Graphics ownerで描き、装備IDに応じた差し色を使う。根元から先端へ径を細くした曲線、ガイド、リールを同じ曲線上に置く。糸の起点となる先端座標と各ポーズの手元ソケットは変えない。従来の透過ビットマップ竿で発生した黒矩形を避けるため、正式表示はnative geometryを継続する。上記QA条件の候補画像だけ、同時表示しない単一spriteへ切り替える。

帽子・バッグの既存透過原画は `python scripts/art/prepare-w03-accessories.py --check` で境界だけ補正したQA用コピーと照合する。上記の港QA条件に `qaAccessoryArt=1` を加えた場合だけ、共通のポーズ別ソケット上で仮図形を実画像へ差し替える。描画サイズは人物の実表示幅に比例し、帽子・バッグそれぞれが独立GameObjectのまま追従する。正式装備表示やセーブには接続せず、人物との重なり・全13ポーズ・画風の承認は別途行う。
港QAの「背景美術は未承認」表示は右上の海側に置き、縦横や画面回転で位置を再計算する。人物・装備の画質比較を文字が遮らないようにするためのQA表示変更で、釣り入力には関与しない。

UIアートv1/v2の実使用PNG 23点は、`python scripts/art/clean-ui-subspecks.py --check` でGit原本と照合する。輪郭（alpha 8以上）とRGBを全画素で保持し、実体のalpha 32以上から5pxを超えて離れたalpha 1〜7の点だけ透明にする。画像の大きさ・配置・操作領域・source kit原画は変えず、元バイナリと変更画素数を `docs/art-source/ui-edge-clean-v1/manifest.json` に記録する。これで遠くに散った低透明度ノイズを除去するが、元画像の画風や未承認背景を承認したことにはならない。

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
