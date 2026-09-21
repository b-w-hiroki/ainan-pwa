# AINAN Visual Art Direction v1

## Goal
Make every screen read as one bright coastal social game: friendly silhouettes, crisp navy outlines, clear hierarchy, and rewarding growth.

## Core style
- Outline: deep navy #173248, strong and consistent.
- Base palette: coastal cyan / white / warm sand.
- Growth and reward: yellow-gold.
- Rare: violet.
- Danger / boss pressure: coral-orange.
- Shading: one clear mid-tone plus a small highlight. Avoid noisy texture.
- Silhouette: readable at 40–80 px on a 390 px-wide mobile viewport.

## Characters
- Rounded, approachable proportions.
- Face readable with very few features.
- Clothing uses one role color plus white/cream.
- NPC role color:
  - Fishmonger: cyan.
  - Harbor captain: deep blue.
  - Guide staff: green.
  - Young fisher: coral.
  - Diner owner: gold.
- Large Home guide art remains the hero-quality PNG until a dedicated replacement exceeds it.

## Town facilities
Each facility has three visual tiers.

### Lv1
Simple working facility. Few decorations. Clear primary silhouette.

### Lv3
Signage, inventory, flags, counters, or equipment appear. The role becomes obvious at a glance.

### Lv5
Completed landmark. Larger sign language, lights, banners, richer props, stronger gold highlights.

Runtime mapping:
- Lv0–2 -> Lv1 art
- Lv3–4 -> Lv3 art
- Lv5 -> Lv5 art

## Screen hierarchy
- Home: character first, primary CTA second.
- Map: fishing spot node first.
- Fishing: fish / line interaction first.
- Result: caught fish first; rarity light supports it.
- Town: facility silhouettes and growth stage first.
- Shop / Workshop: item art before price details.

## Motion
- Decorative loops remain subtle.
- Reduced Motion removes non-essential looping light and sparkle animation.
- Progress, HIT, boss and reward feedback remain readable without motion.

## Definition of done
- 390x844 screenshot remains readable.
- The four town facilities can be identified without labels.
- Lv1 / Lv3 / Lv5 are distinguishable without reading the level number.
- Five town NPCs look like one character family.
- No gameplay or economy behavior changes are introduced by the art pack.


## Fishing location identity

### 汐風港
- Bright working harbor.
- Piers, buoys, moored boats, town lights.
- Cyan + warm coral accents.
- Should feel safe, active, and lived-in.

### 蒼海湾
- Clear, calm lagoon.
- Shallows, rocks, seaweed, circular ripples.
- Mint / turquoise / violet accents.
- Should feel quiet, transparent, and slightly mysterious.

### 黒潮崎
- Exposed cape and rough offshore water.
- Dark rocks, fast whitewater, strong current lines, sunset pressure.
- Deep navy / coral / gold accents.
- Should feel dangerous before the player reads any UI.

## Boss visual rules
- Bosses never use only a scaled normal-fish icon in Battle or Result.
- Each area boss has one dedicated large hero asset shared by Challenge, Battle, and Result.
- Harbor Runner: fast streamlined silhouette, cyan body with gold speed stripe.
- Bay Hunter: heavier ambush silhouette, moss-green body with violet accents.
- Kue: the largest silhouette, dark armored body, coral/gold eye and pressure accents.
- Boss Battle target width is at least 230 px on the 390 px mobile frame.
- Boss Result keeps the same hero asset and adds a BOSS CATCH title treatment.
- Boss effects support the fish silhouette; they must not cover the face or body.

## Visual Art Pack 2 definition of done
- The three fishing areas are distinguishable without the location badge.
- The three bosses are distinguishable from normal catches at a glance.
- Challenge, Battle, and Result use the same boss identity.
- 390x844 E2E screenshots exist for all three boss battles and at least one boss result.
- Reduced Motion still preserves boss readability without looping decoration.
