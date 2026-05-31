# 町おこし釣りゲーム（仮） Visual Direction

## Goal

「釣り × 町おこし」のコンセプトは残しつつ、実在地域名や特定自治体の記述には依存しない。
画面全体は、温かい港町・手触りのあるイラスト・かわいいキャラクターで構成する。

現状の Phaser Graphics ベースの画面は、ゲームロジック確認用としては成立している。
次の段階では、背景・キャラ・魚・UI装飾を画像アセット化し、「プロトタイプ感」を減らす。

## Reference Reading

PPT と集合絵から拾う要素:

- 明るく親しみやすいソシャゲ風キャラクター
- 丸みのある輪郭、はっきりした表情、元気なポーズ
- 港町、海、釣り場、季節感が伝わる背景
- 木札、スタンプ、ピン、カードなどの温かいUI装飾
- 操作説明は、手のアイコン・矢印・段階表示で直感的に見せる

拾わない要素:

- 愛南町や実在地域に紐づく名称、ロゴ、地名、観光文脈
- PPT内の黒帯や仮レイアウトの重さ
- 古いゲーム画面の情報過多なUI
- 写真寄り、リアル寄り、硬い行政資料寄りの見た目

## Art Style

- 2D casual mobile game illustration
- warm hand-painted anime style
- cute social-game character tone
- rounded shapes, soft shadows, clean silhouettes
- crisp readable UI, no blurry text baked into images
- bright morning to afternoon color temperature
- cozy fishing town atmosphere

Avoid:

- photorealistic
- dark cinematic lighting
- generic stock illustration
- thin hard-to-read linework
- text, logos, signage, real place names inside generated images

## Asset Scale

The Phaser canvas uses a 390 x 844 logical mobile layout.

Recommended generation sizes:

- Full-screen backgrounds: 1170 x 2532, then downscale/crop as needed
- Map background: 1170 x 2532
- Character cutouts: 1024 x 1024 or 1536 x 1536
- Fish icons: 1024 x 1024
- UI decorations: 1024 x 1024 sprite-style sheets or individual PNGs

Keep important details away from the top 110px and bottom 120px when an asset is used behind HUD.

## First Asset Batch

1. `bg_title_harbor_morning`
   - Used by TitleScene and HomeScene.
   - Warm fictional harbor town, ocean, small pier, soft morning light.
   - No text, no logo, no characters.
   - Center/top area must remain readable for title UI.

2. `bg_map_town`
   - Used by MapScene.
   - Illustrated seaside town map with three fictional fishing spots.
   - No written labels baked in.
   - Clear empty areas for card overlays and spot pins.

3. `bg_fishing_harbor`
   - Used by GameScene point A.
   - Close view of a friendly harbor fishing spot.
   - Water area should occupy the middle of the screen.

4. `bg_fishing_bay`
   - Used by GameScene point B.
   - Calm bay with greenery and soft reflections.

5. `bg_fishing_cape`
   - Used by GameScene point C.
   - Open sea and cape rocks, but still warm and cute.

6. `ch_guide`
   - Guide NPC for onboarding and tips.
   - Cheerful young fishing guide, cute social-game style.

7. `ch_player`
   - Player avatar shown near the shore.
   - Simple silhouette readable at small size.

8. `fish_icons`
   - Aji, madai, black bass, buri, kue.
   - Icon-like, clear species differences, not too realistic.

9. `ui_fishing_frame`
   - Result card frame and warm wooden/card materials.

10. `ui_spot_pins`
    - Map pins for harbor, bay, cape.

## GPT Image Prompt Templates

### Title/Home Background

Use case: mobile game full-screen background, 390:844 vertical layout.

Prompt:

> Create a warm 2D casual mobile game background for a fictional seaside fishing town. A cozy harbor, small pier, calm ocean, distant rounded hills, soft morning sunlight, gentle clouds, warm pastel colors, hand-painted anime game style, cute social-game atmosphere, clean silhouettes, rounded shapes, inviting and cheerful. Leave the upper center readable for a large game title and leave the lower center readable for buttons. No text, no logos, no signs, no real place names, no characters, no photorealism.

Negative notes:

- no Ainan references
- no written words
- no dark dramatic lighting
- no realistic photo texture

### Map Background

Prompt:

> Create a vertical mobile game map background for a fictional seaside town used in a fishing game. Warm illustrated harbor town, winding coast, three distinct fishing spot areas: harbor, calm bay, open sea cape. Cute social-game style, rounded shapes, soft shadows, pastel but saturated colors, clear empty areas for UI cards and map pins, no written labels, no logos, no real place names, not photorealistic.

### Guide Character

Prompt:

> Create a cute social-game style fishing guide character, full body, cheerful expression, warm and friendly, wearing a stylized fishing outfit with a cap and small fishing accessories, clean anime line art, soft cel shading, readable silhouette at mobile game size, no text, no logo, transparent-friendly plain light background.

For transparent cutout generation, use a flat chroma-key background first, then remove it locally if needed.

## Implementation Plan

1. Add generated assets under `fishing-game/assets/`.
2. Register asset keys in `fishing-game/js/config/assetManifest.js`.
3. Preload images in the relevant Phaser scenes.
4. Replace pure Graphics backgrounds with image-backed backgrounds plus light animated overlays.
5. Keep UI text rendered by Phaser, not baked into images, to preserve crispness and localization.
6. Add guide character to HomeScene first, then onboarding hints in GameScene.

## Design Checks

Before accepting an asset:

- Text areas remain readable with current UI overlays.
- Important subject is visible on 390 x 844 mobile crop.
- The image still works when dimmed behind cards.
- No generated text or fake logo appears.
- No real-world place name appears.
- The image feels warm, playful, and inviting rather than tourist-brochure-like.
