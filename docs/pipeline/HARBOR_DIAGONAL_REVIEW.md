# New diagonal Harbor — H02/H03 layered review candidate

See [H01–H10 plan](HARBOR_ASSET_WORK_UNITS.md) and Issue #140.

The newly generated, character-free Harbor illustration (941×1672) is a **concept** in the approved diagonal composition, not an approved production file. It is not present in the Git repository or game manifest, and **CI must not claim it is**.

Run with the *actual* source obtained by the artist:
python scripts/art/split-diagonal-harbor-review.py --source YOUR_MASTER.png --out YOUR_OUTPUT

The output contains sky/distance, sea and near quay alpha layers, marked boundaries, an exact recomposition and provenance/status JSON.

**Quality gates:** (a) verify art/source provenance; (b) refine provisional shore/quay mask lines against the real image; (c) repaint hidden pier and water behind moving sprites; (d) separate person and native rod/line without duplicated pixels; (e) in-engine Cast→Retrieve→Bite→Battle→Result with 390×844 and 844×390 real inputs; (f) human art approval before replacing the active manifest; (g) physical iPhone/PWA QA Issue #27 before final release.

The generated panels only prove that the **same composite pixels** can be partitioned and put back losslessly. This is *not* evidence of independent parallax, free movement, fish silhouettes, playable tap regions or production readiness.

The script is purposely input-driven, with no made-up binary in this PR. New masters must be committed through a normal binary asset PR once approved.
