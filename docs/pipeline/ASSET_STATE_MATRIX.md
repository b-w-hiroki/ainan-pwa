# AINAN Asset State Matrix

## 何を管理するか

asset-states.jsonは初期Vertical Sliceを対象とした状態一覧。全素材が完成したことを宣言する表ではない。カテゴリー: world / player / fish / ui / fx / town。既存のmanifest keyを直接参照するのでファイル名コピーによる転記ミスを防ぐ。

### 状態の意味

- **asset**: assetManifest.jsのreadyエントリーかつ実ファイルがある。専用絵とは限らず、共通魚影も含む。
- **procedural**: Phaserなどのコードで表現。個別PNG/SVGがなくても未実装扱いにはしない。
- **planned**: 未制作。素材生成・採用・manifest登録・実表示QAが完了するまでassetへ変更しない。

## 最初のMaster: アジ × 港

| 局面 | 現状 | 意味 |
| --- | --- | --- |
| Cast | player cast / UI cast button | 分離素材あり |
| 着水・探索 | 共通shadow・水紋 | 位置・速度・方向による表現 |
| 興味/追尾 | procedural retrieve logic | 魚の反応をロジックで見せる |
| Bite/HIT | rippleBite・hitFlash | 共通演出あり |
| Battle | fishHeroes.aji | 魚の個体感を演出 |
| Result | fishHeroes.aji | 釣果の見せ場 |
| 図鑑 | fish.ajiIcon | 情報/コレクト用途 |
| アジ専用Jumpフレーム | planned | 専用素材が存在するとは主張しない |

別魚への展開時は同じ状態行を複製するのでなく、名前・表示実装・不足差分を確認して追加する。レアリティや釣果数値と素材の有無は独立。

## 釣り場・町

pointA/Harbor、pointB/Bay、pointC/Capeはそれぞれ既存背景とlocation overlayを使う。townはquiet/growing/bustlingと施設素材を先に台帳化した。昼夜天候、建物レベル差、音/照明などは「絵がある」だけで実装完了とはしない。

## 更新手順

1. 見た目の役割と状態名を固定し、該当アイテムを探す。
2. 未作成ならkind=plannedとnoteを追加。実装済みコード表現ならkind=proceduralとsource。
3. 個別ファイルをassetManifestへ登録しpreloadし、実ブラウザで表示確認して初めてkind=asset、refs追加。
4. npm run qa:pipeline を実行して実ファイルとmanifestの整合性を確認する。
5. 390×844でサイズ差、視認性、状態間の瞬間切替、アニメの破綻を検証する。

量産は1魚→3魚→10魚の順に、状態欠落とUI衝突が増えていないか確認してから拡張する。
