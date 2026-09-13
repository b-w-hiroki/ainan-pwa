# AINAN Fishing Field — Asset Production Checklist

Status: `[ ]` not started / `[~]` temporary / `[x]` production-ready

Production folder: `fishing-game/assets/fishing-field/`

## 1. Water

- [ ] `water_base_01.png` — 900×1400, opaque, simple blue/aqua depth gradient, low detail
- [ ] `water_pattern_01.png` — 900×1400, transparent, faint low-contrast surface pattern
- [ ] `water_highlight_01.png` — 900×1400, transparent, sparse white/pale-cyan highlights for slow movement
- [ ] `underwater_depth_01.png` — 900×1400, transparent, subtle lower-area depth shading
- [ ] `rock_01.png` — ~384×384, transparent, stylized and low-priority
- [ ] `seaweed_01.png` — ~256×384, transparent, simple silhouette, easy to sway

### Water QA
- [ ] lure remains visible over all layers
- [ ] fish shadows remain readable
- [ ] no single layer looks like a finished illustration
- [ ] camera movement does not expose composition edges
- [ ] highlight can move independently

## 2. Fish shadows

- [ ] `fish_shadow_s_idle_01.png` — ~128×64
- [ ] `fish_shadow_m_idle_01.png` — ~160×80
- [ ] `fish_shadow_l_idle_01.png` — ~256×128
- [ ] `fish_shadow_m_turn_01.png` — ~160×80

### Fish QA
- [ ] readable on a phone
- [ ] small / medium / large distinguishable without labels
- [ ] blue-gray / dark-cyan, not pure black
- [ ] horizontally flippable
- [ ] no unnecessary species detail
- [ ] turn asset blends with idle asset

## 3. Lure

- [ ] `lure_idle_01.png` — ~96×96
- [ ] `lure_pull_01.png` — ~96×96
- [ ] `lure_splash_01.png` — ~128×128
- [ ] `lure_trail_01.png` — ~128×64

### Lure QA
- [ ] visible immediately at normal game scale
- [ ] does not look like a giant UI icon
- [ ] line connection is visually clear
- [ ] idle / pull variants align
- [ ] trail can be stretched and faded

## 4. FX

- [ ] `fx_ripple_small_01.png` — ~96×96
- [ ] `fx_ripple_bite_01.png` — ~160×160
- [ ] `fx_follow_wave_01.png` — ~128×64
- [ ] `fx_hit_flash_01.png` — ~160×160

### FX QA
- [ ] readable at 390×844
- [ ] does not cover fish/lure
- [ ] fades cleanly
- [ ] scales without hard-edge artifacts
- [ ] repeated use does not make the field noisy

## 5. UI skin

- [ ] `top_hud_bar_01.png`
- [ ] `distance_badge_01.png`
- [ ] `retrieve_button_wait_01.png`
- [ ] `retrieve_button_short_reel_01.png`
- [ ] `retrieve_button_slow_reel_01.png`

### UI QA
- [ ] readable over every water state
- [ ] `ちょい巻き` is visually primary
- [ ] touch targets are visually distinct
- [ ] labels are rendered by code where possible
- [ ] no text baked into reusable backgrounds

## 6. Integration QA

- [ ] CAST works
- [ ] near cast works
- [ ] mid cast works
- [ ] far cast works
- [ ] long cast uses camera pan, not zoom-out
- [ ] lure never becomes hard to find
- [ ] fish behavior remains readable
- [ ] Retrieve inputs remain responsive
- [ ] Bite transition remains readable
- [ ] Battle keeps the same water field
- [ ] character remains secondary during active fishing
- [ ] CATCH still gets the hero moment
- [ ] Result → Town still works
- [ ] build passes
- [ ] vertical-slice smoke QA passes

## 7. Nice-to-have after minimum set

- [ ] `rock_02.png`
- [ ] `seaweed_02.png`
- [ ] `foam_01.png`
- [ ] `fish_shadow_s_turn_01.png`
- [ ] `fish_shadow_l_turn_01.png`
- [ ] pointB water colorway
- [ ] pointC water colorway
- [ ] rare-fish subtle halo
- [ ] larger catch splash
- [ ] optional 2-frame tail animation
