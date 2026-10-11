# AINAN Asset State Matrix

## 何を管理するか

asset-states.jsonは初期Vertical Sliceを対象とした状態一覧。全素材が完成したことを宣言する表ではない。カテゴリー: world / player / fish / ui / fx / town。既存のmanifest keyを直接参照するのでファイル名コピーによる転記ミスを防ぐ。

### 状態の意味

- **asset**: assetManifest.jsのreadyエントリーかつ実ファイルがある。専用絵とは限らず、共通魚影も含む。
- **procedural**: Phaserなどのコードで表現。個別PNG/SVGがなくても未実装扱いにはしない。
- **planned**: 未制作。素材生成・採用・manifest登録・実表示QAが完了するまでassetへ変更しない。

## Masterから4魚種へ拡張: アジ / マダイ / ブリ / クエ

| 局面 | 現状 | 意味 |
| --- | --- | --- |
| Cast | player cast / UI cast button | 分離素材あり |
| 着水・探索 | 共通shadow・水紋 | 位置・速度・方向による表現 |
| 興味/追尾 | procedural retrieve logic | 魚の反応をロジックで見せる |
| Bite/HIT | rippleBite・hitFlash | 共通演出あり |
| Battle | fish.ajiIcon | Battleでは魚種アイコンを描画。専用Result大型素材とは別owner |
| Result | fishHeroes.aji | 釣果の見せ場 |
| 図鑑 | fish.ajiIcon | 情報/コレクト用途 |
| アジ専用Jumpフレーム | planned | 専用素材が存在するとは主張しない |

### 確認済みの魚種別差分

| fishId | 構図・存在感 | Battleで使用 | Resultで使用 | 図鑑 | 未制作の個別フレーム |
| --- | --- | --- | --- | --- | --- |
| aji | 小型魚影 | fish.ajiIcon | fishHeroes.aji | fish.ajiIcon | 専用jump |
| tai | 中型魚影 | fish.madaiIcon | fishHeroes.tai | fish.madaiIcon | 専用jump |
| buri | 大型魚影 | fish.buriIcon | fishHeroes.buri | fish.buriIcon | 専用jump |
| kue | 大型魚影＋bosses.kue | fish.kueIcon | fishHeroes.kue | fish.kueIcon | 専用jump |

「大型魚素材がmanifestにある」ことと「Battleで実際に使われる」ことは別。現行Battleは魚種アイコン、Resultはpremium heroを利用する。台帳・自動テストが両方の実コードを参照する。

**全9魚種のResult専用アセットを実装済み**。ブラックバス、サバ、イサキ、ヒラメ、カンパチは640×360の独立SVGとして追加。色だけの使い回しではなく、口・体型・ヒレ・模様を魚種ごとに描き分けた。Battleは既存アイコンを維持し、Resultのみプレミアム魚アートに置き換える。専用ジャンプは9魚種ともplannedのまま。

別魚への展開時は同じ状態行を機械的に複製せず、名前・表示実装・不足差分を確認して追加する。レアリティや釣果数値と素材の有無は独立。

### 第2拡張の検証範囲

| fishId | Battle | Result専用素材 | 識別要素 |
| --- | --- | --- | --- |
| bass | fish.blackBassIcon | fishHeroes.bass | 大きな口、オリーブ色と濃い側線 |
| saba | fish.sabaIcon | fishHeroes.saba | 細長い銀青色、背側の縞 |
| isaki | fish.isakiIcon | fishHeroes.isaki | 黄褐色、縦帯 |
| hirame | fish.hirameIcon | fishHeroes.hirame | 扁平な体型、上側の2眼 |
| kanpachi | fish.kanpachiIcon | fishHeroes.kanpachi | 流線形、額の金色斜線 |

アセット存在・コード結線の自動チェックは**表示成功そのものの保証ではない**。QA専用の魚指定Result画面とモバイルスクショで視覚確認する。新規魚種の追加で釣果確率・サイズ・バトル性能を変更しない。

## 釣り場・町

pointA/Harbor、pointB/Bay、pointC/Capeはそれぞれ既存背景とlocation overlayを使う。townはquiet/growing/bustlingと施設素材を先に台帳化した。昼夜天候、建物レベル差、音/照明などは「絵がある」だけで実装完了とはしない。

## 更新手順

1. 見た目の役割と状態名を固定し、該当アイテムを探す。
2. 未作成ならkind=plannedとnoteを追加。実装済みコード表現ならkind=proceduralとsource。
3. 個別ファイルをassetManifestへ登録しpreloadし、実ブラウザで表示確認して初めてkind=asset、refs追加。
4. npm run qa:pipeline を実行して実ファイルとmanifestの整合性を確認する。
5. 390×844でサイズ差、視認性、状態間の瞬間切替、アニメの破綻を検証する。

量産はアジ1魚→4魚種→全9魚種の順に、状態欠落とUI衝突が増えていないか確認してから拡張する。基準となる4魚種はmanifest・ゲーム定義・Battle/Result描画への参照をscripts/pipeline-contract-smoke.mjsが検証する。
