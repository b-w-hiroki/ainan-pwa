# AINAN Visual Owner Registry

## 判断ルール

1表示slotに対して最終的な描画責任者は1つ。標準モードはCastPresentationHost（fishing-game/js/presentation/cast/CastPresentationHost.js）で、installFishingPresentationGuardはその導入と旧UI抑制を行う。構成部品を提供するモジュールと、最終表示を決めるモジュールは区別する。参照元は visual-owners.json。実コードに存在するowner関数/ファイルのみ記載し、validatorで照合する。

| Slot | 最終責任 | 補助/旧owner（勝手に消さない） |
| --- | --- | --- |
| Cast controls | CastPresentationHost（既定） | installFishingPresentationGuardと旧BlueprintFishingField/ MobileFishingShell |
| Retrieve controls | CastPresentationHost（既定） | installFishingPresentationGuardと旧BlueprintFishingField |
| Battle tension | CastPresentationHost（既定） | installFishingBattlePresentation（代替）, FishingPresentationGuard |
| Result summary | CastPresentationHost（既定） | installFishingResultPresentation（代替）, FishingPresentationGuard |
| Fishing field layers | installBlueprintFishingField | FieldMotionFx、LocationAtmosphere |
| QA fixture | installVerticalSliceQaMode | qa=1限定 |

Battleのpremium魚と釣り場パーツは、既存のCastPresentationHostが同じBattle foreground内で合成する。最終レイヤー順は承認Battle base → Bay/Cape world part → premium魚 → Battle HUD。Harborは承認コンポジット側の港表現を維持し、world partを二重描画しない。

「標準ホストがBattle/Resultを描画する」ことは、新規Battle/Result描画ownerを増やす許可ではない。旧描画ownerは移行中の互換経路として扱う。

## 既存構造への適用

- installFishingRuntime.js がinstaller順の唯一の参照元。現行順序とwrapperの責務を変えるときは先に照合する。
- create / update / _enterCast / _enterRetrieve / _enterBattle / _finishBattle はwrapper競合が起きやすい。まず実体と呼び出し順を確認する。
- 旧UIを覆うoverlayを無制限に増やさない。元UIのcreate/visible/hit areaを確認して統合・非表示化する。
- 描画上のdepthだけでなく、入力hit area、scrollFactor、cleanup、scene再起動後の二重登録を所有範囲に含める。
- 撮影専用qaMockPhaseの特別処理を、本番の不具合修正として代用しない。
- 出荷前にownerを全面書換えしない。1ownerごとに小PRと50画面QAで段階移行する。

## owner追加/変更時のチェック

1. どの画面フェーズに表示されるかを明記する。
2. 同じslotの既存ownerが何を持つか調べる。
3. visual-owners.jsonのownerかsupportsを修正する。
4. Phaserの可視性/操作/破棄経路を確認する。
5. npm run qa:pipeline / build / CIの50画面で重なりが消えたことを確認する。

登録済みownerがコード上存在することは自動検査できるが、画面上で本当に唯一になっているかはブラウザQA・画像比較が必要。
