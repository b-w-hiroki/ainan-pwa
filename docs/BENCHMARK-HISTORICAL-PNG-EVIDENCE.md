# AINAN｜実CIから保全した空白PNGと現在のResult描画の対比

## 根拠の出所

- [失敗Run #38193500479](https://github.com/b-w-hiroki/ainan-pwa/actions/runs/38193500479)：当時の `39-player-result.png` は390×844・2,742バイト・RGB (255,245,190) の完全単色PNG。元Actions artifact ID `11722681801`、SHA256 `dd005f3af16034c98b7179aca03ec4b7e414c0ba3577fd29e44e1134d8c19e9f`。
- [失敗Run #38360053785](https://github.com/b-w-hiroki/ainan-pwa/actions/runs/38360053785)：当時の `03-battle.png` は390×844・2,744バイト・RGB (7,55,84) の完全単色PNG。元Actions artifact ID `11794896899`、SHA256 `4cee34e316eac955852393f7eade03462b00de464d2c45528ccad2feb663dcfb`。
- これらの実PNGを損失なしのgzip+base64にして[fixture](../scripts/fixtures/ainan-historical-blank-pngs.json)へ保全。*後から画像を描き直した模擬不具合ではない*。ハッシュとファイルサイズ、PNG復号後全画素の同色性をCIが再検証する。

## 現行実画面との対比

[benchmark Result positive-control](../.github/workflows/benchmark-result-positive-control.yml)は、最新ブランチのゲームをビルドして既存[Resultキャプチャ](../scripts/capture-named-results.mjs)を実行する。39-player-resultで15,000バイト超、金色GET文字の描画ピクセル450超、実PNG復号の非単色を要求。旧失敗PNGと異なることを検証し、成果を`artifacts/benchmark/ainan-historical-png-forensics.json`へ保存する。

- **確認済みの事実**：過去の実CIアーティファクトが空白だったことと、現在のコードで非空白Result描画を取得できること。テスト・guardは旧失敗を検知できる。
- **確認できていないこと**：旧コードを現在のChromiumで再実行した際の空白フレーム再現、原因がGPU/コンポジターなのか他のタイミングなのか、長時間・iPhone実機・WebKitでの不具合再発率。
- **A/Bの扱い**：これは`historical_artifact_forensics`であり、`actual_replay_baseline_prepared=false`、`execution_records=[]`を維持する。保存した昔の画像と現在の画像の比較を、独立AIモデルの1回の試行とは数えない。

既存のResult全7枚の正例画素検査・production build・全体のスクショguardは削除・skipしていない。画像fixtureとレポートに本番ユーザーの保存データ・秘密鍵を含まない。
