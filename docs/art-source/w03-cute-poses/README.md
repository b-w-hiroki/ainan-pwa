# Cast windup alignment

Final A/B sprites are 1254×1254 RGBA PNGs. Identity references are the corresponding `w03-cute-body/W03-CUTE-{A,B}-idle-01.png` files (B uses the explicitly requested original, not the v2 body revision).

Initial generation used built-in image_gen and `animation-v1/cast-windup.png` as the pose reference. Prompts are retained alongside each image. `source/` retains unmodified generated windup images.

With explicit user authorization, Pillow/NumPy processing scales and aligns the upper body, transitions through the waist, and copies rows 750 onward from the idle sprite without pixel changes. Both feet and legs therefore match the idle reference exactly. The visible bottom margins are about 9.6% for A and 9.4% for B. Upper-body pose naturally differs; identity is visually matched, not pixel-identical.

Reproduce and verify with `python scripts/align_cute_windup.py` (Pillow and NumPy required). `alignment-report.json` records the lower-body equality assertion. Generated source alpha fringes are preserved; complete background/edge cleanup is not claimed. No runtime game asset wiring is changed.
