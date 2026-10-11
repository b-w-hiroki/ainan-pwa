# Generated fishing-field asset provenance

All fishing-field parts generated during the September 2026 visual pass are tracked here. Runtime assets are normalized into lightweight SVG parts so they remain editable, tintable and animation-friendly in Phaser.

| Generated source | Managed production asset / reference |
| --- | --- |
| 静謐な青い海面のグラデーション.png | `water/water_base_01.svg` |
| 淡い水面の波紋ハイライト_恒一.png | `water/water_pattern_01.svg` |
| 透明な水面の光のきらめき.png | `water/water_highlight_01.svg` |
| 淡い水中グラデーションオーバーレイ.png | `water/underwater_depth_01.svg` |
| 透過背景の柔らかな魚シルエット.png | `fish_shadow/fish_shadow_m_idle_01.svg` |
| 左向きに弧を描く魚のシルエット.png | `fish_shadow/fish_shadow_m_turn_01.svg` |
| 青い光彩の魚シルエット.png | `fish_shadow/fish_shadow_s_idle_01.svg` |
| 海中に輝くシャークシルエット.png | `fish_shadow/fish_shadow_l_idle_01.svg` |
| 光沢ブルーのフィッシングルアー.png | `lure/lure_idle_01.svg` |
| 光輝く水流エフェクトの軌跡.png | `lure/lure_trail_01.svg` |
| 透明背景の淡い水面波紋リング.png | `fx/fx_ripple_small_01.svg` |
| 魚の水面波紋エフェクト.png | `fx/fx_follow_wave_01.svg` |
| 輝く水面の波紋スプラッシュ.png | `fx/fx_ripple_bite_01.svg` |
| 水しぶきの輝く魔法エフェクト.png | `fx/fx_hit_flash_01.svg` |
| 水中の光に輝く岩礁群.png | `field_objects/rock_01.svg` |
| 透明背景の海藻クラスター.png | `field_objects/seaweed_01.svg` |
| 光沢のある黄金色のゲームボタン.png | `ui/retrieve_button_short_reel_01.svg` |
| 蒼海湾のちょい巻きフィッシング.png | implementation target reference; composition rules are captured in canonical docs and asset definitions |
| generated fishing asset sheet | production inventory represented by this table and `asset-definitions.json` |

## Policy

- Generated source concepts are never discarded silently; every approved concept gets a managed counterpart or reference entry.
- Runtime code depends on the managed assets under `fishing-game/assets/fishing-field/`, not on a monolithic generated image.
- New generated parts must be added to this provenance table and `asset-definitions.json` before integration.

## Five premium Result hero SVGs (October 2026)

These are separately authored vector production assets using the established 640×360 premium Result hero visual language. They are **not** extracted layers from a single source image, and they do not imply that a separate dedicated jump frame has been produced.

| Species | Production asset | Distinct silhouette or markings |
| --- | --- | --- |
| Black bass | `generated/hero/fish_hero_bass.svg` | Wide mouth, dorsal spikes and dark olive lateral marking |
| Mackerel | `generated/hero/fish_hero_saba.svg` | Narrow silver-blue body and dark dorsal stripes |
| Isaki (grunt) | `generated/hero/fish_hero_isaki.svg` | Golden body and broad vertical bands |
| Flounder | `generated/hero/fish_hero_hirame.svg` | Flattened asymmetrical body, eyes on upper side |
| Kanpachi (amberjack) | `generated/hero/fish_hero_kanpachi.svg` | Streamlined body and gold forehead/lateral line |

All five are registered as `fishHeroes` in `assetManifest.js`, preloaded with the existing GameScene fishHeroes collection, and mapped only to Result's premium fish layer; Battle/collection icons remain unchanged. The five CI Result QA fixtures verify the in-game effect. No catch probabilities or fish mechanics were altered.
