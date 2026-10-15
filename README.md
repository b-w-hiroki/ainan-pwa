# AINAN 釣り×街おこし

「釣り → 町おこし → 成長 → ボス」を軸にしたブラウザゲーム/PWAです。

## Release Candidate

- Version: `1.0.0-rc.3`（`package.json` に準拠。正式 `1.0.0` への昇格前）
- 基準画面: 390×844
- 自動QA: build / smoke / mobile E2E / visual screenshot guard / PWA readiness
- 最終リリース条件: `docs/qa/iphone-release-checklist.md` の物理iPhone QA完了、および [固定残タスク基準](docs/pipeline/REMAINING_BACKLOG_BASELINE_20261015.md) の各Done条件達成
- 横画面: QA専用試作段階。本番利用可能・全端末対応とみなさない
- 港の背景・人物分離: アート承認前の候補は本番に採用しない
- 実機QA管理: GitHub Issue #27

## 起動

```bash
npm install
npm run dev
```

ブラウザで http://localhost:5173 を開く。

## ビルド・プレビュー

```bash
npm run build
npm run preview
```

## スライス

- **Slice1**: この土台（Vite + React + PWA 基盤）。常に `npm run dev` で起動可能。

## GitHub Pages で公開（サクッと動かす）

1. GitHub にリポジトリを作り、このプロジェクトを **push**（`main` または `master`）。
2. リポジトリの **Settings → Pages** で、**Build and deployment** の **Source** を **GitHub Actions** にする。
3. `main` / `master` へ push すると `.github/workflows/deploy-github-pages.yml` が走り、`dist` が公開される。
4. 数分後、**`https://<ユーザー名>.github.io/<リポジトリ名>/`** で開ける（リポジトリ名とパスが一致する）。

手元で GitHub Pages 用ビルドだけ試す場合（`<リポジトリ名>` は実際の名前に置き換え）:

```bash
VITE_BASE_PATH=/リポジトリ名/ npm run build
npm run preview
```

PowerShell なら:

```powershell
$env:VITE_BASE_PATH="/リポジトリ名"; npm run build; npm run preview
```
