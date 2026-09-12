# AINAN GameScene 改修仕様書

## 0. 目的
現行 `GameScene` の `cast → wait → battle → result` を、

`cast → retrieve → bite → battle → result`

へ再設計する。

遠投後、ルアーを少しずつ巻いて魚影へ近づけ、魚の反応を見ながら食わせる工程を主ゲームにする。

この改修では Battle / Result を極力壊さず、主に `wait` 周辺を置き換える。

---

# 1. 現行構造と変更範囲

## 現行 GameScene
主な責務:
- cast input / trajectory
- bobber movement
- wait
- fish approach
- bite timing
- battle
- result
- camera は実質固定
- HUD も同 Scene 座標

## 変更後 GameScene
GameScene は orchestration に寄せる。

新規責務は専用クラスへ分離する。

### 新設候補
- `game/retrieve.js`
- `game/fishInterest.js`
- `scenes/components/RetrieveUI.js`
- `scenes/components/FishingCameraController.js`
- `scenes/components/FishingWorld.js` または `WorldLayout.js`

GameScene は以下を担当する。
- phase transition
- 各 controller の接続
- input routing
- bite / battle / result への handoff

---

# 2. Phase State Machine

```text
CAST
  ↓ landing
RETRIEVE
  ↓ fish interest >= threshold
BITE
  ↓ hook success
BATTLE
  ↓ caught / escaped
RESULT
  ↓ retry
CAST
```

## phase type
```js
type FishingPhase =
  | 'cast'
  | 'retrieve'
  | 'bite'
  | 'battle'
  | 'result'
```

## 禁止
- retrieve 開始直後に自動で魚を lure へ tween しない。
- retrieve 中に `selectFish()` で釣れる魚を確定しない。

魚種確定は「反応した魚影」に紐づける方向へ移す。

---

# 3. World Coordinate System

## viewport
```js
VIEW_W = 390
VIEW_H = 844
```

## world 初期値
```js
WORLD_W = 900
WORLD_H = 1400
```

## player base
初期案:
```js
playerWorld = {
  x: 130,
  y: 1160,
}
```

player は左下寄り。
cast は主に上〜右上方向へ飛ばす。

## water bounds
初期 MVP では矩形でよい。

```js
waterBounds = {
  left: 70,
  right: WORLD_W - 70,
  top: 120,
  bottom: 1020,
}
```

将来的には釣り場別 polygon にできる構造にする。

---

# 4. Camera Architecture

## 方針
viewport を縮小しない。
遠投で lure が viewport 外へ出る場合だけ camera が追従する。

## Camera states
```js
'playerFocus'
'castFollow'
'lureFocus'
'retrieveFollow'
'battleCompose'
'catchFocus'
```

## safe zone
ルアーが画面内の safe zone にいる間はカメラを動かさない。

初期案:
```js
safeZone = {
  left: 95,
  right: 310,
  top: 150,
  bottom: 590,
}
```

## cast follow
trajectory 中の lure が safe zone 外へ出た時だけ camera target を更新。

```js
cameraTarget = lerp(cameraTarget, lureWorldPos, 0.10)
```

完全中央固定は禁止。
少し遅れて追うことでキャスト感を出す。

## retrieve follow
- lure を中心にしすぎない。
- player 方向へ 20〜30% lead を持たせる。
- lure の進行方向側に魚影が見える構図にする。

例:
```js
focusX = lerp(lure.x, player.x, 0.22)
focusY = lerp(lure.y, player.y, 0.15)
```

## battle compose
Battle 開始時は lure focus を終了。
player と target fish の midpoint を基準に composition。

## HUD
HUD は camera scroll の影響を受けない。

最低条件:
- CastUI HUD
- RetrieveUI
- BattleUI
- ResultUI
- location badge
- score/time

を固定 UI layer へ寄せる。

実装方法は `setScrollFactor(0)` を初期案とする。
将来的には UI container / dedicated camera へ移せる。

---

# 5. Cast 改修

## 現行問題
`_fireCast()` で landing point が viewport の海範囲へ clamp されている。

## 改修
`clampLanding()` の引数を viewport bounds から `world.waterBounds` へ変更。

### cast distance
```js
const PX_PER_METER = 18
const distanceMeters = worldDistance(playerAnchor, landing) / PX_PER_METER
```

## 竿別距離
既存 `ROD_STATS.castRange` を使用。

初期ベース:
```js
BASE_CAST_WORLD_PX = 420
```

- basic 1.0 → 約23m
- carbon 1.4 → 約33m
- premium 2.0 → 約46m

## CastUI
preview は world 座標へ描画。
power bar は HUD 固定。

## 着水
着水したら `_enterRetrieve(landingX, landingY)`。

---

# 6. Retrieve State

## GameScene fields
```js
this.retrieveState = {
  lureX: 0,
  lureY: 0,
  distancePx: 0,
  velocity: 0,
  action: 'idle',
  appeal: 0.45,
  startedAt: 0,
}
```

## action type
```js
'idle'       // 待つ
'twitch'     // ちょい巻き
'slowReel'   // ゆっくり巻く
```

## 初期値
landing 後:
```js
action = 'idle'
appeal = 0.35
```

---

# 7. Retrieve Controls

## 待つ
### input
button tap

### effect
```js
velocity = 0
appeal -= passiveDecay
```

### role
- 魚の反応を見る
- stop preference 魚への誘い

---

## ちょい巻き
### input
1 tap

### effect
```js
const TWITCH_DISTANCE_PX = 24
```

lure を player 方向へ 24px 移動。

appeal:
```js
appeal += 0.18
```

player animation:
- short reel motion 1 cycle

### cooldown
250〜350ms 程度。
連打で無限加速しない。

---

## ゆっくり巻く
### input
pointer hold

### effect
```js
SLOW_REEL_SPEED = 42 // px/sec initial
```

appeal は中程度で維持。

```js
appealTarget = 0.55
```

### player animation
short reel loop。

pointer up で idle。

---

# 8. Lure Appeal

## range
```js
0.0 - 1.0
```

## UI
ユーザーには meter として表示。

- low: 弱い
- middle: GOOD
- high: 強すぎ

## 基本ルール
- idle: 徐々に下がる
- twitch: 一気に上がる
- slow reel: 中央へ寄る

## purpose
魚種 preference と組み合わせて Interest へ影響。

---

# 9. Fish Runtime Model

背景魚影を単なる gfx ではなく runtime object として扱う。

```js
{
  id,
  gfx,
  fishDef,
  state: 'cruise',
  interest: 0,
  awareness: 0,
  lastDistance: Infinity,
  targetLure: false,
  cooldownUntil: 0,
}
```

## fish state
```js
cruise
noticed
follow
inspect
biteReady
flee
```

---

# 10. Fish Interest Formula

## update interval
100〜200ms。
毎 frame の heavy calculation は不要。

## factors
```js
interestDelta =
  distanceFactor
  * actionPreference
  * baitFactor
  * environmentFactor
  * townBonus
  - cautionPenalty
```

## distanceFactor 初期案
```js
0〜60px   => 1.0
60〜120px => 0.7
120〜180px=> 0.35
180px超   => 0
```

## actionPreference
魚ごとの `retrieve.prefer` による。

例:
```js
stop + idle       => 1.4
twitch + twitch   => 1.5
slow + slowReel   => 1.4
mismatch          => 0.55
```

## Interest thresholds
初期案:
```js
noticed   = 20
follow    = 45
inspect   = 70
biteReady = fish.retrieve.biteThreshold ?? 85
```

---

# 11. Fish Movement

## cruise
既存 BackgroundManager fish tween を利用。

## noticed
- tween を弱める / stop
- fish が lure 方向へ向きを変える

## follow
魚は lure へ完全直進しない。
少し遅れて追う。

```js
followTarget = lure + offset
```

## inspect
lure 半径 35〜55px を小さく回る / 横切る。

## flee
以下で interest 減少または flee:
- appeal が強すぎる
- lure が急速に近づく
- 同じ twitch を連打
- fish caution が高い

---

# 12. fish.js 追加仕様

各魚へ retrieve profile を追加。

```js
retrieve: {
  prefer: 'mixed',
  idealAppeal: [0.35, 0.65],
  followSpeed: 50,
  caution: 0.25,
  biteThreshold: 82,
}
```

## 初期値案

### アジ
```js
prefer: 'mixed'
idealAppeal: [0.30, 0.65]
caution: 0.15
biteThreshold: 72
```

### マダイ
```js
prefer: 'stop'
idealAppeal: [0.20, 0.50]
caution: 0.35
biteThreshold: 82
```

### ブラックバス
```js
prefer: 'twitch'
idealAppeal: [0.55, 0.85]
caution: 0.30
biteThreshold: 80
```

### ブリ
```js
prefer: 'slow'
idealAppeal: [0.50, 0.78]
caution: 0.25
biteThreshold: 85
```

### クエ
```js
prefer: 'stop'
idealAppeal: [0.20, 0.45]
caution: 0.55
biteThreshold: 92
```

クエは現行どおり pointC + special bait 条件を維持。

---

# 13. Bite 仕様

## Bite entry
fish が biteReady になり、以下を満たしたら bite candidate。

```js
distanceToLure <= BITE_RADIUS
interest >= biteThreshold
```

## Bite transition
`phase = 'bite'`

ここから既存の以下を再利用。

- `buildBiteConfig()`
- `_startBobberBiteSequence()`
- `_startChonSequence()`
- `_startGoon()`
- `_openHitWindow()`

## 差分
bite 対象 fish は `selectFish()` で再抽選せず、追尾してきた runtime fish の `fishDef` を採用。

```js
this.fish = targetFish.fishDef
```

これにより「見えていた魚を釣った」感を成立させる。

---

# 14. Battle Handoff

## hook success
現行 `_enterBattle()` を使用。

## camera
`battleCompose` へ遷移。

## player animation
既存 `installPlayerAnimations()` の fight animation を維持。

## Battle logic
`battle.js` は原則変更しない。

---

# 15. Result Handoff

現行 `_finishBattle()` を基本維持。

caught:
- catch animation
- front pose
- result overlay

escaped:
- camera を playerFocus へ戻す
- retry

---

# 16. RetrieveUI

新規 `RetrieveUI.js`。

## components
- lure appeal meter
- wait button
- twitch button
- slow reel button
- hint bar
- optional lure change button

## visibility
```text
cast      hidden
retrieve  visible
bite      disabled / fade
battle    hidden
result    hidden
```

## buttons
### wait
label: `待つ`
sub: `動かさず様子を見る`

### twitch
label: `ちょい巻き`
sub: `少しだけ引く`

主ボタンとして黄色。

### slow reel
label: `ゆっくり巻く`
sub: `長押しでじわ巻き`

---

# 17. World UI

HUD と違い camera と一緒に動く。

## lure distance badge
lure の上に表示。

```text
飛距離 28.4m
```

retrieve すると数値が減る。

## fish reaction
数値 meter は出さない。

視覚表現:
- noticed: 小さな `!`
- follow: 向きが lure 側へ変わる
- inspect: 波紋 / 小さい sparkle
- biteReady: bobber 周囲の緊張エフェクト

---

# 18. Character Animation Integration

既存 `installPlayerAnimations.js` を拡張する。

## cast
現行維持。

## retrieve
追加 hook:

```js
_onTwitchReel()
_onSlowReelStart()
_onSlowReelStop()
```

fight spritesheet から reel motion を短く流用可能。

## camera distance と display
キャラの world size 自体は極端に変えない。
カメラ移動で相対的に画面端へ収まるようにする。

必要な場合のみ retrieve 遠距離時に 0.90〜0.95 程度の scale 補正。

---

# 19. GameScene Method Plan

## 削除 / 置換対象
### `_enterWait()`
→ `_enterRetrieve()` へ置換。

### `_startFishApproach()`
自動吸着なので廃止。

### `_scheduleNoFishMessage()`
retrieve 用 hint / timeout に置換。

## 再利用
- `_startBobberBiteSequence`
- `_startChonSequence`
- `_startGoon`
- `_openHitWindow`
- `_enterBattle`
- `_finishBattle`
- `_syncBattleUI`
- `_saveProgress`

## 新規 GameScene methods
```js
_enterRetrieve(landX, landY)
_setRetrieveAction(action)
_twitchReel()
_startSlowReel()
_stopSlowReel()
_updateRetrieve(dt)
_updateLure(dt)
_updateFishInterest(dt)
_tryStartBite()
_getLureDistanceMeters()
_resetRetrieve()
```

---

# 20. Input Routing

## cast
existing pointer down/move/up。

## retrieve
world tap ではなく UI button 優先。

- wait button: tap
- twitch: tap
- slow reel: pointerdown start / pointerup stop

海面 tap は MVP では何もしない。
将来的に rod action を追加可能。

## bite
現行 tap hook。

## battle
現行 swipe。

## result
現行。

---

# 21. BackgroundManager 改修

## 現状
魚影定義と tween を内部保持。

## 改修
fish runtime state を返せるようにする。

### API 案
```js
spawnFish(worldW, worldH, pointId)
getFishActors()
pauseFishCruise(actor)
resumeFishCruise(actor)
moveFishToward(actor, x, y, speed)
```

## Background
world サイズを受けて描画可能にする。
画像背景は world 全体へ cover。
将来的には釣り場専用の大型背景へ差し替える。

---

# 22. Files Changed

## 必須
- `fishing-game/js/scenes/GameScene.js`
- `fishing-game/js/game/cast.js`
- `fishing-game/js/game/fish.js`
- `fishing-game/js/scenes/components/BackgroundManager.js`
- `fishing-game/js/game/installPlayerAnimations.js`

## 新規
- `fishing-game/js/game/retrieve.js`
- `fishing-game/js/game/fishInterest.js`
- `fishing-game/js/scenes/components/RetrieveUI.js`
- `fishing-game/js/scenes/components/FishingCameraController.js`

## 原則維持
- `battle.js`
- `ResultUI.js`

---

# 23. MVP Scope

最初の実装では以下まで。

1. world 座標化
2. camera follow
3. retrieve 3操作
4. fish noticed / follow / inspect
5. interest threshold で bite
6. existing battle 接続
7. player animation 同期

## MVP ではやらない
- 水深レイヤー
- lure 種類ごとの潜行深度
- obstacle collision
- 複数魚同時 bite competition
- line length physics
- 風の物理影響

---

# 24. Acceptance Criteria

## 操作
- 30m超へキャスト可能。
- lure が viewport 外へ飛ぶと camera が追従。
- 着水後、魚は自動で食いつかない。
- ちょい巻きで lure が段階的に player 側へ戻る。
- slow reel 長押し中のみ継続して戻る。
- wait で lure が停止。

## 魚
- lure に近い魚だけが反応候補になる。
- 魚の reaction state が視覚的に分かる。
- 操作次第で interest が上がる / 下がる。
- bite した魚種と battle の魚種が一致する。

## camera
- zoom out しない。
- HUD は動かない。
- lure が safe zone 内なら camera は不用意に動かない。
- 手前に巻くと自然に player 側へ戻る。

## flow
- `cast → retrieve → bite → battle → result` が一周できる。
- 既存 Battle / Result に回帰がない。

---

# 25. 実装開始順

### Step 1
Fishing world + camera を先に作る。
まだ魚AIは変えない。

### Step 2
遠投 cast を world 座標化。

### Step 3
RetrieveUI + lure movement。

### Step 4
Fish interest。

### Step 5
Bite 接続。

### Step 6
Character animation / polish。

### Step 7
魚種差・balance。

この順なら、大改修を一度に入れず各段階でプレイ可能状態を保てる。