# W01｜AINAN グラフィック全面再構築・制作入口

**Owner:** [W01 Issue #217](https://github.com/b-w-hiroki/ainan-pwa/issues/217) / [親Issue #216](https://github.com/b-w-hiroki/ainan-pwa/issues/216)
**契約の正本:** [art-rebuild-v2-contract.json](art-rebuild-v2-contract.json)。作品をまたぐ工程は [Studio Playbook Asset Work Units](https://github.com/b-w-hiroki/studio-playbook/blob/main/docs/ASSET-WORK-UNITS.md)。

## 何を「破棄」するのか
旧アートは**新規デザイン制作の正本から外す**。現行アプリのmanifest、セーブID、元画像やcommit履歴は引き続き残し、新候補の合格後に個別PRで切替。先に旧ファイルを削除しない。rollbackを維持する。

## どこから始めるか
| Work Unit | 入力 | 作る物 | 必須のDone |
| --- | --- | --- | --- |
| [W02 #218](https://github.com/b-w-hiroki/ainan-pwa/issues/218) | 承認アートの色/筆致、[港キャスト仕様](../design/HARBOR_CAST_PRODUCT_SPEC.md)、W01 contract | 海が沖へ連続する`far/sea/quay/decor`の**人物を含まない**実素材、world座標とdraw order | キャスト/巻取りの全射線が空き、縦横実スクショ、材質/遠近/自然な反射、人による画質承認。仮QA 2160×1800を引伸して終わりにしない |
| [W03 #219](https://github.com/b-w-hiroki/ainan-pwa/issues/219) | 現行装備ID・CharacterMotionControllerとW01 contract | 素体/性別・衣服・帽子・靴・バッグ・竿/リール・猫の独立素材、pivot/socketと状態差分 | 全ポーズで接続/alpha境界/複数装備、−18/0/+18px、竿と糸owner一つ、UIと障害物に干渉しない |
| [W04 #220](https://github.com/b-w-hiroki/ainan-pwa/issues/220) | W02/W03の**合格素材** | 既存Phaser camera/GameSceneへの段階的接続・差し替え | キャスト→着水→巻取り→HIT→Battle→Result、保存/確率/画面/CI合格 |
| [W05 #221](https://github.com/b-w-hiroki/ainan-pwa/issues/221) | W02〜W04受入 | Bay/Cape/魚種/Town/UIの統一 | 比較画像・画面別Owner・人の画質承認、独立iPhone QA #27 |

## 参照の優先順位
1. 現行のゲーム操作・保存・確率：mainコード。
2. 体験構図・カメラ：`docs/concept-art/canonical/README.md` と港仕様（**縦横を別レイアウト**として扱う最新版）。
3. 採用済み素材の**比較品質**：`docs/pipeline/ART_DIRECTION_BIBLE.md`＋manifest/approved-mock。旧絵の背景構造/切り抜き欠陥は継承しない。
4. 新しい素材の納品/分離/禁止条件：`docs/pipeline/art-rebuild-v2-contract.json`。
5. UIと操作の証拠：`docs/pipeline/golden-screens.json`の各スクリーンの**同一commitのCI artifact**。ファイル名だけからハッシュ/承認を推測しない。

## W01：素材台帳の実測コマンド
```bash
npm run qa:asset-rebuild
# 出力：artifacts/art-rebuild/w01-inventory.json
```
`scripts/art/build-rebuild-inventory.mjs` は、実際の `ASSETS` を列挙し、チェックアウト上のファイル実バイト数/SHA-256/参照用途を計算する。承認参照・既存manifest・QAソースを区別し、参照不能ファイルがあれば失敗する。

- **既存manifest = 全て本番描画中ではない**。表示ownerの実処理と必ず照合（`actualRuntimeUsage: unverified`）。
- **承認参考画像 = 新たな高品質マスターの代わりではない**。図解の画像は構図参考。
- `golden-screens.json`のファイル名はCI artifact参照であり、チェックアウトにないためSHAを`null`として報告。必要な画像は対象CI runから取得し、その実画像を目視する。
- ブラウザQA成功・画像生成済み・人の画質承認・本番採用・実機QAは互いに代用不可。
- 新素材は透過、socket/原点、レイヤー別owner、生成元と編集手順・ハッシュを付ける。画像外形が合っても竿先・水面の遠近がずれるなら採用しない。

## 禁止・ロールバック
- 背景へ人物・猫・竿・UIを焼き込まない。斜めキャストの投射線と巻取り直線に柱/ロープ/猫を置かない。
- ワールドを静止画1枚の引伸しや反転コピーで代用しない。生成画像が仕様説明用のボードになった場合は実装アセット扱いしない。
- 画質を素材検証スクリプトだけで自動承認しない。
- 本番切替は **new candidate → PR/CI/Browser → art accepted → explicit manifest switch → production compare**。問題発生時にmanifestの旧IDへ戻す（セーブ・データschema変更なし）。
