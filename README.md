# AINAN 釣り×街おこし

PWA＋細かいスライスで常に実行可能な状態を保ちながら実装します。

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
set VITE_BASE_PATH=/リポジトリ名
npm run build
npm run preview
```

PowerShell なら:

```powershell
$env:VITE_BASE_PATH="/リポジトリ名"; npm run build; npm run preview
```
