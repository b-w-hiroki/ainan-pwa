# AINAN インゲーム再設計 — 実装タスク分解

## 目的
釣りの基本ループを `cast → wait → battle → result` から、以下へ進化させる。

`cast → retrieve → bite → battle → result`

遠投したルアーをカメラが追従し、着水後は「待つ / ちょい巻き / ゆっくり巻く」で魚影へルアーを近づけ、魚の反応を見ながら食わせることを主ゲームにする。

## 絶対に残すもの
- 現行の Battle ロジック / テンション管理
- `ちょん → ぐんっ！ → HIT` のバイト演出
- 釣果・スコア・リザルト
- 既存の竿 / エサ / Town ボーナス
- player_cast / player_fight / player_catch のキャラアニメ

## 現行実装の制約
- GameScene の phase は `cast / wait / battle / result`。
- `wait` に入ると約400ms後に近くの魚影を探し、自動的に浮きへ接近させる。
- キャスト着水点は viewport 内へ clamp されるため、現状は画面外への本当の遠投ができない。
- 背景・魚影・ボバー・キャラ・HUD が同じ Scene 座標に存在する。

---

# 実装順序

## T0. ベースライン固定
### 内容
- 現在の GameScene / bite / battle / fish / cast の挙動を基準化。
- 現行の player animation hook を維持。
- バトル開始以降は原則変更しない方針を固定。

### 完了条件
- 既存の `cast → wait → battle → result` が基準状態として再現可能。
- 新実装を feature flag で切り替えられる状態が理想。

---

## T1. フェーズ再設計
### 変更
GameScene phase を以下へ整理する。

- `cast`
- `retrieve`
- `bite`
- `battle`
- `result`

`interest` は Scene phase にせず、retrieve 中の魚ごとの状態として持つ。

### 魚の状態
- `cruise` 通常遊泳
- `noticed` ルアーを認識
- `follow` 追尾
- `inspect` ルアー直近で様子見
- `biteReady` 食いつき可能

### 完了条件
- 着水後に自動で bite へ行かず `retrieve` に留まる。
- Battle / Result は既存処理へ接続できる。

---

## T2. 画面より広い Fishing World を導入
### 目的
遠投時に画面を縮小せず、ルアーが viewport 外へ飛んだらカメラが追う。

### 方針
- viewport は 390×844 のまま。
- world は viewport より大きい座標系を持つ。
- HUD はカメラに追従させず固定。
- 海 / 魚影 / キャラ / ボバー / ラインは world オブジェクト。

### 推奨初期値
- `WORLD_W = 900`
- `WORLD_H = 1400`
- player は world 左下寄り。
- 遠投方向は基本的に右上〜上方向。

### 実装候補
- WorldCameraController を新設。
- HUD は dedicated container へ集約して `setScrollFactor(0)`。

### 完了条件
- ルアーが viewport 外へ移動できる。
- camera scroll しても HUD は固定。
- player と lure の world 座標が一貫する。

---

## T3. 遠投キャストを world 座標化
### 変更
- `clampLanding()` の viewport clamp を廃止。
- world の water bounds に clamp。
- cast distance を meter 表示へ変換。

### 基準案
- `PX_PER_METER = 18`
- basic: 約20〜24m
- carbon: 約28〜34m
- premium: 約40〜46m

既存 `ROD_STATS.castRange` を活用する。

### カメラ
- ルアーが safe zone を越えた時だけ camera follow。
- cast 中は lure を先行して追う。
- 着水後は 150〜250ms で落ち着く。

### 完了条件
- 30m超の遠投が viewport 拡大/縮小なしで表現できる。
- 飛距離 UI が lure 付近に表示される。

---

## T4. Retrieve 操作を追加
### 新操作
#### 待つ
- lure movement = 0
- appeal は徐々に低下
- stop 好みの魚にボーナス

#### ちょい巻き
- 1tap = 一定距離だけ player 側へ移動
- player reel animation を短く再生
- appeal が一時上昇
- 魚の反応を見る主操作

#### ゆっくり巻く
- pointer hold 中、一定速度で player 側へ移動
- reel animation loop
- appeal は中程度で維持

### UI
- 下部3ボタン
- lure appeal meter
- lure 上に距離表示
- hint text

### 完了条件
- player が何もしなければ lure は止まる。
- ちょい巻きで段階的に距離が縮む。
- 長押しで連続して距離が縮む。

---

## T5. 魚の Interest モデル
### 新規 fish runtime state
```js
{
  gfx,
  fishId,
  state: 'cruise',
  interest: 0,
  lastDistance: Infinity,
  targetX,
  targetY,
}
```

### Interest に影響する要素
- lure との距離
- lure velocity
- stop / twitch / slow retrieve
- baitType
- fish species preference
- weather / time bonus
- Town attract bonus

### 重要方針
Interest 数値は原則ユーザーへ直接表示しない。
魚影の向き・速度・距離・小さなリアクションで伝える。

### 完了条件
- 魚が即 lure へ吸い寄せられない。
- ルアー操作で `cruise → noticed → follow → inspect` が視覚的に分かる。

---

## T6. 魚種ごとの Retrieve Preference
### fish.js へ追加候補
```js
retrieve: {
  prefer: 'slow' | 'twitch' | 'stop' | 'mixed',
  idealSpeed: [min, max],
  caution: 0.0-1.0,
  biteThreshold: 0-100,
}
```

### 初期案
- アジ: mixed / slow
- マダイ: stop 寄り
- ブラックバス: twitch
- ブリ: slow〜fast 寄り
- クエ: stop + special bait + pointC

### 完了条件
同じ操作だけでは全魚に最適にならない。

---

## T7. Bite への接続
### 条件
- fish state が `inspect` または `biteReady`
- lure distance が bite radius 以下
- interest >= fish.biteThreshold
- 操作パターンが魚の好みに一致

### 接続
条件達成後、現行の
`_startBobberBiteSequence → ちょん → ぐんっ！ → _openHitWindow`
を再利用。

### 完了条件
- retrieve で食わせた後のみ現行 bite 演出が開始する。
- 現行 hit timing の難易度は維持される。

---

## T8. Camera Controller
### 状態
- `playerFocus`
- `castFollow`
- `lureFocus`
- `retrieveFollow`
- `battleCompose`
- `catchFocus`

### 重要ルール
- 常に lure を中央固定しない。
- safe zone 内ならカメラを動かさない。
- 動かす場合も lerp で追従。
- Retrieve 中は魚影が進行方向側に見えるよう lead を持たせる。

### 完了条件
- カメラ酔いしない。
- 遠投感がある。
- 近距離に戻ると player が自然に画面へ戻る。

---

## T9. キャラアニメ統合
### 既存素材利用
- cast: 振りかぶり〜投げ
- retrieve: fight/reel 素材から短い巻きモーションを流用
- bite: alert frame
- battle: fight loop
- catch: catch success → front pose

### 表示サイズ
- cast: 大きめ
- retrieve 遠距離: 下端にコンパクト
- battle: 少し強調
- catch: 大きく戻す

### 完了条件
操作入力とキャラ動作が同期する。

---

## T10. HUD 再構成
### プレイ中に残す情報
- 釣り場名
- distance
- lure appeal
- retrieve 3操作
- bite / battle 必須情報

### プレイ中に下げる情報
- coin / gem
- 大きい mission card
- 図鑑常設
- Town 系導線

### 完了条件
海面と魚影が画面の主役になる。

---

## T11. Battle handoff
### 方針
Battle ロジックは原則温存。
retrieve/bite から `_enterBattle()` へ接続するだけにする。

### Camera
Battle 開始時に player と魚を両方含む composition へ戻す。

### 完了条件
既存 Battle の難易度・結果処理に回帰がない。

---

## T12. チューニング / QA
### テストケース
1. short cast → アジ
2. long cast → 遠距離魚群
3. stop 好み魚
4. twitch 好み魚
5. lure を巻き切る
6. 魚が興味を失う
7. bite miss
8. battle catch
9. battle escaped
10. premium rod 最大遠投
11. pointC + special → クエ
12. camera follow 中の HUD 固定

### 成功指標
- 初見で「巻いて魚へ近づける」が理解できる。
- 1回の cast で 2〜5 回程度の意思決定が発生する。
- 待つだけで自動ヒットしない。
- 通常魚は長すぎず、レア魚は狙った感がある。

---

# 推奨PR単位
1. `refactor: add fishing world and camera controller`
2. `feat: add retrieve phase and lure controls`
3. `feat: add fish interest and pursuit behavior`
4. `feat: connect retrieve behavior to bite sequence`
5. `style: integrate player animations and retrieve HUD`
6. `tune: balance retrieve preferences and camera feel`

## 最重要順
T1 → T2 → T3 → T4 → T5 → T7 → T8 → T9 → T10 → T12

T6 は最初は簡易値で開始し、操作感が成立してから魚種差を詰める。