# 844×390 Cast→Retrieve→HIT→Battle→Result 実ブラウザQA

本書は Issue #118 向けの**試験用プロトタイプ**の検証契約。横持ちデザインの最終承認やiPhone実機QAとは区別する。

## 実行条件

- `cameraPan=1&coneLoop=1&castMotion=charged` で現行PWAを起動。
- Playwright Chromiumの実マウスドラッグでプレイヤーの竿からCastし、エサが**1個だけ**減ること、bobberの着水、Retrieve状態を確認する。
- 魚の自然抽選は固定しない。ゲーム本来の`_twitchRetrieve`と`_startSlowRetrieve`をQA画面上で呼び、**有効な判断が2回以上記録されたこと**を確認してから魚の`biteReady`をQA用に作る。
- 魚の320msの予兆・ためは実装された制約を維持し、実時間経過後に本来の`_beginRetrieveBite`を通す。
- WebGLの画像保存に時間がかかって実HITを取り逃がさないよう、**QAページ上だけ**タップ猶予を最短5秒へ拡大する。ブラウザの実マウスクリックを要求し、Playwrightの`force`やJSクリックは使用しない。
- `cameraPan=1`は意図的に`castPresentationMode=legacy`。そのためBattleはLegacyの`battleHero`/escapeBar、Resultは`resultOverlay`/`GET!`を検証する。`cast-presentation-host`というホストの存在を捏造しない。
- 成功後、`_finishBattle('caught')`で長い戦闘結果だけ合成する**QA-only勝利フィクスチャ**を使う。釣果が一件だけ増え、Resultの実画素とエサ消費を検証する。

## 限界とDone

このテストが成功しても、ランダム魚との自然ヒット、手操作による連続した魚の駆け引き、完全な魚AI、実iPhoneのGPUや人間の楽しさを証明しない。検証済みの範囲だけをCI/PRへ記録する。従来のChromium E2E画像ガード・同一端末portrait・保存互換・本番アートmanifestには変更を加えない。

`npm exec --yes --package=playwright@1.55.0 -- node scripts/capture-landscape-phase-handoff.mjs`

[専用GitHub Actions](../.github/workflows/landscape-phase-handoff.yml)に5段階の画像と低機密JSONを出力する。CI失敗時はログを追い、ゲームの判断回数や描画所有権を隠してパスさせない。
