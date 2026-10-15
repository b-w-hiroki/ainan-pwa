# AINAN 港キャスト｜実装設計（ドラフト）
2026-10-15 / 状態: 実装未完了・設計案。実際のPhaserシーンに合わせて既存ownerを調査し再利用する。

## 座標と描画
- WorldSpace: 人物・竿・ルアー・海/桟橋・障害物。CameraSpace: ワールド投影。ScreenSpace: HUD・操作・safe-area。
- CameraControllerはワールドカメラを一元管理。既存釣りシーンのカメラ・遷移ownerに統合し、並列の第二カメラ演出を作らない。
- Z-order: 背景遠景 < 水面/船 < 足場 < オプション・人物下半身 < 人物素体 < 服装 < 竿 < 糸/ルアー < FX < UI。足元・手の前後関係は部分レイヤー単位で明示。
- World-only背景はカメラ最大移動範囲+ビューポートをカバー。余白が足りなければ繰返し模様や画像引き伸ばしではなく、承認済みアート方向に沿う追加素材を制作。

## 状態機械
Idle -> Windup -> Release -> Flight -> Splash -> Retrieve -> Hit/Battle -> Result/Idle。
CameraController: PlayerHold -> RodLead -> LureFollow -> SplashSettle -> RetrieveReturn。方向に対して先読みleadを適用するが画面から餌を完全に見失わない。追従はdtベースの速度・加速度上限つき補間とし、遷移ごとに既存Tween/入力listenerを解除。

## 参照インターフェース（型案）
```ts
type Vec2 = { x: number; y: number };
type CastPhase = 'idle' | 'windup' | 'release' | 'flight' | 'splash' | 'retrieve' | 'battle' | 'result';
type CameraTarget = { phase: CastPhase; rodTipWorld: Vec2; lureWorld?: Vec2; splashWorld?: Vec2; playerWorld: Vec2 };
type EquipmentVisuals = { bodyVariant: string; outfitIds: string[]; rodId: string; optionIds: string[] };
type ClearZone = { origin: Vec2; castDirection: Vec2; swingRadius: number; corridorHalfWidth: number; maxRange: number };
```

## コンポーネント責務
- CastTrajectory: 既存入力・飛距離ロジックからワールド軌道、竿先、ルアーの位置を提供する。釣獲率/報酬計算とは分離。
- CameraController: `CameraTarget`を購読、リリース前後で追従対象を切替、着水地点で停止、巻取り時に戻す。
- CastClearZone: 竿の可動域とルアー飛行/巻取り経路の安全領域を計算。画像配置時に候補障害物と交差チェック。景観上の見た目確認も必須。
- PlayerParts: 素体・衣装・竿等を共通pivot/ソケット（feet, hand, rodTip）で描画。装備とモーション切替時に各要素の位置・反転を整合。
- EquipmentData: 既存装備データのIDを表示用アセットにマップ。セーブ形式を変更せず、欠損素材には既存デフォルトを適用。
- OptionalActors: 猫などは独立レイヤー、足場安全位置に追従/待機。ラインとの干渉なし。
- ScrollWorld: ワールド描画範囲・複数解像度のアートを管理。UI位置はカメラオフセットを使わない。

## アセット契約
各パーツはalpha PNGとmetadata（assetId、source/provenance、pixelSize、worldScale、pivot、sockets、zLayer、allowedPhases、approvalStatus）を持つ。背景H02は水/天面/前面を別マスクで監査。コピーされた係船柱・ロープ、縦帯・平坦化、描画owner重複、海面継ぎ目を検出。全候補 `approved=false` が初期値。

## テスト
- 純粋ロジック: 座標変換、軌道/追従遷移、安全領域、装備ソケット整合、欠損assetフォールバック。
- ブラウザ: 390×844で3投距離、-18/0/+18px可動、飛行中画面外追従、着水→巻取り、服装/竿/猫組合せ、入力多重なし。
- ビジュアル: 現行承認画との比較、全phaseのWebGL実PNG（空白キャプチャ除外）、横画面はQA-only維持。
- Release: CIとPRの検証が済み、美術承認後のみ本番フラグを切り替える。#27物理iPhoneは代用不可。
